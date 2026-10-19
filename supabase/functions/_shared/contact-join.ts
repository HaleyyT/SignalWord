import { ApiError } from "./http.ts";
import { createContactDataProtection, createJoinCodeProtection } from "./encryption.ts";
import { sha256Hex } from "./tokens.ts";
import { DeliveryAttemptError } from "./delivery.ts";

export const JOIN_CONSENT_VERSION = "2026-10-19";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

function unavailable(): never {
  throw new ApiError(503, "SERVICE_UNAVAILABLE", "Email verification is unavailable.", true);
}

/** Rejection sampling avoids modulo bias and preserves leading zeroes. */
export function generateJoinCode(): string {
  let value: number;
  do { value = crypto.getRandomValues(new Uint32Array(1))[0]; } while (value >= 4_294_000_000);
  return (value % 1_000_000).toString().padStart(6, "0");
}

export interface JoinEmail {
  attemptId: string;
  invitationHash: string;
  senderName: string;
  provider: "fake" | "resend";
  destinationCiphertext: string;
  destinationKeyVersion: number;
  payloadCiphertext: string;
  payloadKeyVersion: number;
}

/** Not wired to any HTTP route. The future public handler MUST perform its
 * bounded body/origin checks and use a real, hostname/action-bound CAPTCHA
 * verifier. This service independently requires that proof before writes.
 */
