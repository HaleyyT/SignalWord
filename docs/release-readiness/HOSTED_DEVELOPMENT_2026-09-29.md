# SignalWord development rollout — 29 September 2026

> **Operator evidence received:** screenshots confirm a non-TEST `UP | signalword-dev-operations` recovery email at 2026-09-29 03:18:45 +10:00, after eight minutes down. Operations recovery delivery passes. Separate monitor missed-heartbeat DOWN/UP receipt and duplicate suppression remain pending. Both screenshots show the same recovery event.

## Current hosted status — 29 September 2026

**NOT READY TO INSTALL. Manifest not frozen.** Development reopening is explicitly approved after verified reconciliation; quarantine remains the response to failed monitoring or inconsistent restore evidence. Public signup remains disabled.

- **Restore:** repair `4d293b1d089b75c33330af358d0b59b93bc4a83b` is deployed as migration `20261001030000`. Duplicate replay, matching receipt, allowed gate and requarantine were verified. No RLS/grant/quarantine protection was weakened.
- **Viewer:** `www.signalword.app` now points to development deployment `dpl_6yBdHva9Wak1oscXpxK4iwGb3uPN`. Both origins were explicitly set to Supabase `voepalyamwgenceawdvl`. JS/CSS match the tested candidate; all six public routing/header checks passed while open. No separate production backend was accessed.
- **Schedules:** all five enabled; each has recorded a successful run. Empty queues were verified. This is not proof of concurrent claiming under live traffic.
- **Monitoring:** found and fixed Cloudflare runtime rejection of `redirect: error`; manual redirects plus status checks preserve fail-closed behavior. Repair commit `2b4178c`; CI regression commit `273720d`. Cloudflare accepted both pings and automatically reported backend failure then recovery. Recipient receipt, suppression and missed-heartbeat notification evidence is still pending. The missed-heartbeat cron pause was exercised and the one-minute schedule restored (Worker `02ccd2f1-39f1-4f98-b278-4a797b7e3830`). Authority is now open after fresh duplicate replay and receipt verification: journal version 3, digest `2ae04c620114f050a03b65204a2ab72e757da4f1969f88e1a6a93010e04b0fe1`. Aggregate health returned HTTP 200 with no problems. No operator receipt is inferred from these ping results.
- **Auth/isolation:** signup disabled; missing/invalid CAPTCHA rejected with `captcha_failed`; invalid JWT rejected. Two controlled hosted identities passed own-profile API updates, cross-user REST denial and forged-owner rejection. Both were deleted through the actual durable journal/API, and independent deletion receipt recovery passed. Zero test accounts remain. These admin-provisioned identities do not prove successful anonymous Turnstile onboarding.
- **Provider:** unsigned callback rejection passed. User reports a fresh Resend `email.delivered` replay returned HTTP 202 Accepted. This is provider-dashboard evidence of signed callback acceptance, not a new email send. Six historical receipt records contain sent/delivered events; duplicate replay does not need a new receipt row.
- **Local verification:** 171 Node tests, 44 viewer tests, repository/security/contracts and viewer build passed. Real local workerd regression passed four request cases. No device tests rerun for this monitoring-only repair.

**Remaining hosted gates:** operator receipt and deduplication evidence, missed-heartbeat notification/recovery, positive human-completed Turnstile flow, broader contact/event HTTP isolation and concurrent delivery verification, full isolated restore drill, and final clean candidate manifest. No iPhone installation or public enrollment is authorized by these results.

## Initial provisioning history

The sections below preserve earlier observations. Their pending/approval statements are historical and are superseded by the current status above.

## Completed hosted work

