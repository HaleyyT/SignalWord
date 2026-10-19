import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const root = new URL('../dist/', import.meta.url);
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    const file = /^\/(join|manage-contact)\//.test(path) ? 'enrollment.html' : path === '/' ? 'index.html' : path.slice(1);
    if (file.includes('..')) throw Error('invalid path');
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.end(await readFile(new URL(file, root)));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const token = 'a'.repeat(43), management = 'b'.repeat(64);
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.SIGNALWORD_CHROME_PATH ? { executablePath: process.env.SIGNALWORD_CHROME_PATH } : {}) });
  for (const width of [320,390,768]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [], mutations = [];
    let status = 'pending_email';
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', route => route.fulfill({ contentType: 'text/javascript', body:
      `window.turnstile={render:(node,options)=>{setTimeout(()=>options.callback('mocked-challenge'),0);return 'widget'},remove:()=>{},reset:()=>{}};` }));
    await page.route('**/api/enrollment/*', async route => {
      const request = route.request(), id = new URL(request.url()).pathname.split('/').pop();
      let result;
      if (request.method() === 'GET') result = id === 'config' ? { siteKey: 'mock-site-key-12345' } : id === management ? { status }
        : { displayName: 'Alice', consentVersion: '2026-10-19', expiresAt: new Date(Date.now()+86400000).toISOString() };
      else {
        const action = request.headers()['x-signalword-action']; mutations.push(action);
        if (action === 'begin') {
          const body = request.postDataJSON(); assert.equal(body.consent, true); assert.equal(body.captchaToken, 'mocked-challenge');
          assert.equal(body.email, 'recipient@example.test'); assert.equal(body.code, undefined);
          result = { attemptId: body.attemptId, withdrawalToken: management, expiresAt: new Date(Date.now()+600000).toISOString() };
        } else if (action === 'verify') { assert.equal(request.postDataJSON().code, '012345'); status='pending_approval'; result={verified:true}; }
        else if (action === 'withdraw') { status='withdrawn'; result={withdrawn:true}; }
        else throw Error('Unexpected mutation');
      }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) });
    });
    await page.goto(`${origin}/join/${token}`);
    await page.getByRole('heading', { name: 'Be there for Alice.' }).waitFor();
    await page.screenshot({ path: `/private/tmp/signalword-enrollment-form-${width}.png`, fullPage: true });
    assert.equal(mutations.length, 0, 'opening invitation must not change consent');
    await page.getByLabel('Your email', { exact: true }).fill('recipient@example.test');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Email my verification code' }).click();
    await page.getByLabel('Verification code', { exact: true }).fill('012345');
    await page.getByRole('button', { name: 'Verify my email' }).click();
    await page.getByRole('heading', { name: 'Your email is verified' }).waitFor();
    assert.deepEqual([...new URL(page.url()).searchParams.keys()], [], 'private recovery does not use URL query parameters');
    assert.deepEqual([...new URLSearchParams(new URL(page.url()).hash.slice(1)).keys()].sort(), ['attemptId','expiresAt','withdrawalToken']);
    await page.reload();
    await page.getByRole('heading', { name: 'Your email is verified' }).waitFor();
    assert.deepEqual(mutations, ['begin','verify'], 'reload is read-only and recovers pending state');
    status='approved'; await page.getByRole('button', { name: 'Refresh status' }).click();
    await page.getByRole('heading', { name: 'Your connection is confirmed' }).waitFor();
    await page.goto(`${origin}/manage-contact/${management}`);
    await page.getByRole('heading', { name: 'Your connection is confirmed' }).waitFor();
    assert.deepEqual(mutations, ['begin','verify'], 'opening email management link must not withdraw');
    await page.getByRole('button', { name: 'Withdraw consent', exact: true }).click();
    assert.equal(mutations.includes('withdraw'), false, 'review confirmation before withdrawal');
    await page.getByRole('button', { name: 'Confirm withdrawal' }).click();
    await page.getByRole('heading', { name: 'Consent withdrawn' }).waitFor();
    status='withdrawal_pending';
    await page.goto(`${origin}/manage-contact/${management}`);
    await page.getByRole('heading', { name: 'Withdrawal is not confirmed yet' }).waitFor();
    assert.deepEqual(mutations, ['begin','verify','withdraw'], 'pending journal status never repeats withdrawal on GET');
    await page.getByRole('button', { name: 'Retry withdrawal' }).click();
    await page.getByRole('heading', { name: 'Consent withdrawn' }).waitFor();
    const viewport = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
    assert.ok(viewport.content<=viewport.width, 'no horizontal overflow');
    assert.deepEqual(errors, [], 'no runtime errors');
    await page.screenshot({ path: `/private/tmp/signalword-enrollment-${width}.png`, fullPage: true });
    await page.close();
    console.log(`PASS: production enrollment journey at ${width}px (mocked CAPTCHA/provider, real CSP)`);
  }
} finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
