# Pilot candidate: repeatable verification and development rollout

Scope: invitation-only **email** pilot, contact escalation and check-in timers. SMS and professional monitoring remain unavailable. This document prepares commands; it does not authorize deployment, purchases or live messages.

## Reproduce local evidence without erasing existing databases

Use Node 22, the repository lockfile, Docker, Xcode with an installed iPhone simulator, and the pinned Supabase CLI. From the candidate checkout:

```bash
npm ci
npm run verify
node scripts/create-local-verification.mjs
```

The last command creates a new temporary project and prints its directory. It uses local ports 55420–55429 and never resets an existing project. If occupied, stop and choose another isolated configuration; do not reset the developer database. Set `SIGNALWORD_LOCAL_WORKDIR` to the printed directory for the following commands:

```bash
export SIGNALWORD_LOCAL_WORKDIR="/exact/printed/verification-directory"
npm run test:db
npm run test:restore
npm run test:integration
node scripts/test-contact-escalation-concurrency.mjs
node scripts/test-check-in-concurrency.mjs
swift test --package-path apps/ios
swift run --package-path apps/ios SignalWordCoreVerification
npm run test:ios:ui
npm run test:browser --workspace=@signalword/viewer
npm run test:signup:browser
npm run test:home:browser
npm audit --omit=dev --audit-level=high
```

Run database-mutating suites sequentially. The restore drill deliberately refuses occupied application tables. Own-record cleanup removes generated fixture records. Shared locks reject overlapping suites. If a run crashes and leaves records, create a fresh verification project for another restore drill instead of deleting unknown records. The integrated harness opens the actual React recipient page through a local proxy to the real API/database; acknowledgement and resolution are not stubbed. Install Playwright Chromium first with `npx playwright install chromium`, or set `SIGNALWORD_CHROME_PATH` to your installed Chrome executable. The integration harness generates and temporarily trusts a one-day TLS certificate **inside that local database container**; it restores the CA bundle in cleanup. If forcibly killed, stop that disposable project and recreate it before reuse. No remote certificate verification is disabled. Local SMTP and the programmable delivery adapter never send real email.

Type-check all seven function entrypoints with Deno, and build:

```bash
xcodebuild -project apps/ios/SignalWord.xcodeproj -scheme SignalWord \
  -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
npm run --silent release:manifest > /tmp/signalword-candidate-manifest.json
```

The manifest refuses an uncommitted candidate. It records source hashes for app, viewer, API, provider adapters, migrations, control service, contracts and verification tooling. App version/build are in `config/development.release.json`; all components must come from that commit. CI retains the manifest for 30 days; CI logs retain individual command results. A configured workflow is not evidence that this branch ran in GitHub Actions.

Local load envelope: 20–30 invited users; initial planning forecast is up to 10 simultaneous recipient reads and 5 concurrent retrying senders. The fixture tests twice those bursts (20 reads, 10 idempotent submissions), requires no duplicate incident and a local p95 below five seconds. This does **not** establish latency for concurrent new users, provider throughput, geographic/mobile latency or hosted availability. Measure those before increasing enrollment; retain the original ≤2-second alert-acceptance and ≤5-second provider-acceptance targets.

## Independent authority setup — engineer-owned, pending service activation

1. Confirm the Cloudflare account, ownership, region/privacy and cost decision. Create the dedicated R2 bucket named in `infrastructure/control/wrangler.jsonc`. Apply a **minimum 90-day retention lock** to the journal prefix; retain the authority's Durable Object separately from Supabase backups. Verify writes succeed and early deletion/overwrite is denied. No retention assertion may be checked merely because a bucket exists.
2. Assign a dedicated HTTPS hostname/route to the authority. `workers_dev` is disabled intentionally; the checked-in configuration has no production domain. Keep the reader, writer and administration secrets distinct, random and at least 32 characters. Set Worker secrets `READER_SECRET`, `WRITER_SECRET`, `ADMIN_SECRET`. Keep the admin secret in operator storage only, never Supabase, the viewer or the app.
3. Deploy the checked-in control Worker after approval. It starts quarantined. Confirm unauthenticated access is rejected and authenticated `/gate` denies normal processing.
4. Configure Edge secrets `SAFETY_CONTROL_URL`, `SAFETY_CONTROL_WRITER`, and Vault entries `signalword_control_url`, `signalword_control_reader`. Store recoverable copies outside the application database. Reader has no journal-write/release rights; writer has no release rights.
5. Retention is a lower bound: the current implementation does not automatically purge opaque authority records. Never prune coverage needed by a retained backup. Review storage and privacy retention periodically. Do not restore the authority itself from the application backup or reuse its namespace for another environment.
6. Rotate reader/writer in a controlled maintenance window: pause enrollment/dispatch, quarantine, update the Worker and corresponding Vault/Edge credential, verify denial of the old credential, then reconcile/reopen. Never disable the gate to avoid a rotation outage.

