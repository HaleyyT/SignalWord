import { verifyInvitedLogin, verifyClosedEnrollment, requestInvitedCode, verifyInvitedCode } from './invited-session.js';
const status = document.getElementById('status');
const input = document.getElementById('fixture');
const download = document.getElementById('download');
let fixture, busy = false, result;
function finish(value) {
  fixture = undefined;
  result = value;
  document.getElementById('evidence').textContent = JSON.stringify(value, null, 2);
  status.textContent = value.passed ? 'Selected development check passed. Save the redacted result.' : 'Not passed. Save the redacted result for the engineer.';
  download.hidden = false;
}
input.addEventListener('change', async () => {
  if (busy || input.files.length !== 1) return;
  busy = true; input.disabled = true; document.getElementById('mode').disabled = true;
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
            const mode=document.getElementById('mode').value;
            if(mode==='otp') {
              const requested=await requestInvitedCode({...fixture,captchaToken:token});
              if(!requested.requestAccepted) { finish({environment:'development',scope:'invited-email-code',requested,passed:false}); return; }
              status.textContent='Check the controlled invited inbox and enter its sign-in code below.';
              document.getElementById('otp-form').hidden=false;
              return;
            }
            if(mode==='expired') {
              status.textContent='Leave this page open for 5 minutes 10 seconds. The unused proof will then be tested automatically.';
              const started=performance.now();
              await new Promise(resolve=>setTimeout(resolve,310000));
              const elapsedMs=performance.now()-started;
              const expired=await verifyInvitedLogin({...fixture,captchaToken:token});
              finish({environment:'development',scope:'unused-token-expiry',recordedAt:new Date().toISOString(),elapsedMs,expired,passed:elapsedMs>=310000 && !expired.accepted && expired.rejection==='captcha_failed'});
              return;
            }
            if(mode==='closed') {
              const closed=await verifyClosedEnrollment({...fixture,captchaToken:token});
              finish({environment:'development',scope:'closed-enrollment',recordedAt:new Date().toISOString(),closed,passed:closed.passed,anonymousEnrollmentProven:false});
              return;
            }
            const fresh = await verifyInvitedLogin({...fixture,captchaToken:token});
            const replay = await verifyInvitedLogin({...fixture,captchaToken:token});
            finish({environment:'development',scope:'existing-invited-password-login',recordedAt:new Date().toISOString(),fresh,replay,passed:fresh.accepted && fresh.logoutStatus === 204 && !replay.accepted && replay.status >= 400,anonymousEnrollmentProven:false,nativeBridgeProven:false});
          } catch { finish({environment:'development',passed:false,failure:'AUTH_TRANSPORT_FAILED',recordedAt:new Date().toISOString()}); }
        },
        'error-callback': code => { const safeCode = /^[0-9]{3,8}$/.test(String(code)) ? String(code) : 'unknown'; status.textContent = 'Cloudflare verification failed (code ' + safeCode + '). Reload in your normal browser; report this code to the engineer.'; },
        'expired-callback': () => { if(submitted)return; status.textContent = 'Challenge expired. Reload and load the fixture again.'; },
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

document.getElementById('otp-verify').addEventListener('click',async()=>{
  const button=document.getElementById('otp-verify'),field=document.getElementById('otp-code');
  if(button.disabled || !fixture)return;
  const code=field.value;field.value='';button.disabled=true;
  try {
    const fresh=await verifyInvitedCode({...fixture,code});
    const replay=await verifyInvitedCode({...fixture,code});
    finish({environment:'development',scope:'invited-email-code',recordedAt:new Date().toISOString(),fresh,replay,passed:fresh.accepted && fresh.logoutStatus===204 && !replay.accepted && replay.status>=400,nativeBridgeProven:false});
  } catch {finish({environment:'development',scope:'invited-email-code',passed:false,failure:'AUTH_TRANSPORT_OR_INPUT_FAILED'});}
  document.getElementById('otp-form').hidden=true;
});
