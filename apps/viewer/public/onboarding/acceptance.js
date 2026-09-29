import { verifyInvitedLogin } from './invited-session.js';
const status = document.getElementById('status');
const input = document.getElementById('fixture');
const download = document.getElementById('download');
let fixture, busy = false, result;
function finish(value) {
  fixture = undefined;
  result = value;
  document.getElementById('evidence').textContent = JSON.stringify(value, null, 2);
  status.textContent = value.passed ? 'Invited login and rejected token reuse verified.' : 'Not passed. Save the redacted result for the engineer.';
  download.hidden = false;
}
input.addEventListener('change', async () => {
  if (busy || input.files.length !== 1) return;
  busy = true; input.disabled = true;
  try {
    const file = input.files[0];
    if (file.size > 16384) throw Error('INVALID_FIXTURE');
    fixture = JSON.parse(await file.text()); input.value = '';
    if (location.origin !== 'https://www.signalword.app' || fixture.environment !== 'development' || fixture.signupDisabled !== true || !fixture.email || !fixture.password || !fixture.publishableKey) throw Error('INVALID_FIXTURE');
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.onerror = () => finish({passed:false,failure:'CHALLENGE_SCRIPT_FAILED'});
    script.onload = () => {
      let submitted = false;
      window.turnstile.render('#challenge', {
        sitekey:'0x4AAAAAAFFb3ETKlwBxFCNF', action:'signup', theme:'auto',
        callback: async token => {
          if (submitted || typeof token !== 'string' || !token.length || token.length > 2048) return;
          submitted = true;
          status.textContent = 'Checking development authentication…';
          try {
            const fresh = await verifyInvitedLogin({...fixture,captchaToken:token});
            const replay = await verifyInvitedLogin({...fixture,captchaToken:token});
            finish({environment:'development',scope:'existing-invited-password-login',recordedAt:new Date().toISOString(),fresh,replay,passed:fresh.accepted && fresh.logoutStatus === 204 && !replay.accepted && replay.status >= 400,anonymousEnrollmentProven:false,nativeBridgeProven:false});
          } catch { finish({environment:'development',passed:false,failure:'AUTH_TRANSPORT_FAILED',recordedAt:new Date().toISOString()}); }
        },
        'error-callback': code => { const safeCode = /^[0-9]{3,8}$/.test(String(code)) ? String(code) : 'unknown'; status.textContent = 'Cloudflare verification failed (code ' + safeCode + '). Reload in your normal browser; report this code to the engineer.'; },
        'expired-callback': () => { status.textContent = 'Challenge expired. Reload and load the fixture again.'; },
      });
      status.textContent = 'Complete the human challenge below.';
    };
    document.head.appendChild(script);
  } catch { finish({environment:'development',passed:false,failure:'INVALID_DEVELOPMENT_FIXTURE'}); }
});
download.addEventListener('click', () => {
  if (!result) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'}));
  const a = document.createElement('a'); a.href=url; a.download='signalword-human-verification.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