- Development Supabase project: `voepalyamwgenceawdvl`. No production backend was accessed or changed.
- Confirmed zero users, contacts, events and pending deliveries before rollout. Private schema and data snapshots completed before migrations.
- New signups disabled for maintenance; existing Turnstile enforcement preserved. Missing CAPTCHA token returns `captcha_failed`.
- All 31 migrations through `20261001020000_journal_and_provider_health.sql` installed; the nine missing migrations passed the prior dry run and were reviewed before applying.
- All seven Edge Functions deployed from requested source. JWT policy preserved; health uses a separate scoped credential.
- Created private R2 bucket `signalword-dev-deletion-journal`. Enabled `journal-90-days` on `journal/` with 90-day retention. Initial write succeeded, overwrite returned HTTP 409, and the object remained byte-identical after a delete attempt. Wrangler misleadingly reported deletion complete; readback verified retention.
- Authority deployed on `https://authority-dev.signalword.app`, with separate reader/writer/admin credentials. Initial code deployment version `b5903b04-fa4d-4c7b-a796-67b8c1f80455`; secret updates create later versions.
- Authority rejects unauthenticated access, reader journal writes, writer admin access, invalid release proofs and out-of-coverage restores. One synthetic nonpersonal journal record was appended twice with the same sequence. Its subject is not a real account.
- Authority coverage began `2026-09-28T14:03:20.327Z`; never backdate it. It remains quarantined.
- Supabase Vault has all four required entries. Its URL and credential-shape checks passed without displaying values. The actual database HTTP client reaches the authority and receives quarantine HTTP 503.
- Monitor Worker `signalword-dev-monitor` deployed with its scoped credential and development backend origin. Its cron schedule remains disabled until destination secrets and O1 verification are ready. Initial code deployment version `b5453738-77a8-4ded-a95f-4867ebef138d`.
- Five database schedules exist. Dispatch, lease recovery and timer expiry are paused. Hourly retention and check-in retention remain active.
- Sender set to `alerts@mail.signalword.app`; public viewer/confirmation origins set to `https://www.signalword.app`; existing provider, webhook and encryption keys retained.
- Privileged delivery, contact, deletion, restore and operational RPCs deny direct anon/authenticated execution. Sensitive table RLS is enabled. Malformed JWT, unauthorized dispatch and unsigned provider callback probes are rejected.
- Preview deployed: https://signalword-hj4f5w8np-haleyyts-projects.vercel.app . Its JS and CSS match the exact candidate build byte-for-byte, verified through authenticated Vercel CLI. Preview protection remains enabled.
- The existing public viewer still differs from the requested candidate. Its alias has not been promoted.

## Hosted defect discovered

The service-role call to `reconcile_restore_journal` failed with SQLSTATE `21000`, `UPDATE requires a WHERE clause`. Hosted PostgREST loads `safeupdate`; previous ordinary local PostgreSQL tests did not. The transaction rolled back and quarantine stayed closed. No completion receipt or release is claimed.

The isolated repair adds migration `20261001030000_restore_safeupdate.sql`: only unrevoked viewer tokens are updated, and explicit non-null primary-key predicates identify confirmation tokens, sessions and refresh tokens to invalidate. It preserves existing revocation timestamps and all access grants. No safety setting is disabled. An explicit operator restore invocation still intentionally invalidates historical access.

`npm run test:db` now also runs the existing restore behavioral suite in a local session with the same `safeupdate` library enabled. A control assertion proves the guard is active. This reproduced the original failure before the repair and passes after it.

## Exact local verification for the proposed repair

- `npm run verify`: 168 Node tests, 44 viewer tests, repository/contract/security checks, TypeScript and Vite build passed.
- `SIGNALWORD_LOCAL_WORKDIR=/private/tmp/signalword-safeupdate-fixture npm run test:db`: 312 pgTAP assertions across 15 suites plus 17 hosted-safeupdate restore assertions passed.
- Focused authority/monitor/configuration/restore tests: 22 passed before the repair.
- Swift/device suites were not rerun for this SQL-only repair; app and viewer source files are unchanged. No physical-device or live delivery acceptance is claimed.

## Remaining gates and safe resume order

1. Approve replacement source `4d293b1...` before deploying its one additive migration. Exact requested source cannot pass hosted restore acceptance as-is.
2. Apply the replacement migration, repeat synthetic replay/idempotency and receipt verification, and test safe release/requarantine. Complete a separately isolated managed restore drill; current journal/API probes are not a PITR/RPO/RTO demonstration.
3. User enters `HEARTBEAT_URL` and `OPERATOR_WEBHOOK` as Secret values in Cloudflare → Workers & Pages → signalword-dev-monitor → Settings → Variables and Secrets. Never paste these URLs into chat. `MONITOR_SECRET` already exists.
4. Enable the monitor's one-minute cron only after checking destination names and intended operator notification routing. Run O1: synthetic incident, repeat suppression, recovery, missed heartbeat. Record receipt by the operator, not just HTTP success.
5. Verify positive signed Resend callbacks. Negative signature checks passed. The existing Vault dispatch credential was accepted by the matching Edge Function, which then returned `DISPATCH_FAILED` while quarantine blocked claims; no delivery occurred. Positive provider lifecycle remains pending. No live email or SMS was sent during this rollout.
6. Authenticated preview deep-link/header checks passed. All four public API probes returned the expected retryable HTTP 503 while quarantine remained active. The ordinary release check consequently did not pass (it requires unavailable-token 404/410); repeat after an approved restore repair and controlled reopening. Vercel's existing origins are Sensitive and export as empty strings. Old CLI attempts to update them were rejected without changes; do not infer they are empty or delete them. Verify routing behavior and use a supported update path if needed.
7. Public alias promotion requires explicit confirmation because automatic approval review rejected `vercel --prod` under the user's no-production instruction. The target is `signalword-dev` (`prj_geXTOHvZTeb456KDXMVouk1HO2bB`), but Vercel labels its public alias Production. Keep that distinction explicit.
8. Complete hosted cross-user behavioral isolation, Auth/Turnstile success, callback, schedule, operator and restore evidence. Maintain closed enrollment throughout.
9. Freeze the hosted manifest only after all compatibility gates pass. Then provide the exact signed-device installation instructions.

