# Development backend deployment status

Updated: 28 September 2026 (Australia/Sydney).

## Scope

Only Supabase project `signalword-dev` (`voepalyamwgenceawdvl`, Sydney) was changed. No production Supabase resources were changed. The development viewer is currently served at `https://www.signalword.app`; that public domain does not make this a production-ready service.

## Completed and verified

- Confirmed CLI access and explicitly linked the development project.
- Checked the remote database before deployment: zero auth users and zero public application tables.
- Reviewed all 20 migrations and ran `supabase db push --dry-run`. Applied the 20 pending migrations successfully. No database reset or seed operation was performed.
- Deployed `user-api`, `public-event`, `contact-confirm`, `deletion-status`, `dispatch-deliveries`, and `resend-webhook`. Supabase lists all six as ACTIVE. ACTIVE indicates deployment status, not complete runtime configuration.
- Preserved per-function authentication settings: the user API retains gateway JWT verification; capability endpoints, the dispatch worker, and the signed webhook use application-level checks.
- Configured the development environment, Resend provider selection, `SignalWord <alerts@mail.signalword.app>` sender, and both public URL settings as `https://www.signalword.app`.
- Generated independent random payload-encryption, destination-encryption, destination-fingerprint, and dispatch keys. Uploaded them without printing their values; initial key versions are 1.
- Created both Vault entries: `signalword_backend_url` and `signalword_dispatch_secret`. The dispatch secret matches the worker configuration.
- Verified row-level security is enabled on all 12 application tables.
- All six hosted routing/header checks passed, including acknowledgement and contact withdrawal routes with unissued capabilities.
- Four local hosted-checker regressions passed. The checker now validates the contact proxy's distinct unavailable-link response instead of incorrectly requiring the event endpoint's response shape.
- Live rejection checks passed: user API without credentials returns 401; unissued event capability returns 404; missing deletion receipt returns 400; unissued deletion receipt returns `deleted: false`.

## Live integration verification

The user added `RESEND_API_KEY`; its presence was verified without revealing its value. An authenticated dispatch invocation then returned HTTP 200 with zero alerts or confirmations claimed, sent, or failed. This verifies worker startup and database access, not acceptance by Resend.

The user added `RESEND_WEBHOOK_SECRET` and enabled anonymous sign-ins; both settings were verified. A forged webhook was rejected with HTTP 401. After explicit recipient authorization, a dedicated development sender issued one contact-confirmation invitation. The outbox records it as delivered after one attempt, and genuine `sent` and `delivered` webhook receipts are present. The recipient confirmed on the hosted website, and the authenticated API returned `confirmed`.

One TEST alert, without location, was then created through the deployed API and reached `delivered`. Repeating its original idempotency key returned the same event with `reused: true`; recovery returned that event too. The recipient acknowledged through the hosted viewer; the sender API confirmed the acknowledgement. Resolution succeeded and its separate email reached `delivered`.

The dedicated TEST account was deleted through the authenticated API (HTTP 200). Its receipt confirmed deletion without an authenticated session, and the old session was rejected with 401. Aggregate checks found zero users, contacts, events, and viewer tokens, with one hashed deletion receipt remaining. Local test-session credentials were removed from the private state file. This is an API-driven development journey, not an iPhone trial or physical relaunch test.

Scheduled dispatch initially produced a timeout and HTTP 500 during incomplete setup and was paused. It was re-enabled after the live confirmation delivery and webhook reconciliation succeeded. Retention and lease recovery remain enabled. No REAL alert was created.

Two temporary anonymous identities were used to verify isolation: each read only its own profile; a cross-account profile RPC returned 403; a valid session reached the user API with 200; a token with an altered identity returned 401. These and the later security probe identity were deleted.

## Security fixes deployed after the TEST