The gate adds an independent availability dependency with a two-second database deadline. Authority outage denies application traffic and claims. Alert commands stay pending on-device; server queues remain durable. Operator monitoring must distinguish authority outage from successful delivery. This tradeoff prevents an operator from accidentally making restored revoked data accessible.

## Ordered development rollout

Target only `voepalyamwgenceawdvl`. The viewer's Vercel environment may be named Production while still pointing at this development backend; that label is not permission to change another backend.

1. Identify current hosted commits/migrations, snapshot the development database and record the backup timestamp. Pause enrollment and scheduled dispatch for the maintenance window. Save configuration names and encrypted key version references without secret values. Drain pending journal writes before a planned restore. Do not destroy an existing database to deploy this candidate.
2. Provision and verify the independent authority above. Existing backups predating its coverage cannot be released by this workflow. Start coverage before the first eligible backup; a fresh empty development database can establish a new baseline after installation. Never invent or backdate coverage.
3. Set backend names listed by `scripts/release-manifest.mjs` and `.env.example`. Supabase-managed `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` stay inside Edge Functions. Use `APP_ENV=development`, `DELIVERY_PROVIDER=resend`, sender `alerts@mail.signalword.app`, public viewer/confirmation origins `https://www.signalword.app`. Preserve encryption keys and versions.
4. Link the **development** project, list migrations and dry-run. Inspect the changes before applying:

```bash
npx supabase link --project-ref voepalyamwgenceawdvl
npx supabase migration list
npx supabase db push --dry-run
# Only after inspecting the development diff:
npx supabase db push
```

Apply every missing repository migration in timestamp order, through `20261001030000_restore_safeupdate.sql`. The trust-boundary migration revokes unsafe grants; the restore migration configures PostgREST's pre-request gate and guards scheduled claims. Old functions can fail closed during this maintenance window. These migrations must not be rolled back to restore old permissions.

5. Deploy **all seven** matching functions, preserving `supabase/config.toml` authentication settings:

```bash
for function_name in user-api public-event contact-confirm deletion-status dispatch-deliveries resend-webhook operational-health
do
  npx supabase functions deploy "$function_name" --project-ref voepalyamwgenceawdvl || break
done
```

6. Configure Resend's signed callback to `https://voepalyamwgenceawdvl.supabase.co/functions/v1/resend-webhook` with `RESEND_WEBHOOK_SECRET`. Maintain the existing supported sent/delivered/bounced/complained/failed/delayed event subscriptions. Confirm invalid signatures are denied; a valid receipt stores before returning 202. Do not send a live test in this rollout without the session's consent and send decision.
7. Verify Vault `signalword_backend_url` and `signalword_dispatch_secret` match the development URL and Edge `DISPATCH_SECRET`. Verify all five schedules from the manifest. Keep dispatch paused until the restore/control release step succeeds; do not remove the gate.
8. Deploy the matching viewer with its two server-side proxy origins, public Turnstile site key and the existing rewrites/headers. No backend credential belongs in a `VITE_*` variable. Verify Auth's Turnstile configuration separately from Edge secrets.
9. Configure `operational-health` with `MONITOR_SECRET`; optional `MONITOR_PREVIOUS_SECRET` supports staged rotation. Provision the Cloudflare monitor, Healthchecks and private operator destination using `infrastructure/monitor/README.md`. External monitoring receives **only** the scoped monitor key, never a database service key.
10. For the empty initial baseline or an approved restore, complete the quarantine/replay/release procedure below. Restore operator credentials are not app runtime credentials.
11. Collect a private **name-only** inventory JSON: `projectRef`, arrays `backend`, `vault`, `schedules`, `functions`, `migrations` (full SQL filenames), and booleans `authority`, `monitor`, `heartbeat`, `captcha`, `webhook`, `journalRetention`. Set booleans only after their actual probes pass. Set `SIGNALWORD_RELEASE_INVENTORY` to its path; run `npm run release:configuration`. This validates the supplied inventory; it does not discover or authenticate hosted configuration for you.
12. Run `SIGNALWORD_VIEWER_ORIGIN=https://www.signalword.app npm run release:hosted`, operator notification/recovery/missed-heartbeat drills, and the guide's isolated hosted restore drill. Re-enable the approved schedules and verify health. Only then install the signed candidate and begin the controlled recipient session.