export function createContactJoinService(config: {
  url: string; serviceRoleKey: string; encryptionKey: string; fingerprintKey: string; keyVersion: number;
  provider: "fake" | "resend"; environment: "development" | "test" | "production";
  verifyCaptcha: (token: string, requestId: string) => Promise<boolean>;
  fetch?: typeof fetch;
  generateCode?: () => string;
}) {
  if (config.environment === "production" && config.provider === "fake") throw new Error("Fake delivery cannot run in production");
  const protection = createContactDataProtection(config.encryptionKey, config.fingerprintKey, config.keyVersion);
  const codes = createJoinCodeProtection(config.encryptionKey, config.fingerprintKey, config.keyVersion);
  async function rpc(name: string, body: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await (config.fetch ?? fetch)(`${config.url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(5000),
        headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch { return unavailable(); }
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      if (result?.message === "RATE_LIMITED") throw new ApiError(429, "RATE_LIMITED", "Please wait before requesting another code.", true, 60);
      return unavailable();
    }
    return result;
  }
  return {
    async begin(input: { invitationToken: string; attemptId: string; email: string; consent: boolean; consentVersion: string; captchaToken: string }) {
      if (!TOKEN.test(input.invitationToken) || !UUID.test(input.attemptId) || input.consent !== true
        || input.consentVersion !== JOIN_CONSENT_VERSION || typeof input.email !== "string"
        || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
        || typeof input.captchaToken !== "string" || input.captchaToken.length < 1 || input.captchaToken.length > 2048) {
        throw new ApiError(400, "INVALID_REQUEST", "Enter your email and accept the current consent terms.");
      }
      let accepted = false;
      try { accepted = await config.verifyCaptcha(input.captchaToken, input.attemptId) === true; } catch { return unavailable(); }
      if (!accepted) throw new ApiError(400, "INVALID_REQUEST", "Complete the verification challenge.");
      const attemptId = input.attemptId.toLowerCase();
      const hash = await sha256Hex(input.invitationToken);
      const withdrawalToken = await codes.withdrawalToken(attemptId, hash);
      const code = (config.generateCode ?? generateJoinCode)();
      const email = input.email.trim().toLowerCase();
      const result = await rpc("begin_contact_join", {
        p_token_hash: `\\x${hash}`, p_attempt_id: attemptId,
        p_destination_ciphertext: await protection.encryptDestination(email),
        p_destination_fingerprint: `\\x${await protection.fingerprintDestination(email)}`,
        p_destination_key_version: protection.keyVersion,
        p_code_hash: `\\x${await codes.hash(attemptId, hash, code)}`,
        p_code_payload_ciphertext: await codes.encrypt(attemptId, hash, code), p_payload_key_version: codes.keyVersion,
        p_consent_version: input.consentVersion, p_consent_accepted: true, p_provider: config.provider,
        p_withdrawal_hash: `\\x${await sha256Hex(withdrawalToken)}`,
      });
      if (result === null) throw new ApiError(410, "LINK_UNAVAILABLE", "This invitation is unavailable.");
      const row = result as Record<string, unknown>;
      if (row?.attemptId !== attemptId || typeof row.expiresAt !== "string" || !Number.isFinite(Date.parse(row.expiresAt))) return unavailable();
      // Recipient-only response. The browser must retain this private management
      // capability without putting it in analytics, logs or a sender response.
      return { attemptId: row.attemptId as string, expiresAt: row.expiresAt, withdrawalToken };
    },
    async verify(invitationToken: string, attemptId: string, code: string): Promise<boolean> {
      if (!TOKEN.test(invitationToken) || !UUID.test(attemptId) || !/^\d{6}$/.test(code)) {
        throw new ApiError(400, "INVALID_REQUEST", "Enter the six-digit verification code.");
      }
      const hash = await sha256Hex(invitationToken);
      const result = await rpc("verify_contact_join", { p_token_hash: `\\x${hash}`, p_attempt_id: attemptId,
        p_code_hash: `\\x${await codes.hash(attemptId, hash, code)}` });
      if (typeof result !== "boolean") return unavailable();
      return result;
    },
    async claimEmail(leaseId: string): Promise<JoinEmail | null> {
      if (!UUID.test(leaseId)) return unavailable();
      const result = await rpc("claim_contact_join_email", { p_lease_id: leaseId });
      if (result === null) return null;
      const row = result as Record<string, unknown>;
      if (!row || typeof row.attemptId !== "string" || !UUID.test(row.attemptId)
        || typeof row.invitationHash !== "string" || !/^[0-9a-f]{64}$/.test(row.invitationHash)
        || typeof row.senderName !== "string" || row.senderName.length < 1 || row.senderName.length > 80
        || !["fake", "resend"].includes(row.provider as string)
        || typeof row.destinationCiphertext !== "string" || typeof row.payloadCiphertext !== "string"
        || !Number.isInteger(row.destinationKeyVersion) || !Number.isInteger(row.payloadKeyVersion)) return unavailable();
      return { attemptId: row.attemptId, invitationHash: row.invitationHash, senderName: row.senderName,
        provider: row.provider as JoinEmail["provider"], destinationCiphertext: row.destinationCiphertext,
        destinationKeyVersion: row.destinationKeyVersion as number, payloadCiphertext: row.payloadCiphertext,
        payloadKeyVersion: row.payloadKeyVersion as number };
    },
    async finishEmail(attemptId: string, leaseId: string, outcome: "sent" | "failed" | "unknown", providerMessageId?: string) {
      const result = await rpc("finish_contact_join_email", { p_attempt_id: attemptId, p_lease_id: leaseId,
        p_outcome: outcome, p_provider_message_id: providerMessageId ?? null });
      if (typeof result !== "boolean") return unavailable();
      return result;
    },
    async decryptEmail(email: JoinEmail) {
      return { recipient: await protection.decryptDestination(email.destinationCiphertext, email.destinationKeyVersion),
        code: await codes.decrypt(email.payloadCiphertext, email.payloadKeyVersion, email.attemptId, email.invitationHash),
        withdrawalToken: await codes.decryptWithdrawalToken(email.payloadCiphertext, email.payloadKeyVersion, email.attemptId, email.invitationHash) };
    },
  };
}

/** Single-claim worker; provider ambiguity and failed finalization are never
 * retried automatically. No default adapter and no production wiring yet.
 */
export async function runContactJoinEmail(deps: {
  leaseId: string;
  service: Pick<ReturnType<typeof createContactJoinService>, "claimEmail" | "decryptEmail" | "finishEmail">;
  adapter: { provider: "fake" | "resend"; sendJoinCode(input: { recipient: string; code: string; withdrawalToken: string; senderName: string; idempotencyKey: string }): Promise<{ providerMessageId: string }> };
}): Promise<"idle" | "sent" | "failed" | "unknown" | "lease_lost"> {
  const email = await deps.service.claimEmail(deps.leaseId);
  if (!email) return "idle";
  let plaintext: { recipient: string; code: string; withdrawalToken: string };
  try {
    if (email.provider !== deps.adapter.provider) throw new Error("Provider mismatch");
    plaintext = await deps.service.decryptEmail(email);
  } catch {
    return await deps.service.finishEmail(email.attemptId, deps.leaseId, "failed") ? "failed" : "lease_lost";
  }
  let result: { providerMessageId: string };
  try {
    result = await deps.adapter.sendJoinCode({ ...plaintext, senderName: email.senderName,
      idempotencyKey: `contact/join/${email.attemptId}` });
    if (typeof result?.providerMessageId !== "string" || result.providerMessageId.length < 1 || result.providerMessageId.length > 200) throw new Error("Invalid provider receipt");
  } catch (error) {
    const outcome = error instanceof DeliveryAttemptError && ["PROVIDER_REQUEST_REJECTED", "INVALID_PROVIDER_IDEMPOTENCY_KEY"].includes(error.safeCode) ? "failed" : "unknown";
    return await deps.service.finishEmail(email.attemptId, deps.leaseId, outcome) ? outcome : "lease_lost";
  }
  // Once accepted, a database failure must leave the lease uncertain, never send again.
  try {
    return await deps.service.finishEmail(email.attemptId, deps.leaseId, "sent", result.providerMessageId) ? "sent" : "lease_lost";
  } catch { return "lease_lost"; }
}
