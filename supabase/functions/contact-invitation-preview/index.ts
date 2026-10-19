import { createInvitationPreviewGateway, invitationPreview, type InvitationPreview } from "../_shared/contact-invitations.ts";
import { ApiError, asApiError, errorResponse, jsonResponse, requestId } from "../_shared/http.ts";
import { structuredLogger, writeSafely, type SafeLogger } from "../_shared/logging.ts";
import { sha256Hex } from "../_shared/tokens.ts";

const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };

export function createInvitationPreviewHandler(deps: {
  enabled: boolean;
  preview?: (tokenHash: string) => Promise<InvitationPreview | null>;
  logger: SafeLogger;
  now: () => number;
}) {
  return async (request: Request): Promise<Response> => {
    const startedAt = deps.now();
    const id = requestId(request);
    let status = 500;
    let code: string | undefined;
    try {
      if (!deps.enabled || !deps.preview) throw new ApiError(503, "SERVICE_UNAVAILABLE", "Invitations are not available yet.", true);
      if (request.method !== "GET") throw new ApiError(405, "METHOD_NOT_ALLOWED", "Use GET to preview an invitation.");
      const path = new URL(request.url).pathname;
      const match = /\/v3\/contact-invitations\/([A-Za-z0-9_-]{43})\/?$/.exec(path);
      if (!match) throw new ApiError(410, "LINK_UNAVAILABLE", "This invitation is unavailable.");
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
  Deno.serve(createInvitationPreviewHandler({ enabled, logger: structuredLogger, now: Date.now,
    preview: enabled ? createInvitationPreviewGateway({ url: url!, anonKey: anonKey! }) : undefined }));
}
