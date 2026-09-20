# SafeWord V1 API Contracts

## Conventions

- Base path: `/v1`
- Authenticated endpoints use `Authorization: Bearer <user JWT>`.
- Public viewer endpoints use a 256-bit opaque token in the path and no user JWT.
- Request and response timestamps are RFC 3339 UTC.
- Clients send `X-Request-ID`; alert creation also sends `Idempotency-Key` as a UUID.
- Error body: `{ "error": { "code": "STABLE_CODE", "message": "safe text", "retryable": true } }`.
- Never return internal stack traces, provider bodies, destination values, or token hashes.

## `POST /v1/contacts`

Create or replace the one V1 trusted contact.

```json
{
  "name": "Alex",
  "channel": "email",
  "destination": "alex@example.com"
}
```

Response `201`:

```json
{
  "contactId": "uuid",
  "name": "Alex",
  "channel": "email",
  "maskedDestination": "a***@example.com",
  "status": "pending"
}
```

Rules: destination is encrypted server-side; user can only access their own contact; rate-limit replacements.

## `POST /v1/contacts/{contactId}/verification`

Send a test/consent message. Idempotency required.

```json
{ "locale": "en-AU" }
```

Response `202`:

```json
{
  "status": "sent",
  "expiresAt": "2026-09-20T08:00:00Z"
}
```

The message is visibly labeled `TEST — no emergency has been reported` and previews the real alert format.

## `POST /v1/contacts/confirm`

Public confirmation from the contact link.

```json
{ "token": "opaque-confirmation-token" }
```

Response `200`: `{ "status": "confirmed" }`.

Invalid, expired, or already-used tokens return a generic response without contact/user enumeration.

## `POST /v1/alerts`

Create or reuse the canonical event. This is the first network action from `TriggerAlertIntent`.

Headers:

```text
Idempotency-Key: 7ecb4c2f-...
X-Request-ID: 4f05f8a0-...
```

```json
{
  "kind": "real",
  "triggerMethod": "vocalShortcut",
  "clientTriggeredAt": "2026-09-20T07:15:00Z",
  "device": {
    "batteryPercent": 62,
    "lowPowerMode": false
  },
  "location": {
    "latitude": -33.8688,
    "longitude": 151.2093,
    "horizontalAccuracyM": 18.4,
    "capturedAt": "2026-09-20T07:14:58Z"
  }
}
```

`location` and `device` are optional. Response `201` for new or `200` for reused:

```json
{
  "eventId": "uuid",
  "state": "active",
  "delivery": "queued",
  "serverTriggeredAt": "2026-09-20T07:15:01Z",
  "reused": false
}
```

Server behavior, in one transaction where practical:

1. authenticate user;
2. require a confirmed contact for `real` events;
3. enforce rate limit and unique `(user_id, idempotency_key)`;
4. create event, viewer token, optional location, and queued delivery;
5. dispatch after commit;
6. return canonical event ID.

Retry: client retries the same idempotency key on timeout. A retry must never create another event or recipient message.

## `POST /v1/alerts/{eventId}/locations`

```json
{
  "latitude": -33.8687,
  "longitude": 151.2094,
  "horizontalAccuracyM": 12.0,
  "capturedAt": "2026-09-20T07:15:12Z"
}
```

Response `202`: `{ "accepted": true, "receivedAt": "..." }`.

Rules: owner-only; active event only; plausible coordinate/accuracy bounds; server time decides freshness; throttle excessive samples.

## `POST /v1/alerts/{eventId}/resolve`

```json
{ "reason": "userMarkedSafe" }
```

Response `200`:

```json
{
  "eventId": "uuid",
  "state": "resolved",
  "resolvedAt": "2026-09-20T07:20:00Z"
}
```

The endpoint is idempotent. It stops further location writes, schedules retention expiry, and sends a status update. It does not retract the original alert.

## `GET /v1/alerts/{eventId}`

Owner status for app recovery.

```json
{
  "eventId": "uuid",
  "kind": "real",
  "state": "active",
  "triggeredAt": "...",
  "delivery": "delivered",
  "latestLocationAt": "..."
}
```

## `GET /v1/public/events/{token}`

Public, token-scoped viewer projection.

Response `200`:

```json
{
  "kind": "real",
  "displayName": "Haley",
  "state": "active",
  "triggeredAt": "2026-09-20T07:15:01Z",
  "lastUpdatedAt": "2026-09-20T07:15:12Z",
  "location": {
    "latitude": -33.8687,
    "longitude": 151.2094,
    "horizontalAccuracyM": 12.0,
    "capturedAt": "2026-09-20T07:15:12Z",
    "freshness": "live"
  },
  "guidance": {
    "summary": "Contact Haley now. If you believe there is immediate danger, call the appropriate local emergency number."
  }
}
```

Freshness values:

- `live`: latest server-received sample ≤ 30 seconds;
- `recent`: 31 seconds–2 minutes;
- `stale`: > 2 minutes;
- `unavailable`: no sample.

For invalid, expired, revoked, or unknown tokens, return the same `404` body. Apply IP/token rate limits. Use `Cache-Control: no-store` and a restrictive referrer policy.

## `DELETE /v1/me`

Deletes user-owned data, revokes tokens, and invalidates the backend identity.

Response `202`: `{ "deletionId": "uuid", "status": "accepted" }`.

The UI clears local data only after server acceptance or records a signed pending-deletion marker for retry.

## Status codes

- `400` invalid safe-to-disclose input
- `401` invalid/expired auth
- `403` wrong owner or unsafe state
- `404` resource/token unavailable
- `409` state conflict; not used for idempotent reuse
- `422` contact not confirmed/readiness failure
- `429` rate limited, with `Retry-After`
- `500` non-retryable server failure when known
- `503` retryable provider/backend dependency failure

## Retry policy

- Network/`503`: exponential backoff with jitter, capped at 30 seconds during an active attempt.
- `429`: honor `Retry-After`.
- Other `4xx`: do not retry unchanged request.
- Location updates may be dropped after event resolution.
- Alert creation persists until delivery outcome is known; all retries reuse the original idempotency key.
