import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { verifyInvitedLogin } from './hosted-turnstile-session.mjs';
// Private input contains only an existing disposable identity and public client key.
// No admin credential, CAPTCHA token or session is written to evidence or console.
const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw Error('PRIVATE_INPUT_AND_NEW_EVIDENCE_PATH_REQUIRED');
const input = JSON.parse(readFileSync(inputPath, 'utf8'));
if (input.environment !== 'development' || input.signupDisabled !== true) throw Error('CLOSED_DEVELOPMENT_REQUIRED');
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
let resolveResult;
const done = new Promise(resolve => { resolveResult = resolve; });
let busy = false;
await page.exposeBinding('signalwordHumanVerification', async ({frame}, token) => {
  if (busy || frame !== page.mainFrame() || !frame.url().startsWith('https://www.signalword.app/onboarding/verify.html?') || typeof token !== 'string' || token.length > 2048) return;
  busy = true;
  try {
    const fresh = await verifyInvitedLogin({ ...input, captchaToken: token });
    const replay = await verifyInvitedLogin({ ...input, captchaToken: token });
    const result = { environment:'development', scope:'existing-invited-password-login', recordedAt:new Date().toISOString(), fresh, replay,
      passed: fresh.accepted && fresh.logoutStatus === 204 && !replay.accepted && replay.status >= 400,
      anonymousEnrollmentProven:false, nativeBridgeProven:false };
    writeFileSync(outputPath, JSON.stringify(result,null,2)+'\n', {flag:'wx',mode:0o600});
    await page.evaluate(result => { document.getElementById('status').textContent = result.passed ? 'Invited login and rejected token reuse verified. You may close this window.' : 'Verification did not pass. Redacted evidence retained for investigation.'; }, result);
    console.log(JSON.stringify(result));
    resolveResult();
  } catch {
    try { writeFileSync(outputPath, JSON.stringify({environment:'development',passed:false,failure:'SESSION_TRANSPORT_OR_EVIDENCE_FAILURE',recordedAt:new Date().toISOString()})+'\n',{flag:'wx',mode:0o600}); } catch {}
    console.error('HUMAN_SESSION_FAILED_NO_PRIVATE_DATA_LOGGED'); resolveResult();
  }
});
// This is a browser-only bridge shim, explicitly not evidence of native WebKit behavior.
await context.addInitScript(() => {
  window.webkit = { messageHandlers: { signalwordVerification: { postMessage: token => window.signalwordHumanVerification(token) } } };
});
await page.goto('https://www.signalword.app/onboarding/verify.html?sitekey=0x4AAAAAAFFb3ETKlwBxFCNF');
console.log('HUMAN_CHALLENGE_READY: complete the challenge in the opened browser.');
let timer;
await Promise.race([done, new Promise(resolve => { timer=setTimeout(resolve, 10*60*1000); }), new Promise(resolve=>page.once('close',resolve))]);
clearTimeout(timer);
await browser.close();
