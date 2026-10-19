# Recipient-owned contact enrollment (in progress)

The first implementation slice creates and revokes private invitation links and
supports a read-only preview. It does not establish recipient consent or send
email. It is **not the complete Apple-review fix**. Keep the server-only
`CONTACT_ENROLLMENT_ENABLED` flag false until verification, sender approval,
browser/native integration, withdrawal, restore safety and the legacy cutover
are tested together.

## Authenticated routes on user-api

- `POST /v3/contact-invitations`: user bearer token, JSON `{}`, and UUID
  `Idempotency-Key`. Sender identity and display name come from the authenticated
  profile. Recipient fields are rejected. Returns HTTP 200 for creation/retry.
- `GET /v3/contact-invitations`: at most 20 owner-scoped invitation summaries.
  This response never includes share URLs, token hashes or ciphertexts.
- `DELETE /v3/contact-invitations/{invitationId}`: owner-only, idempotently revoke
  the link. Missing and other-owner IDs both return 404.

Creation returns `invitationId`, `displayName`, `expiresAt`, `status` and, only
for an open invitation, `shareURL`. A retry with the same idempotency key
recovers the original URL rather than issuing another capability or consuming
another rate-limit slot. Revoked or expired invitations return their terminal
status without a URL. A new invitation requires a new idempotency key. Expired
rows are removed by hourly retention; recovery is only within that lifetime.

The share URL uses the configured `CONTACT_INVITATION_ORIGIN` and `/join/{token}`.
The browser route is not implemented in this slice: do not expose these links
to users yet. The origin must be HTTPS without a path, query, credentials or
fragment; loopback HTTP is allowed only in development/test.

## Capability-scoped preview on contact-invitation-preview

`GET /v3/contact-invitations/{token}` returns only `displayName`, `expiresAt` and
`consentVersion`. It returns 410 for an unavailable link. Opening the link
does not create a contact, confirm consent or enqueue a message. All mutations
return 405. Responses use `Cache-Control: no-store` and `Referrer-Policy:
no-referrer`. The gateway hashes the raw token before the database lookup; logs
never contain request paths, capabilities or identifiers.

## Persistence and rollout

The additive migration stores invitation token hashes and purpose-tagged,
AES-GCM encrypted recovery material. It accepts no recipient details. Direct
table access is denied to public clients and the service role. Security-definer
RPCs expose narrowly scoped operations; only the Edge service can mint tokens.
Three existing contacts/open invitations share a creation capacity, and new
links are limited to five per sender per hour. Revocation cannot reset that
budget. Profiles deleted or disabled cannot create/preview invitations.

Existing confirmed contacts, alert/timer APIs and legacy setup behavior are
unchanged in this gated slice. Pending legacy invitation cleanup and rejecting
legacy setup writes belong to the coordinated cutover, not this migration.
No hosted deployment or migration is performed by these source changes.
