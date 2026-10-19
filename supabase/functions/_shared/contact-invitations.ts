import { ApiError } from "./http.ts";
import { sha256Hex } from "./tokens.ts";

export interface InvitationProjection {
  invitationId: string;
  displayName: string;
  status: "open" | "revoked" | "expired";
  expiresAt: string;
  shareURL?: string;
}

export interface InvitationPreview {
  displayName: string;
  expiresAt: string;
  consentVersion: string;
}

export interface ContactInvitationGateway {
  create(userId: string, requestKey: string): Promise<InvitationProjection>;
  list(userId: string, jwt: string): Promise<InvitationProjection[]>;
  revoke(userId: string, invitationId: string, jwt: string): Promise<boolean>;
}

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;

function unavailable(): never {
  throw new ApiError(503, "SERVICE_UNAVAILABLE", "Invitations are temporarily unavailable.", true);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return unavailable();
  return value as Record<string, unknown>;
}

function validName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 80;
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}

export function invitationProjection(value: unknown): InvitationProjection {
  const row = record(value);
  if (typeof row.invitationId !== "string" || !UUID.test(row.invitationId) || !validName(row.displayName)
    || typeof row.status !== "string" || !["open", "revoked", "expired"].includes(row.status) || !validDate(row.expiresAt)) return unavailable();
  // Explicit projection; never expose ciphertexts, hashes, user IDs or row diagnostics.
  return { invitationId: row.invitationId, displayName: row.displayName,
    status: row.status as InvitationProjection["status"], expiresAt: row.expiresAt };
}

export function invitationPreview(value: unknown): InvitationPreview | null {
  if (value === null) return null;
  const row = record(value);
  if (!validName(row.displayName) || !validDate(row.expiresAt) || row.consentVersion !== "2026-10-19") return unavailable();
  return { displayName: row.displayName, expiresAt: row.expiresAt, consentVersion: row.consentVersion };
}

function invitationOrigin(value: string, allowLocalhost: boolean): string {
  const origin = new URL(value);
  const local = origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if ((origin.protocol !== "https:" && !(allowLocalhost && local)) || origin.username || origin.password
    || origin.pathname !== "/" || origin.search || origin.hash) throw new Error("Invalid invitation origin");
  return origin.origin;
}

interface BackendConfig { url: string; anonKey: string; fetch?: typeof fetch }

function rpcClient(config: BackendConfig) {
  return async (name: string, body: unknown, apiKey: string, bearer: string): Promise<unknown> => {
    let response: Response;
    try {
      response = await (config.fetch ?? fetch)(`${config.url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(5000),
        headers: { apikey: apiKey, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch { return unavailable(); }
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const error = result && typeof result === "object" ? result as Record<string, unknown> : {};
      if (error.message === "RATE_LIMITED") throw new ApiError(429, "RATE_LIMITED", "Try again later.", true, 3600);
      if (error.message === "CONTACT_LIMIT") throw new ApiError(409, "CONTACT_LIMIT", "You have reached the contact or invitation limit.");
      if ([401, 403].includes(response.status)) throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
      return unavailable();
    }
    return result;
  };
}

/** Constructed only when the server-side enrollment feature flag is enabled. */
export function createContactInvitationGateway(config: BackendConfig & {
  serviceRoleKey: string;
  publicOrigin: string;
  allowLocalhost?: boolean;
  generateToken: () => string;
  cipher: { keyVersion: number; encrypt(token: string): Promise<string>; decrypt(ciphertext: string, version: number): Promise<string> };
}): ContactInvitationGateway {
  const origin = invitationOrigin(config.publicOrigin, config.allowLocalhost === true);
  const rpc = rpcClient(config);
  return {
    async create(userId, requestKey) {
      const token = config.generateToken();
      if (!TOKEN.test(token)) return unavailable();
      const result = await rpc("create_contact_invitation", {
        p_user_id: userId, p_request_key: requestKey, p_token_hash: `\\x${await sha256Hex(token)}`,
        p_token_ciphertext: await config.cipher.encrypt(token), p_token_key_version: config.cipher.keyVersion,
      }, config.serviceRoleKey, config.serviceRoleKey);
      const projection = invitationProjection(result);
      if (projection.status !== "open") return projection;
      const row = record(result);
      if (typeof row.tokenCiphertext !== "string" || typeof row.tokenKeyVersion !== "number"
        || typeof row.tokenHash !== "string" || !HASH.test(row.tokenHash)) return unavailable();
      // Recover the original capability on a lost-response retry, not the newly
      // generated unused token. Validate binding before returning the share URL.
      let recovered: string;
      try { recovered = await config.cipher.decrypt(row.tokenCiphertext, row.tokenKeyVersion); }
      catch { return unavailable(); }
      if (!TOKEN.test(recovered) || await sha256Hex(recovered) !== row.tokenHash) return unavailable();
      return { ...projection, shareURL: `${origin}/join/${recovered}` };
    },
    async list(userId, jwt) {
      const result = await rpc("list_contact_invitations", { p_user_id: userId }, config.anonKey, jwt);
      if (!Array.isArray(result) || result.length > 20) return unavailable();
      return result.map(invitationProjection);
    },
    async revoke(userId, invitationId, jwt) {
      const result = await rpc("revoke_contact_invitation", { p_user_id: userId, p_invitation_id: invitationId }, config.anonKey, jwt);
      if (typeof result !== "boolean") return unavailable();
      return result;
    },
  };
}

/** Anonymous RPC can return only the capability-scoped, allowlisted preview. */
export function createInvitationPreviewGateway(config: BackendConfig) {
  const rpc = rpcClient(config);
  return async (tokenHash: string): Promise<InvitationPreview | null> => {
    if (!HASH.test(tokenHash)) return null;
    return invitationPreview(await rpc("preview_contact_invitation", { p_token_hash: `\\x${tokenHash}` }, config.anonKey, config.anonKey));
  };
}
