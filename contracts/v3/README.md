# Recipient-owned contact enrollment (in progress)

The backend and recipient browser code implement private invitations, recipient-owned
email verification, provider delivery/receipt tracking, explicit sender approval,
and recipient consent management. Native sender screens and the coordinated legacy
cutover are still incomplete. Keep `CONTACT_ENROLLMENT_ENABLED=false` until the
combined flow and hosted configuration are accepted. This is not yet the complete
Apple-review fix or a TestFlight-ready native candidate.

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
## Recipient verification implementation status (19 October 2026)

Verification lives in `_shared/contact-join.ts` and the recipient-join migrations.
It is now connected to the existing public function and scheduled dispatcher when
the enrollment flag is explicitly enabled. Keep that flag false pending native
integration, hosted acceptance and legacy cutover.

- A recipient-owned request requires the current consent version, an explicit
  acceptance and a successful server-validated CAPTCHA before storage. The real
  verifier checks exact hostname, join action, attempt binding and challenge age.
  The public handler requires exact Origin and bounded JSON bodies; actual hosted
  widget keys and hostname settings still require configuration/acceptance.
- The server encrypts the email and code. The stored code proof uses HMAC with a
  server secret and binds the invitation, attempt UUID and six-digit code.
- Code validity: ten minutes, five incorrect guesses, single use. Pending recipient
  data: thirty minutes, purged by the existing invitation job every minute.
- New codes require a sixty-second destination cooldown. Limits are three requests
  per destination/hour, three per invitation/hour and ten per sender/hour. These
  are fixed hourly windows, not rolling windows. A fresh request supersedes earlier
  attempts for that invitation/address. Request retries preserve the original code
  and never queue a second email; an expired CAPTCHA may require a fresh challenge.
- Email requests live in a private encrypted queue. A worker leases one request;
  expired leases or ambiguous provider outcomes become `unknown`, without automatic
  resend. The Resend adapter and recipient-requested template are covered with
  mocked network tests. Dispatch integration is implemented behind the flag; no
  hosted deployment or real delivery test has been performed.
- Verification records the recipient's acceptance/version and email proof only.
  It creates **no trusted contact and no alert**. The approval milestone below
  adds a separate activation transaction. Existing confirmed contacts are untouched.

## Sender approval, withdrawal and restore status

`20261019030000_contact_join_approval.sql` and `_shared/contact-approval.ts`
implement approval/withdrawal. Recipient management routes are now connected as
described below; the native sender review/approval interface is not implemented.

- Recipient-only verification responses now include a private 64-hex-character
  withdrawal capability. It is recovered deterministically using a separate HMAC
  purpose so retries do not replace it. Only its SHA-256 hash is stored. The
  capability is also encrypted into the verification email payload and linked at
  `/manage-contact/{token}`. The browser route is implemented below. Keep it
  out of logs, analytics, referrers and provider click tracking.
- The owner review gateway verifies the current session before a privileged
  lookup, decrypts only verified pending addresses and returns masked email hints.
  It never returns raw destinations, ciphertext, codes or withdrawal capabilities.
  A hint is not proof of a person's identity: the sender must confirm the intended
  recipient before approving; the future UI must not auto-approve candidates.
- Approval uses the owner's JWT. It requires a live own invitation, verified and
  unexpired/non-superseded proof, current consent version and withdrawal capability.
  It locks against deletion/contact changes, creates one confirmed contact and a
  persistent versioned consent receipt atomically, then closes the invitation.
  It sends no email or alert and never overwrites an existing contact.
- Approval retries return the same still-valid contact; they cannot reactivate
  withdrawn or changed consent. Receipts survive pending-data/invitation purge and
  are removed with their contact/account. Their evidence fields are not exposed
  for arbitrary updates; withdrawal is recorded separately.
- The recipient can cancel before approval or withdraw afterwards. Active contact
  withdrawal disables that consent generation, revokes its viewer access and
  writes the existing independent safety journal. The gateway acknowledges success
  only after the journal is durable. Repeating a request is safe. It cannot retract
  messages already accepted by the email provider.
