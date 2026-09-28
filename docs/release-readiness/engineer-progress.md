# SignalWord: engineering progress and candidate handoff

Updated 29 September 2026. **NOT READY TO INSTALL OR RELEASE. The hosted manifest is not frozen.**

Branch: `feat/hosted-restore-compatibility`. Latest tested application/tooling code: **`421f3c5b4c54bf6d5a13da62e7383a15e9fb8fac`**, app **1.0 (2)**. Documentation commits after this code revision do not authorize installation. No merge, push, public enrollment or production deployment was performed.

## What changed and why

1. **Restore administration now pins both development destinations.** Previously the operator command rejected a different Supabase project but accepted any HTTPS authority host. That could send the authority credential to an unintended host. Commit `292d168` rejects a different authority, path, credentials, query or fragment before transmitting credentials. The regression first reproduced the gap and now passes. RLS, grants, quarantine and mobile/API contracts are unchanged.
2. **The real crash SDK now compiles and is tested.** Sentry 9.29.0 downloaded successfully. Its macOS test target exposed UIKit-only options; commit `421f3c5` guards those options with `canImport(UIKit)`, retaining their explicit privacy restrictions in the iOS app. The actual serialized-event privacy test, SDK-linked Release build and all eight UI journeys pass. A separate CI job now exercises this path instead of relying on the SDK-unavailable fallback. Reporting remains disabled; no DSN or crash telemetry was transmitted.
3. **Verification was repeated from clean dependencies and a new isolated database.** Existing developer databases and unrelated checkout changes were preserved. Missing Playwright Chromium initially stopped browser tests; installation and reruns passed. The local integration uses a fake delivery provider and sends no real messages.
4. **Hosted evidence was corrected.** A short cron pause did not actually stop Healthchecks pings. It cannot establish missed-heartbeat notification delivery. The monitoring report records the actual drill separately from manual TEST email and operations recovery receipt. The Supabase dashboard also confirms the Free plan has no managed backups, so a destructive managed restore was not attempted.

## Progress: completed checkpoints, not reliability estimates

The percentages below count the explicit checkpoints in this handoff. A partial result counts as incomplete. Local tests do not substitute for hosted or device results. See the hosted report for its item-by-item register.

- **Local verification: 21/21 (100%)** in [retained local evidence](LOCAL_EVIDENCE_2026-09-29.json). This is completion of this local verification set, not all release engineering.
- **Hosted development: 8/17 (47%)**; use the current acceptance register in [hosted report](HOSTED_DEVELOPMENT_2026-09-29.md); unresolved hosted gates prevent candidate freeze.
- **Physical acceptance: 0/12 (0%)**: signing/install; setup/consent; manual TEST; locked TEST; three-contact immediate routing; delayed escalation; acknowledgement semantics; offline/relaunch; timer controls/expiry; resolve/withdraw; interrupted deletion; accessibility/crash evidence.
- **Pilot readiness: 1/6 (17%)**: local regression complete; hosted acceptance, physical acceptance, operator/restore acceptance, invited observation period and final release review are incomplete.

## Exact local results

All commands and counts are retained in [LOCAL_EVIDENCE_2026-09-29.json](LOCAL_EVIDENCE_2026-09-29.json). Temporary diagnostic logs are `/tmp/signalword-overnight-*.log`; those paths are not a durable evidence store.

| Verification | Result |
|---|---|
| Clean `npm ci`; `npm run verify` | 172 Node tests, 44 viewer tests, repository/security/contracts checks and production viewer build pass |
| `npm run test:db` | 312 pgTAP assertions in 15 suites, plus 17 safeupdate assertions pass |
| `npm run test:restore` | Local database dump/restore, quarantine, archive outage/restart, duplicate replay and deleted-access denial pass |
| `npm run test:integration` | Real local Auth/API/database/React journey with fake provider; three contacts, retries, ambiguous response, signed/duplicate/out-of-order callbacks, escalation, withdrawal, timers, resolution and deletion pass |
| Local burst | 20 recipient reads: p95 104 ms; 10 duplicate submissions: p95 179 ms. Local capacity only |
| Contact and timer concurrency | Five contact/worker races and three timer races pass |
| Swift core and package | 36 core tests and core executable verification pass; fallback test passes without SDK |
| Actual Sentry serialization | 36 core + one actual serializer privacy test pass with `SIGNALWORD_WITH_SENTRY=1` |
| Release simulator build | Both SDK-disabled and SDK-linked builds pass |
| Simulator application journeys | 8 pass, 0 fail, 0 skip in each SDK mode; iPhone 18 Pro/iOS 27.0 simulator |
| Viewer/signup/home browser scripts | All three pass; narrow layout, keyboard, light/dark and home widths 320/768/1440 |
| Cloudflare runtime regression | Four actual workerd request cases pass |
| Deno | All seven Edge Function entrypoints pass type checking |
| Local release preflight | Six checks pass |
| Dependency audit | No production dependency vulnerabilities reported |
| Local Gitleaks | 3.62 MB committed patch stream, no leaks found; redacted output. No private ignored files scanned |

