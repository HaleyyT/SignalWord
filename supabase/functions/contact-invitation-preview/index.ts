import { createInvitationPreviewGateway, invitationPreview, type InvitationPreview } from "../_shared/contact-invitations.ts";
import { ApiError, asApiError, errorResponse, jsonResponse, requestId } from "../_shared/http.ts";
import { structuredLogger, writeSafely, type SafeLogger } from "../_shared/logging.ts";
import { sha256Hex } from "../_shared/tokens.ts";
import { readJson } from "../_shared/http.ts";
import { createContactJoinService } from "../_shared/contact-join.ts";
import { createContactApprovalGateway } from "../_shared/contact-approval.ts";
import { createJoinCaptchaVerifier } from "../_shared/turnstile.ts";
import { journalFromEnvironment } from "../_shared/safety-journal.ts";
import { wakeDispatch } from "../_shared/dispatch-wakeup.ts";

const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };

export function createInvitationPreviewHandler(deps: {
  enabled: boolean;
  preview?: (tokenHash: string) => Promise<InvitationPreview | null>;
  logger: SafeLogger;
  now: () => number;
  origin?: string;
  join?: Pick<ReturnType<typeof createContactJoinService>, "begin" | "verify">;
  management?: Pick<ReturnType<typeof createContactApprovalGateway>, "status" | "withdraw">;
  wake?: () => Promise<void>;
}) {
  return async (request: Request): Promise<Response> => {
    const startedAt = deps.now();
    const id = requestId(request);
    let status = 500;
    let code: string | undefined;
    try {
      if (!deps.enabled || !deps.preview) throw new ApiError(503, "SERVICE_UNAVAILABLE", "Invitations are not available yet.", true);
      if (request.method !== "GET" && !deps.join && !deps.management) throw new ApiError(405, "METHOD_NOT_ALLOWED", "Use GET to preview an invitation.");
      const path = new URL(request.url).pathname;
      const managed = /\/v3\/contact-management\/([a-f0-9]{64})$/.exec(path);
      const match = /\/v3\/contact-invitations\/([A-Za-z0-9_-]{43})(?:\/(begin|verify))?\/?$/.exec(path);
      if (request.method === "POST") {
        if (!deps.origin || request.headers.get("Origin") !== deps.origin) throw new ApiError(403, "INVALID_REQUEST", "This request origin is unavailable.");
        const body = await readJson(request, 4096);
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "INVALID_REQUEST", "Invalid request.");
        const row = body as Record<string, unknown>;
        let result: unknown;
        if (managed && deps.management && Object.keys(row).length === 0) result = await deps.management.withdraw(managed[1]);
        else if (match?.[2] === "begin" && deps.join
          && Object.keys(row).length === 6 && ["attemptId","email","consent","consentVersion","captchaToken","intent"].every(key => key in row)
          && row.intent === "join" && typeof row.attemptId === "string" && typeof row.email === "string"
          && typeof row.consent === "boolean" && typeof row.consentVersion === "string" && typeof row.captchaToken === "string") {
          result = await deps.join.begin({ invitationToken: match[1], attemptId: row.attemptId, email: row.email,
            consent: row.consent, consentVersion: row.consentVersion, captchaToken: row.captchaToken });
          await deps.wake?.().catch(() => undefined);
        } else if (match?.[2] === "verify" && deps.join && Object.keys(row).length === 2
          && typeof row.attemptId === "string" && typeof row.code === "string") {
          if (!await deps.join.verify(match[1], row.attemptId, row.code)) throw new ApiError(400, "INVALID_REQUEST", "The code is incorrect or no longer available.");
          result = { verified: true };
        } else throw new ApiError(400, "INVALID_REQUEST", "This request is unavailable.");
        status = 200;
        return jsonResponse(result, status, { ...HEADERS, "X-Request-ID": id });
      }
      if (request.method !== "GET") throw new ApiError(405, "METHOD_NOT_ALLOWED", "Use GET or POST.");
      if (managed && deps.management) {
        status = 200;
        return jsonResponse(await deps.management.status(managed[1]), status, { ...HEADERS, "X-Request-ID": id });
      }
      if (!match || match[2]) throw new ApiError(410, "LINK_UNAVAILABLE", "This invitation is unavailable.");
      const preview = invitationPreview(await deps.preview(await sha256Hex(match[1])));
      if (!preview || Date.parse(preview.expiresAt) <= deps.now()) {
        throw new ApiError(410, "LINK_UNAVAILABLE", "This invitation is unavailable.");
      }
      status = 200;
      return jsonResponse(preview, status, { ...HEADERS, "X-Request-ID": id });
    } catch (caught) {
      const error = asApiError(caught);
      status = error.status; code = error.code;
      return errorResponse(error, id, { ...HEADERS, "X-Request-ID": id });
    } finally {
      writeSafely(deps.logger, { requestId: id, route: "contact-invitation-preview", method: request.method,
        status, durationMs: Math.max(0, deps.now() - startedAt), ...(code ? { code } : {}) });
    }
  };
}

if (import.meta.main) {
  const enabled = Deno.env.get("CONTACT_ENROLLMENT_ENABLED") === "true";
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (enabled && (!url || !anonKey)) throw new Error("Backend URL and public key are required");
  const origin = Deno.env.get("CONTACT_INVITATION_ORIGIN");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionKey = Deno.env.get("DESTINATION_ENCRYPTION_KEY");
  const fingerprintKey = Deno.env.get("DESTINATION_FINGERPRINT_KEY");
  const secret = Deno.env.get("CONTACT_TURNSTILE_SECRET");
  if (enabled && (!origin || new URL(origin).origin !== origin || !origin.startsWith("https://") || !serviceRoleKey || !encryptionKey || !fingerprintKey || !secret)) throw new Error("Enrollment configuration is required");
  const join = enabled ? createContactJoinService({ url: url!, serviceRoleKey: serviceRoleKey!, encryptionKey: encryptionKey!,
    fingerprintKey: fingerprintKey!, keyVersion: Number(Deno.env.get("DESTINATION_KEY_VERSION") ?? "1"),
    provider: Deno.env.get("DELIVERY_PROVIDER") === "resend" ? "resend" : "fake",
    environment: (Deno.env.get("APP_ENV") ?? "production") as "production" | "development" | "test",
    verifyCaptcha: createJoinCaptchaVerifier({ secret: secret!, hostname: new URL(origin!).hostname }) }) : undefined;
  const management = enabled ? createContactApprovalGateway({ url: url!, anonKey: anonKey!, serviceRoleKey: serviceRoleKey!,
    authenticate: async () => { throw new Error("OWNER_OPERATION_NOT_AVAILABLE"); },
    decryptDestination: async () => { throw new Error("OWNER_OPERATION_NOT_AVAILABLE"); },
    flushJournal: async userId => { await journalFromEnvironment().flush(userId); } }) : undefined;
  Deno.serve(createInvitationPreviewHandler({ enabled, logger: structuredLogger, now: Date.now, origin, join, management,
    wake: async () => { await wakeDispatch(url!, Deno.env.get("DISPATCH_SECRET") ?? ""); },
    preview: enabled ? createInvitationPreviewGateway({ url: url!, anonKey: anonKey! }) : undefined }));
}
