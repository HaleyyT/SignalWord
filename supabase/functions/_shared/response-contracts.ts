import { ApiError } from "./http.ts";

type Validator = (value: unknown) => boolean;
const text: Validator = (value) => typeof value === "string";
const boolean: Validator = (value) => typeof value === "boolean";
const uuid: Validator = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const timestamp: Validator = (value) => typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const oneOf = (...values: string[]): Validator => (value) => typeof value === "string" && values.includes(value);
const name: Validator = (value) => text(value) && (value as string).trim().length > 0 && (value as string).length <= 80;
const state = oneOf("pending", "active", "resolved", "expired");
const delivery = oneOf("queued", "sent", "delivered", "failed", "unknown");

interface Shape { required: Record<string, Validator>; optional?: Record<string, Validator> }
const alertStatus: Shape = {
  required: { eventId: uuid, kind: oneOf("test", "real"), state, delivery, triggeredAt: timestamp },
  optional: { clientTriggeredAt: timestamp, resolvedAt: timestamp, acknowledgedAt: timestamp,
    resolutionDelivery: delivery, latestLocationAt: timestamp },
};
const contact: Shape = {
  required: { contactId: uuid, name, channel: oneOf("email"), status: oneOf("pending", "confirmed", "disabled") },
  optional: { confirmationExpiresAt: timestamp },
};
const invitation: Shape = {
  required: { invitationId: uuid, displayName: name, status: oneOf("open", "revoked", "expired"), expiresAt: timestamp },
};
const shareURL: Validator = (value) => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const local = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return (url.protocol === "https:" || local) && !url.username && !url.password && !url.search && !url.hash
      && /^\/join\/[A-Za-z0-9_-]{43}$/.test(url.pathname);
  } catch { return false; }
};
const shapes = {
  approvedContact: { required: { contactId: uuid, status: oneOf("confirmed") } },
  profile: { required: { displayName: name } },
  createAlert: { required: { eventId: uuid, state, delivery, serverTriggeredAt: timestamp, reused: boolean } },
  contact,
  contactInvitation: { ...invitation, optional: { shareURL } },
  revokeInvitation: { required: { revoked: boolean } },
  alertStatus,
  disableContact: { required: { disabled: boolean } },
  appendLocation: { required: { accepted: boolean, receivedAt: timestamp } },
  resolveAlert: { required: { eventId: uuid, state: oneOf("resolved"), resolvedAt: timestamp } },
  deleteData: { required: { deletionId: uuid } },
} satisfies Record<string, Shape>;
export type ResponseContract = keyof typeof shapes | "recovery" | "contactNetwork" | "recipients" | "checkIn" | "contactInvitations" | "contactCandidates";

function invalid(): never {
  // Do not echo malformed upstream data, which may contain private fields.
  throw new ApiError(503, "SERVICE_UNAVAILABLE", "The service returned an invalid response.", true);
}

function project(value: unknown, shape: Shape): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, validate] of Object.entries(shape.required)) {
    if (!validate(source[key])) return invalid();
    result[key] = source[key];
  }
  for (const [key, validate] of Object.entries(shape.optional ?? {})) {
    if (source[key] === undefined || source[key] === null) continue;
    if (!validate(source[key])) return invalid();
    result[key] = source[key];
  }
  return result;
}

/** Validate and allowlist every authenticated success response at the HTTP boundary.
 * A database change cannot accidentally expose extra columns or report corrupt state.
 */
export function parseUserResponse(contract: ResponseContract, value: unknown): unknown {
  if (contract === "contactCandidates") {
    if (!Array.isArray(value) || value.length > 3) return invalid();
    return value.map(entry => project(entry, { required: { attemptId: uuid,
      emailHint: value => typeof value === "string" && /^[^\s@]\*\*\*@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 257,
      verifiedAt: timestamp, expiresAt: timestamp } }));
  }
  if (contract === "contactInvitations") {
    if (!Array.isArray(value) || value.length > 20) return invalid();
    return value.map(entry => project(entry, invitation));
  }
  if (contract === "checkIn") {
    if (value === null) return null;
    return project(value,{required:{timerId:uuid,state:oneOf("active","checked_in","cancelled","escalated","failed"),deadline:timestamp,graceEndsAt:timestamp,serverNow:timestamp},
      optional:{incidentId:uuid,failureCode:text,incidentState:state}});
  }
  if (contract === "contactNetwork") {
    const source = value as {policy?: unknown;contacts?:unknown[]};
    if (!source || !oneOf("everyone","primary_then_others")(source.policy) || !Array.isArray(source.contacts) || source.contacts.length>3) return invalid();
    return {policy:source.policy,contacts:source.contacts.map(c=>project(c,{required:{...contact.required,primary:boolean}}))};
  }
  if (contract === "recipients") {
    if (!Array.isArray(value) || value.length>3) return invalid();
    return value.map(v=>project(v,{required:{contactId:uuid,name,revoked:boolean,scheduledAt:timestamp,delivery},
      optional:{acknowledgedAt:timestamp,resolutionDelivery:delivery,failureCode:text}}));
  }
  if (contract === "recovery") {
    if (!Array.isArray(value)) return invalid();
    return value.map((entry) => project(entry, alertStatus));
  }
  return project(value, shapes[contract]);
}