- Restore reconciliation keeps the previous journal/provider checks, closes all
  restored invitation links and deletes pending recipient/code data. Restored
  incomplete proofs cannot activate or send. Existing proven consent remains
  governed by the independent journal. An old withdrawal capability cannot disable
  a newer consent generation. The former restore entry point is private.

Keep enrollment disabled until native integration, hosted configuration, legacy
cutover and controlled end-to-end/restore evidence are complete. Local automated
checks do not establish TestFlight readiness.


## Recipient browser/API integration (20 October 2026)

- `/join/{invitationToken}` loads a separate, no-store/noindex browser entry with
  a narrow Cloudflare-compatible CSP. Existing public pages retain their original
  stricter CSP. No analytics or error SDK is installed on these pages.
- Same-origin `/api/enrollment/{token}` proxies to the existing
  `contact-invitation-preview` function, with fixed routes, timeout/byte limits,
  no redirects, exact write Origin checks and allowlisted responses.
- `GET /api/enrollment/config` exposes only the public join-widget site key when
  the web flag is enabled. It never exposes the CAPTCHA secret or backend keys.
- `GET .../{invitationToken}` previews only sender name, expiry and consent version.
- `POST .../{invitationToken}`, action `begin`, accepts exactly `attemptId`, `email`,
  `consent`, `consentVersion`, `captchaToken`, and `intent:"join"`. The Edge service
  repeats validation. The durable request survives a dispatch-wakeup outage.
- POST action `verify` accepts only attempt UUID and six-digit code. Verification
  does not activate a contact. The browser shows pending approval and can refresh
  status through its private management capability.
- `GET .../{managementToken}` projects one state: `pending_email`,
  `pending_approval`, `approved`, `withdrawal_pending`, `withdrawn`, or `expired`.
  An undurable withdrawal must stay pending, including after reload; GET does not
  flush the journal, confirm consent, send email or withdraw anything.
- POST action `withdraw`, with JSON `{}`, requires explicit confirmation in the
  browser. It uses the journal-aware gateway. Pending journal failure offers retry,
  without claiming success or switching the retry into a consent action.
- Reload recovery uses a private URL fragment containing request UUID, management
  capability and expiry, never email or code. Fragments are not sent in HTTP
  requests; users must keep that page URL private. The browser uses no web storage. Re-entering the email with the saved request UUID can recover an
  uncertain initial request. A new code request uses a fresh UUID/CAPTCHA and must
  pass the server cooldown/hourly limits.
- Code delivery evidence contains only attempt/provider identifiers, correlation
  hash, timestamps and outcomes. It survives pending recipient purge/restore and
  is scheduled for deletion after seven days. Signed callbacks settle uncertain
  outcomes even after the recipient payload was purged. No callback requeues email.
- Health returns fixed join queue/unknown/callback problem codes and counts.
  Expired leases and deleting accounts do not starve unrelated queued recipients.

Configuration (all flags stay false in committed examples):

| Host | Required when enrollment is enabled |
| --- | --- |
| Edge | Existing database/destination/fingerprint/provider/journal credentials, `CONTACT_INVITATION_ORIGIN`, `CONTACT_TURNSTILE_SECRET`, `CONTACT_ENROLLMENT_ENABLED` |
| Web proxy | Same HTTPS `CONTACT_INVITATION_ORIGIN`, `CONTACT_ENROLLMENT_ENABLED`, public `CONTACT_TURNSTILE_SITE_KEY`, `SIGNALWORD_ENROLLMENT_ORIGIN` pointing to the public Edge function |
| Provider/hosting | Dedicated widget allowed hostname; email click/open tracking disabled for private links; capability paths excluded/redacted from analytics/error/access-log exports; current cron, webhook and journal health |

The browser contains no service-role key. Verify hosting-side logging/tracking and
real CAPTCHA/email callbacks in an isolated beta deployment before enabling the
coordinated rollout. Existing sender-entered enrollment is unchanged until then.

CAPTCHA implementation follows [Cloudflare server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/):
server-side token verification, hostname/action checks, bounded token age and
request-bound widget data. A fresh challenge has an independent validation retry
key; retrying the same challenge preserves its key. No recipient address, code,
invitation capability or remote-IP parameter is sent by the server to Siteverify.