The SDK-enabled result bundle confirms eight passing tests, no skips and no runtime warnings. This is not a signed-iPhone crash or locked-execution result. The new CI job is committed but has not run remotely because this branch was not pushed.

## Hosted scope and remaining work

Only Supabase `voepalyamwgenceawdvl`, authority `https://authority-dev.signalword.app`, Vercel `signalword-dev` and viewer `https://www.signalword.app` are in scope. Public signup remains disabled. All 32 migrations through `20261001030000` and seven functions are installed. Detailed versions, latest authority state and monitoring evidence are in the [hosted report](HOSTED_DEVELOPMENT_2026-09-29.md).

Remaining gates include:

- A genuine human Turnstile success flow with controlled enrollment; missing and invalid proofs already fail. Do not enable public signup to manufacture this result.
- Full hosted recipient consent/capability isolation and provider lifecycle/retry tests, plus the complete declared hosted alert/recipient load envelope. A valid profile-read burst alone is not alert throughput.
- Complete automatic operations/reporting/missed-heartbeat notification evidence, including actual receipt and suppression.
- A supported managed backup/restore environment. The current Free plan has no managed backups. A local dump/restore and hosted journal replay do not establish managed RPO ≤15 minutes/RTO ≤60 minutes.
- Development Sentry provisioning, privacy/retention and symbols; signed-device crash/relaunch evidence.
- Apple membership activation, verified paid Team ID and provisioning, physical acceptance and pilot observation.

## Device configuration and next steps

Open `apps/ios/SignalWord.xcodeproj`, scheme `SignalWord`, only after installation readiness is issued. Bundle ID `com.signalword.app`; App Group `group.com.signalword.shared`; minimum iOS 18.0. The repository leaves `DEVELOPMENT_TEAM` blank. Engineering must verify your activated enrolled team and its App Group/device provisioning; do not invent a Team ID or replace identifiers with Personal Team alternatives.

Development API: `https://voepalyamwgenceawdvl.supabase.co/functions/v1/user-api`.
Supabase URL: `https://voepalyamwgenceawdvl.supabase.co`.
Viewer: `https://www.signalword.app`.
Public Turnstile site key: `0x4AAAAAAFFb3ETKlwBxFCNF`.
Use only the matching development publishable client key in the app. Private service, writer, monitor, webhook and encryption keys remain server-side.

The [physical-device guide](PHYSICAL_DEVICE_TEST_GUIDE.md) retains installation instructions, expected screen states, failure evidence, ordered TEST/contact/timer/recovery trials and cleanup. Timer expiry creates REAL-labelled incidents and requires a separately agreed awake session. SMS and professional monitoring remain unavailable.

**Smallest next user actions:** finish Apple membership activation; arrange a short human Turnstile/notification acceptance session; decide whether to provision the managed backup tier and development Sentry project. No new secret values should be posted in chat. Engineering must finish hosted acceptance and freeze the compatible manifest before asking you to install.

## Final development state

At 04:00 Sydney, development was open after checked-in reconciliation, monitor scheduling restored, and aggregate health clear. Deleted controlled identities are denied; no accounts or work remain. The monitor genuinely transitioned DOWN at 03:55 and UP at 03:57. Confirm those two non-TEST notifications in the operator inboxes when awake; do not count earlier manual TEST messages. The complete monitoring receipt/suppression gate remains open. Exact deployed versions and current journal digest are in the hosted report.