## Restore and safe reopening

1. Keep the destination isolated from public clients and outbound delivery. Post `/quarantine` to the independent authority with the real backup timestamp using its admin credential. Require success **before** restoring. Timestamps older than coverage, future timestamps, or backups older than 90 days are rejected.
2. Restore only the application database. Install the candidate gate and current credentials before exposing PostgREST. Do not import an obsolete authority URL/secret unreviewed from Vault. Test denial of viewer reads, old JWTs, new incident creation and worker claims while quarantined.
3. Reconcile every attempted/unknown provider send using signed callbacks or inspected provider records. The signed callback RPC is permitted during quarantine. Do not change unknown outcomes to failed merely to pass the gate; unknowns block release. Preserve provider idempotency history and do not resend outside its safe window.
4. Run the checked-in operator command with secrets loaded privately, not pasted into shell history:

```bash
node scripts/restore-release.mjs --reconcile-and-release-development
```

It reads `SAFETY_CONTROL_URL`, `SAFETY_CONTROL_ADMIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. It accepts only the named development backend. It reads/verifies the external snapshot, replays deletions and consent generations, cancels historical queued work/timers, revokes viewer/confirmation links, removes old sessions, verifies the database's matching receipt, then requests release against the same journal digest/version. Interrupted or stale operations leave quarantine in place; rerun after investigation. A previously attempted queued delivery becomes unknown and blocks replay until reconciled. No claim is made that a provider-accepted message can be retracted.
5. Verify deleted subjects remain denied and a newly authenticated consenting test account can operate. Capture the restore duration, actual backup age, provider reconciliation and revoked-access checks. Local account dump/replay is not a managed PITR/RPO/RTO test; prove ≤15-minute RPO and ≤60-minute RTO in the hosted drill.

## Failure and rollback procedure

If migration, function deployment, control checks or provider reconciliation fails: retain quarantine/enrollment pause, preserve logs with only safe codes, diagnose and **roll forward** to a repaired compatible backend. Never re-grant a client delivery-creation RPC, delete a migration or reset the database to make an old server work. An older mobile client keeps the documented v1 HTTP contract; an older insecure backend is not a valid rollback target. A viewer rollback is allowed only to a candidate whose contract/header tests pass against the installed backend. The local suite rehearses refused incompatible configurations, old HTTP contracts, stale release proofs and replay recovery; an actual hosted rollout/rollback remains guide O3 evidence.

## Operator meanings and retention

- Queue older than 60 seconds, more than 100 queued items, expired leases: processing delay/backlog, **not** proof of recipient delivery failure.
- Unknown outcome: provider acceptance might have occurred; reconcile before retry.
- Missing callback after two minutes / delivery report after fifteen minutes: inspect the provider and signed callback path. No read or rescue claim.
- Journal pending over 60 seconds: deletion/withdrawal durability needs attention; do not report deletion complete.
- Dispatch/lease/timer schedules older than three minutes; retention schedules older than 75 minutes; future timestamps: investigate stopped jobs or clock skew.
- Signup >100/hour or invitations >200/hour: pilot abuse threshold, not proof of malicious intent. Tighten through measured pilot policy without breaking retries/resolution.
- Monitor stores only its last reported fixed-code state. Notifications repeat after transport failure, suppress unchanged successful incidents, and emit recovery. Configure a one-minute Healthchecks period with two-minute grace so a dead monitor is detected independently.
- Database maintenance already prunes operational schedule/HTTP logs; verify its jobs and the existing retention SQL during hosted rollout. Configure host/incident retention separately. No capability URLs, contacts, exact coordinates, bodies or phrases belong in logs or evidence.
