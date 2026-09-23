import { ApiError } from "./http.ts";
import type { CreateAlertInput } from "./validation.ts";

export interface AuthenticatedUser { id: string }

export interface CreatedAlert {
  eventId: string;
  state: "active" | "pending" | "resolved" | "expired";
  delivery: "queued" | "sent" | "delivered" | "failed";
  serverTriggeredAt: string;
  reused: boolean;
}

export interface BackendGateway {
  authenticate(jwt: string): Promise<AuthenticatedUser>;
  createAlert(input: CreateAlertInput, userId: string, idempotencyKey: string, viewerToken: string, jwt: string): Promise<CreatedAlert>;
  publicEvent(tokenHashHex: string): Promise<unknown | null>;
}

interface GatewayConfiguration { url: string; anonKey: string }

export function createBackendGateway(configuration: GatewayConfiguration): BackendGateway {
  const baseUrl = configuration.url.replace(/\/$/, "");
  const headers = (authorization: string) => ({
    apikey: configuration.anonKey,
    Authorization: authorization,
    "Content-Type": "application/json",
  });

  return {
    async authenticate(jwt) {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/auth/v1/user`, { headers: headers(`Bearer ${jwt}`) });
      } catch {
        throw new ApiError(503, "SERVICE_UNAVAILABLE", "Authentication is temporarily unavailable.", true);
      }
      if (!response.ok) throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
      const user = await response.json() as { id?: unknown };
      if (typeof user.id !== "string") throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
      return { id: user.id };
    },

    async createAlert(input, userId, idempotencyKey, viewerToken, jwt) {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/rest/v1/rpc/create_or_reuse_alert`, {
          method: "POST",
          headers: headers(`Bearer ${jwt}`),
          body: JSON.stringify({
            p_user_id: userId,
            p_idempotency_key: idempotencyKey,
            p_kind: input.kind,
            p_trigger_method: input.triggerMethod,
            p_viewer_token: viewerToken,
            p_location: input.location ?? null,
          }),
        });
      } catch {
        throw new ApiError(503, "SERVICE_UNAVAILABLE", "Alert creation is temporarily unavailable.", true);
      }
      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { message?: unknown };
        if (error.message === "CONTACT_NOT_CONFIRMED") {
          throw new ApiError(422, "CONTACT_NOT_CONFIRMED", "Confirm a trusted contact before creating an alert.");
        }
        if (error.message === "RATE_LIMITED") {
          throw new ApiError(429, "RATE_LIMITED", "Too many alert requests. Try again shortly.", true, 60);
        }
        if (response.status === 401 || response.status === 403) {
          throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
        }
        throw new ApiError(503, "SERVICE_UNAVAILABLE", "Alert creation is temporarily unavailable.", true);
      }
      const rows = await response.json() as Array<Record<string, unknown>>;
      const row = rows[0];
      if (!row || typeof row.event_id !== "string" || typeof row.server_triggered_at !== "string" ||
        !["active", "pending", "resolved", "expired"].includes(String(row.event_state)) ||
        !["queued", "sent", "delivered", "failed"].includes(String(row.delivery_status)) ||
        typeof row.reused !== "boolean") {
        throw new ApiError(503, "SERVICE_UNAVAILABLE", "Alert creation returned an invalid result.", true);
      }
      return {
        eventId: row.event_id,
        state: row.event_state as CreatedAlert["state"],
        delivery: row.delivery_status as CreatedAlert["delivery"],
        serverTriggeredAt: row.server_triggered_at,
        reused: row.reused === true,
      };
    },

    async publicEvent(tokenHashHex) {
      let response: Response;
      try {
        response = await fetch(`${baseUrl}/rest/v1/rpc/get_public_event`, {
          method: "POST",
          headers: headers(`Bearer ${configuration.anonKey}`),
          body: JSON.stringify({ p_token_hash: `\\x${tokenHashHex}` }),
        });
      } catch {
        throw new ApiError(503, "SERVICE_UNAVAILABLE", "The alert is temporarily unavailable.", true);
      }
      if (!response.ok) throw new ApiError(503, "SERVICE_UNAVAILABLE", "The alert is temporarily unavailable.", true);
      const rows = await response.json() as Array<{ projection?: unknown }>;
      return rows[0]?.projection ?? null;
    },
  };
}
