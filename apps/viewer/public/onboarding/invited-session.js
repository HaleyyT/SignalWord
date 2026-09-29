/** Existing invited identity only. Never creates users or stores returned sessions. */
export const backend = 'https://voepalyamwgenceawdvl.supabase.co';
export async function verifyInvitedLogin({ email, password, publishableKey, captchaToken, fetchImpl = fetch }) {
  if (!email || !password || !publishableKey || !captchaToken) throw Error('SESSION_INPUT_REQUIRED');
  const response = await fetchImpl(`${backend}/auth/v1/token?grant_type=password`, {
    method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000),
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, gotrue_meta_security: { captcha_token: captchaToken } }),
  });
  const body = await response.json().catch(() => null);
  const accepted = response.ok && typeof body?.access_token === 'string' && !!body?.user?.id;
  // Revoke the temporary session immediately. Never return or persist its tokens.
  let logoutStatus = null;
  if (accepted) {
    const logout = await fetchImpl(`${backend}/auth/v1/logout?scope=local`, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: { apikey: publishableKey, Authorization: `Bearer ${body.access_token}` },
    });
    logoutStatus = logout.status;
  }
  return { status: response.status, accepted, logoutStatus, ...(body?.error_code === "captcha_failed" || body?.code === "captcha_failed" ? {rejection:"captcha_failed"} : {}) };
}

/** Closed enrollment probe: a fresh human token must still be refused by Auth. */
export async function verifyClosedEnrollment({password,publishableKey,captchaToken,fetchImpl=fetch}) {
  if (!password || !publishableKey || !captchaToken) throw Error('SESSION_INPUT_REQUIRED');
  const response=await fetchImpl(`${backend}/auth/v1/signup`,{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000),
    headers:{apikey:publishableKey,'Content-Type':'application/json'},
    body:JSON.stringify({email:`signalword-closed-probe-${crypto.randomUUID()}@example.invalid`,password,gotrue_meta_security:{captcha_token:captchaToken}}),
  });
  const body=await response.json().catch(()=>null);
  const disabled=(body?.error_code ?? body?.code)==='signup_disabled';
  return {status:response.status,signupDisabled:disabled,passed:!response.ok && disabled};
}
