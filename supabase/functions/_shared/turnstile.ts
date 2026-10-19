/** Server verification is mandatory; the widget's token is not proof itself.
 * No address, invitation capability, IP or code is sent to this provider.
 */
export function createJoinCaptchaVerifier(config: { secret: string; hostname: string; fetch?: typeof fetch; now?: () => number }) {
  if (!config.secret || !/^[A-Za-z0-9.-]+$/.test(config.hostname)) throw new Error("Enrollment CAPTCHA configuration is required");
  return async (token: string, attemptId: string): Promise<boolean> => {
    if (typeof token !== "string" || !token || token.length > 2048) return false;
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${attemptId}:${token}`)));
    hash[6] = (hash[6] & 15) | 64; hash[8] = (hash[8] & 63) | 128;
    const hex = Array.from(hash.slice(0, 16), value => value.toString(16).padStart(2, "0")).join("");
    const idempotencyKey = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    const response = await (config.fetch ?? fetch)("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(5000), headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: config.secret, response: token, idempotency_key: idempotencyKey }),
    });
    if (!response.ok) throw new Error("CAPTCHA_UNAVAILABLE");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("CAPTCHA_UNAVAILABLE");
    let text = "", length = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > 8192) { void reader.cancel().catch(() => {}); throw new Error("CAPTCHA_UNAVAILABLE"); }
        text += decoder.decode(chunk.value, { stream: true });
      }
    } finally { reader.releaseLock(); }
    const result = JSON.parse(text + decoder.decode());
    const age = (config.now ?? Date.now)() - Date.parse(result.challenge_ts);
    return result.success === true && result.hostname === config.hostname && result.action === "contact_join"
      && result.cdata === attemptId && Number.isFinite(age) && age >= -30_000 && age <= 300_000;
  };
}