- Migration `20260928010000_protect_contact_consent.sql` removes client permission to create contact records and caller-chosen confirmation hashes. The user API verifies the sender JWT, generates the capability and encrypted routing itself, and performs this one operation with its server-only credential. Other lifecycle calls retain the caller's JWT. Without this boundary a client could choose a known hash and attempt to self-confirm through the database API.
- The webhook reads a bounded byte stream instead of buffering the whole request before checking its size. This preserves exact signed bytes while limiting memory consumption for uploads without Content-Length.
- Regressions cover client-side consent minting, normal backend creation/recipient confirmation, injected owner IDs, missing backend credentials, rate limits, altered webhook bodies, stale/future signatures, and oversized streamed bodies.
- Verification: 96 Node tests, 43 viewer tests, 187 database assertions across nine suites, production viewer build, and Deno checks passed. No iOS code changed in this hardening pass.
- Hosted checks: a real anonymous client is denied direct contact creation (403); valid API profile access still succeeds (200); oversized webhooks return 413; unsigned webhooks return 401. All six viewer routing/header checks still pass. The new migration and updated user API/webhook are deployed only to development.

Public-launch work still required is tracked in [PUBLIC_LAUNCH_SECURITY.md](PUBLIC_LAUNCH_SECURITY.md).

There are **two Vault entries and three schedules**, not two scheduled jobs:

| Schedule | Current state |
| --- | --- |
| `signalword-dispatch-sweep` | Enabled; post-enable scheduled HTTP 200 observed with no timeout |
| `signalword-delivery-lease-recovery` | Enabled; successful execution observed |
| `signalword-hourly-retention` | Enabled; first scheduled success not yet observed |

The aggregate health RPC confirms Vault configuration, but that is not proof of provider configuration or successful delivery. Cron SQL success likewise does not establish a successful HTTP worker response.

## Next actions

1. Completed: the sending-only Resend key is stored as `RESEND_API_KEY` in the development project's Edge Function Secrets.
2. Completed: webhook secret present, forged signature rejected, genuine sent/delivered callbacks reconciled. Failure, bounce, complaint, and delayed-delivery scenarios still need live evidence.
3. Completed: hosted anonymous sign-ins enabled and valid anonymous sessions accepted by the deployed API.
4. Completed: scheduled HTTP 200, recipient confirmation, TEST delivery, idempotent retry, API recovery, recipient acknowledgement, resolution delivery, deletion, and receipt recovery. Repeat these checks with the signed iPhone app.
5. Repeat the flow through the signed iPhone app; HTTP probes do not establish device or locked-intent behavior.
6. Back up the generated keys from the private, Git-ignored `.env.signalword-dev.backend` file into your password manager. The file has owner-only permissions. Do not regenerate keys once encrypted records exist.
7. Complete the signed-device TEST journey with an explicitly consenting recipient. The current app requires iOS 18; the reported iPhone 13 Pro on iOS 17.6.1 cannot install this build. Apple signing/membership activation also remains to be confirmed. The recipient can initially use the Mac browser.

## Security evidence and limits

The Supabase security advisor completed without ERROR-level findings. It did report WARN-level executable SECURITY DEFINER functions, including intentional capability/ownership-checked application RPCs and the platform's `rls_auto_enable` helper. These warnings require documented review; a clean error exit is not a security certification. Basic authenticated profile isolation and live webhook verification now pass; exhaustive grant/ownership review remains outstanding.

Anonymous sign-in does not verify a person's identity. The `authenticated` role must always be combined with ownership checks; the public app key is not a user credential. The iOS client stores session credentials in device-only Keychain storage. Session loss can prevent recovery of an anonymous account; it must not silently attach the user to someone else's data.

Before public enrollment, implement CAPTCHA/Turnstile-compatible onboarding and verify signup, email, and per-user abuse limits with operational alerts. Do not merely enable CAPTCHA in the dashboard: the current iOS signup request does not supply a CAPTCHA token and would fail. Recipient consent and email confirmation do not establish the sender's real-world identity. See [Supabase anonymous sign-in guidance](https://supabase.com/docs/guides/auth/auth-anonymous).

Hosted routing checks use unissued links. The additional authorized TEST establishes one actual email/recipient/API lifecycle, including acknowledgement and deletion. It does not establish device recovery, locked execution, or population-wide reliability. Independent restore protection, production monitoring/crash reporting, and physical-device evidence remain release gates. This deployment does not complete Step 2 or establish a 97/100 score.