Credentials have an owner-only local recovery copy outside Git and outside Supabase at `~/Library/Application Support/SignalWord/DevelopmentDeployment/2026-09-29/`. Move them into the operator's password manager before relying on recovery. Do not include their contents in evidence.

## Tool limitations encountered

- Cloudflare authorization initially timed out; reauthorization succeeded.
- Cloudflare Workers onboarding was missing; the user initialized it and deployment succeeded.
- Python's default request identifier received Cloudflare 1010; the explicit SignalWord API identifier and the real database client reached the authority. No Cloudflare protections were disabled.
- Fetching an extra Cloudflare agent setup prompt was rejected by automatic approval review as untrusted instructions. It was not needed or executed.
- Public alias promotion was rejected by automatic approval review; a protected preview was deployed instead.


## Healthchecks replacement — 29 September 2026

Better Stack is no longer required for development monitoring. Implemented a two-check Healthchecks adapter, preserving legacy webhook behavior. Operations health is reported every tick; heartbeat reports whether operations reporting succeeded. Missing runs remain detectable by Healthchecks. Configuration faults and reused check URLs fail visibly. No private URLs or payloads are sent to logs.

Verified Cloudflare secret names: HEARTBEAT_URL, MONITOR_SECRET, OPERATIONS_PING_URL. Deployed only signalword-dev-monitor, version `d73b9a5b-10bc-4628-8c34-8af147a50832`, with cron disabled and development backend unchanged. This is a monitoring-only revision beyond original candidate 6e7c774, not a frozen whole-system manifest.

`npm run verify` passed: 169 Node tests, 44 viewer tests, repository/security/contract checks and viewer production build. Focused monitor tests passed 3/3. No database, app or recipient-delivery changes were deployed. O1 hosted notification receipt, deduplication, recovery and missing-heartbeat checks remain pending. Both checks share Healthchecks; this is not independent provider redundancy.


## Approved development rollout continuation — 29 September 2026

- Reviewed exact `6e7c774..4d293b1` diff: four files, additive restore predicates and regression runner only. RLS, grants, quarantine, API and mobile contracts are unchanged.
- Applied migration `20261001030000_restore_safeupdate.sql` after a dry run listing only that migration. Hosted replay returned 204 twice; receipt verification via `restore_receipt_matches` passed. Release returned allowed; requarantine returned denied. Direct receipt-table reads remained blocked by quarantine, as expected; no permission was widened.
- Vercel project metadata verified `signalword-dev`, ID `prj_geXTOHvZTeb456KDXMVouk1HO2bB`. Created deployment `dpl_6yBdHva9Wak1oscXpxK4iwGb3uPN` with both runtime origins explicitly pinned to development Supabase `voepalyamwgenceawdvl`. No private environment values were decrypted. Both JavaScript and CSS match tested candidate bytes.
- All six routing/header checks passed through authenticated Vercel access while temporarily reopened. Promoted only `www.signalword.app` under conditional approval; public alias assets match. Apex redirect was unchanged. Public-alias API checks after reopening remain pending.
- Auth settings confirm `disable_signup: true`. No accounts existed at checks. No recipient messages were sent.
- Monitor commit `dddbacc` deployed with one-minute cron, Worker version `42f0e9c1-a5fd-4e15-9d83-44c82324fe96`. Scheduled execution appeared in Cloudflare tail with outcome `ok`; this alone does not prove accepted Healthchecks pings. User reports both inboxes received DOWN test notifications. Actual automatic incident/dedup/recovery/missing-heartbeat acceptance is still pending. Duplicate email integration noted for removal.
- All five database schedules are enabled. A transaction refused activation if users, queued deliveries or active timers existed. Authority remains quarantined, so dispatch is still blocked. Permanent development reopening was rejected by automatic approval review pending explicit user approval; the rejected command did not execute.
- Vercel environment decryption was also rejected. Used metadata and explicit known development deployment overrides instead; no secret values were printed.

The manifest is NOT frozen. Positive signed provider callbacks, hosted user-isolation/Turnstile-success journeys, complete operator drill, full restore drill and final public-alias acceptance remain open. Do not install for signed-device acceptance yet. Test-email addresses are retained in the private conversation, not copied into public documentation.
