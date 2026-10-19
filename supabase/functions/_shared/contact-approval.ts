import { ApiError } from "./http.ts";
import { sha256Hex } from "./tokens.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
function unavailable(): never { throw new ApiError(503, "SERVICE_UNAVAILABLE", "Contact approval is unavailable.", true); }
function validUUID(value: string) { if (!UUID.test(value)) throw new ApiError(400, "INVALID_REQUEST", "Invalid contact request."); }

/** Not enabled or wired to public routes yet. Authentication is deliberately
 * inside this boundary, before any service-role candidate lookup. */
export function createContactApprovalGateway(config: {
  url: string; anonKey: string; serviceRoleKey: string;
  authenticate: (jwt: string) => Promise<{ id: string }>;
  decryptDestination: (ciphertext: string, keyVersion: number) => Promise<string>;
  flushJournal: (userId: string) => Promise<void>;
  fetch?: typeof fetch;
}) {
  async function rpc(name: string, body: unknown, jwt?: string): Promise<unknown> {
    let response: Response;
    try {
      response = await (config.fetch ?? fetch)(`${config.url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(5000),
        headers: { apikey: jwt ? config.anonKey : config.serviceRoleKey,
          Authorization: `Bearer ${jwt ?? config.serviceRoleKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch { return unavailable(); }
    const result = await response.json().catch(() => undefined);
    if (!response.ok || result === undefined) return unavailable();
    return result;
  }
  async function owner(jwt: string) {
    if (!jwt || jwt.length > 8192) throw new ApiError(401, "AUTH_REQUIRED", "Sign in to review contacts.");
    const user = await config.authenticate(jwt);
    if (!user || !UUID.test(user.id)) return unavailable();
    return user.id;
  }
  return {
    async status(withdrawalToken: string) {
      if (!HASH.test(withdrawalToken)) throw new ApiError(410, "LINK_UNAVAILABLE", "This management link is unavailable.");
      const row = await rpc("contact_join_status", { p_withdrawal_hash: `\\x${await sha256Hex(withdrawalToken)}` }) as Record<string, unknown> | null;
      if (row === null) throw new ApiError(410, "LINK_UNAVAILABLE", "This management link is unavailable.");
      if (!row || !["pending_email", "pending_approval", "approved", "withdrawal_pending", "withdrawn", "expired"].includes(row.status as string)) return unavailable();
      return { status: row.status as "pending_email" | "pending_approval" | "approved" | "withdrawal_pending" | "withdrawn" | "expired" };
    },
    async review(jwt: string, invitationId: string) {
      validUUID(invitationId);
      const userId = await owner(jwt);
      const result = await rpc("review_contact_joins", { p_user_id: userId, p_invitation_id: invitationId });
      if (!Array.isArray(result) || result.length > 3) return unavailable();
      const candidates: { attemptId: string; emailHint: string; verifiedAt: string; expiresAt: string }[] = [];
      for (const row of result) {
        if (!row || !UUID.test(row.attemptId) || typeof row.destinationCiphertext !== "string"
          || !Number.isInteger(row.destinationKeyVersion) || typeof row.verifiedAt !== "string"
          || !Number.isFinite(Date.parse(row.verifiedAt)) || typeof row.expiresAt !== "string"
          || !Number.isFinite(Date.parse(row.expiresAt))) return unavailable();
        let email: string;
        try { email = await config.decryptDestination(row.destinationCiphertext, row.destinationKeyVersion); } catch { return unavailable(); }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return unavailable();
        const [local, domain] = email.split("@");
        candidates.push({ attemptId: row.attemptId, emailHint: `${local.slice(0, 1)}***@${domain}`,
          verifiedAt: row.verifiedAt, expiresAt: row.expiresAt });
      }
      return candidates;
    },
    async approve(jwt: string, invitationId: string, attemptId: string, name = "Trusted person") {
      validUUID(invitationId); validUUID(attemptId);
      if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 80) {
        throw new ApiError(400, "INVALID_REQUEST", "Choose a short contact label.");
      }
      const userId = await owner(jwt);
      // The approval write uses the caller's JWT, never elevated service access.
      const result = await rpc("approve_contact_join", { p_user_id: userId, p_invitation_id: invitationId,
        p_attempt_id: attemptId, p_name: name.trim() }, jwt);
      if (result === null) throw new ApiError(409, "LINK_UNAVAILABLE", "This contact request is no longer available.");
      const row = result as Record<string, unknown>;
      if (!row || typeof row.contactId !== "string" || !UUID.test(row.contactId) || row.status !== "confirmed") return unavailable();
      return { contactId: row.contactId, status: "confirmed" as const };
    },
    async withdraw(withdrawalToken: string) {
      if (!HASH.test(withdrawalToken)) throw new ApiError(410, "LINK_UNAVAILABLE", "This management link is unavailable.");
      const result = await rpc("withdraw_contact_join", { p_withdrawal_hash: `\\x${await sha256Hex(withdrawalToken)}` });
      if (result === null) throw new ApiError(410, "LINK_UNAVAILABLE", "This management link is unavailable.");
      const row = result as Record<string, unknown>;
      if (!row || row.withdrawn !== true || typeof row.userId !== "string" || !UUID.test(row.userId)) return unavailable();
      // A local database update alone is not restore-safe acknowledgement.
      try { await config.flushJournal(row.userId); } catch { return unavailable(); }
      return { withdrawn: true as const };
    },
  };
}
