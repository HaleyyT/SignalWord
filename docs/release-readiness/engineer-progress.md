# SignalWord: engineering progress and candidate handoff

Updated 29 September 2026. **NOT READY TO INSTALL OR RELEASE. The hosted manifest is not frozen.**

Branch: `feat/hosted-restore-compatibility`. Latest repair code: **`148dbf48ea2f484f3f8fa6c702bb7ba48a2f20e0`** (native source unchanged from `421f3c5`), app **1.0 (2)**. Documentation commits after this code revision do not authorize installation. No merge, push, public enrollment or separate production deployment was performed. Development viewer and delivery-function repairs were deployed as recorded below.

## Latest continuation — three-recipient development TEST

[All retained samples and redacted results](HOSTED_ABC_EVIDENCE_2026-09-29.json). The controlled sender and all test data have now been deleted through the application; deletion receipt returned 200. Final readback: **zero users, contacts and deliveries**, authority allowed, journal version **13**, aggregate health clear. Earlier final-state paragraphs below are historical snapshots.

- All three initial TEST and three resolution deliveries reached `delivered`, one attempt each, with 12 matching signed sent/delivered callbacks. The connected inbox received the repaired **TEST — NO EMERGENCY** resolution subject and wording.
- B acknowledgement was idempotent and only one recipient was acknowledged in the recorded database snapshot. A/C public-view acknowledgement isolation and delayed-routing acceptance remain incomplete.
- B withdrawal preserved A/C confirmed status. Its revoked GET first returned 503, then GET/POST returned 404 NOT_FOUND. Access was denied, but the helper expecting 410 failed. This response consistency and initial latency require investigation; no protection was relaxed.
- Ten same-command retries all returned the same incident (p95 2,332 ms); 20 B reads passed (p95 2,643 ms). These are one-sender samples, not the full ten-distinct-sender envelope. The original submission burst included a 503 and the old helper failed before retaining every sample; that run is explicitly incomplete. The new recorder persists every completed request before judging success, including errors.
- Migration `20261001040000_confirmation_retry.sql` makes an unexpired completed consent retry return success without granting consent twice. Withdrawal races remain safe. It was the sole migration in the development dry run and was applied. No grant/RLS/quarantine or mobile contract changed. The original hosted token expired before retest (410), so positive hosted retry still needs a fresh invitation.
- Local integration initially failed because a minimal fixture config reported another local project's API port. The harness now checks the actual gateway mapping before creating identities. The corrected full journey passed, and the two exact disposable local identities were removed. No hosted identity was created by this fixture error.

Latest checks: `npm run verify` **175 Node + 44 viewer**, security/contracts/build; `npm run test:db` **315 database + 17 safeupdate assertions**; contact concurrency **7 races**; `npm run test:integration` full journey **PASS** (20 reads p95 167 ms, ten duplicates p95 130 ms). Native code did not change; prior native results are not new physical evidence.

**Progress remains local 21/21 (100%), hosted 11/17 (65%), physical 0/12 (0%), pilot 1/6 (17%).** Partial proof does not close an entire gate. Open gates: **H04 human Turnstile, H08 managed restore, H10 full recipient isolation/routing, H11 full provider recovery, H16 full load, H17 manifest freeze**.

[Hosted acceptance setup](HOSTED_ACCEPTANCE_SETUP.md) specifies the backup quote and approval boundary, restore isolation, Sentry privacy/retention, human Turnstile session and staged load requirements. Estimated managed source baseline is **US$130/month**, approximately **US$145/month with a retained Small restore target**, before tax/overages and subject to dashboard quote. No upgrade was made. No iPhone installation is authorized.

## Latest controlled hosted journey and repairs

The [redacted journey evidence](HOSTED_TEST_JOURNEY_2026-09-29.json) records a real approved-inbox confirmation → TEST → acknowledgement → sender recovery → resolution → durable deletion journey through the development HTTP endpoints. Ten concurrent identical alert submissions created **one incident**, p95 **1,043 ms**. Initial and resolution emails each had **one attempt**, both became **delivered**, and four real signed sent/delivered receipts were matched. This used a synthetic sender and one actual consenting inbox; it does not prove the full three-recipient or physical-device journey.

Resend dashboard replays of a delivered event and its earlier sent event each returned **202**, with attempt counts increasing from one to two. They concerned an already deleted consent fixture; no users, contacts or deliveries were resurrected. This does not prove active-incident terminal ordering or ambiguous-send recovery.

Two defects were reproduced and repaired:

- `bd1709c`: an uncertain withdrawal used the confirmation retry button and falsely asserted nothing was recorded. The page now remembers the action, explains uncertainty, and retries withdrawal. The browser regression failed before the repair and passes locally and against the deployed viewer with mocked responses.
- `14e1c9c`: TEST resolution messages used an unlabelled resolution subject. Subject, plain text and HTML now retain **TEST — NO EMERGENCY**. The regression failed first and passes. The development dispatch function is now version **10**; receipt of the newly worded email remains an explicit live retest.
- `9ba3692`: viewer deployment uploads exclude native build artifacts; local Vercel state is ignored by Git.

The first withdrawal returned retryable **503**; a direct retry and repeated proxy retry returned **200**. Its initial backend latency/failure cause remains unproven. No timeout, journal, RLS or security rule was relaxed. Both synthetic accounts were deleted through the application, with completion receipts verified and zero users/contacts/deliveries remaining.

The initial 20-reader hosted burst had p95 **5,008 ms**, slightly over its 5,000 ms budget. Three repeat bursts measured **2,311 / 2,506 / 1,848 ms**. All succeeded, but H16 remains partial: do not discard the slower sample or equate one capability with population-wide capacity.

The repaired viewer is `dpl_B4mdNxwtHNhJ7e6TnPyiyGJX1rzT` on **www.signalword.app**, with both proxy origins explicitly pinned to the approved development backend. Six hosted routing/header checks and the deployed browser regression pass. The direct deployment URL is protected; unauthenticated preflight against it failed for that reason, before authenticated verification and alias checks succeeded. Other aliases were not promoted in this repair.

Verification after repairs: **173 Node/API tests, 44 viewer tests**, security/contracts/build checks, local and hosted-asset browser regression, dispatch Deno typecheck, and an **unsigned iPhoneOS Release build** on Xcode 27.0 pass. The build is compilation evidence only: it has no signing or final runtime configuration and must not be installed.

## Earlier engineering repairs

1. **Restore administration now pins both development destinations.** Previously the operator command rejected a different Supabase project but accepted any HTTPS authority host. That could send the authority credential to an unintended host. Commit `292d168` rejects a different authority, path, credentials, query or fragment before transmitting credentials. The regression first reproduced the gap and now passes. RLS, grants, quarantine and mobile/API contracts are unchanged.
2. **The real crash SDK now compiles and is tested.** Sentry 9.29.0 downloaded successfully. Its macOS test target exposed UIKit-only options; commit `421f3c5` guards those options with `canImport(UIKit)`, retaining their explicit privacy restrictions in the iOS app. The actual serialized-event privacy test, SDK-linked Release build and all eight UI journeys pass. A separate CI job now exercises this path instead of relying on the SDK-unavailable fallback. Reporting remains disabled; no DSN or crash telemetry was transmitted.
3. **Verification was repeated from clean dependencies and a new isolated database.** Existing developer databases and unrelated checkout changes were preserved. Missing Playwright Chromium initially stopped browser tests; installation and reruns passed. The local integration uses a fake delivery provider and sends no real messages.
4. **Hosted evidence was corrected.** A short cron pause did not actually stop Healthchecks pings. It cannot establish missed-heartbeat notification delivery. The monitoring report records the actual drill separately from manual TEST email and operations recovery receipt. The Supabase dashboard also confirms the Free plan has no managed backups, so a destructive managed restore was not attempted.

## Progress: completed checkpoints, not reliability estimates

The percentages below count the explicit checkpoints in this handoff. A partial result counts as incomplete. Local tests do not substitute for hosted or device results. See the hosted report for its item-by-item register.

- **Local verification: 21/21 (100%)** in [retained local evidence](LOCAL_EVIDENCE_2026-09-29.json). This is completion of this local verification set, not all release engineering.
- **Hosted development: 11/17 (65%)**; use the current acceptance register in [hosted report](HOSTED_DEVELOPMENT_2026-09-29.md); unresolved hosted gates prevent candidate freeze.
- **Physical acceptance: 0/12 (0%)**: signing/install; setup/consent; manual TEST; locked TEST; three-contact immediate routing; delayed escalation; acknowledgement semantics; offline/relaunch; timer controls/expiry; resolve/withdraw; interrupted deletion; accessibility/crash evidence.
- **Pilot readiness: 1/6 (17%)**: local regression complete; hosted acceptance, physical acceptance, operator/restore acceptance, invited observation period and final release review are incomplete.

## Exact local results

All commands and counts are retained in [LOCAL_EVIDENCE_2026-09-29.json](LOCAL_EVIDENCE_2026-09-29.json). Temporary diagnostic logs are `/tmp/signalword-overnight-*.log`; those paths are not a durable evidence store.

| Verification | Result |
|---|---|
| Clean `npm ci`; `npm run verify` | 173 Node tests, 44 viewer tests (latest repair rerun), repository/security/contracts checks and production viewer build pass |
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

Only Supabase `voepalyamwgenceawdvl`, authority `https://authority-dev.signalword.app`, Vercel `signalword-dev` and viewer `https://www.signalword.app` are in scope. Public signup remains disabled. All 33 migrations through `20261001040000` and seven functions are installed. Detailed versions, latest authority state and monitoring evidence are in the [hosted report](HOSTED_DEVELOPMENT_2026-09-29.md).

Remaining gates include:

- A genuine human Turnstile success flow with controlled enrollment; missing and invalid proofs already fail. Do not enable public signup to manufacture this result.
- Full hosted recipient consent/capability isolation and provider lifecycle/retry tests, plus the complete declared hosted alert/recipient load envelope. The live one-recipient journey and measured retry/read bursts above strengthen these gates but do not complete their full scope.
- Monitoring acceptance now passes for the connected operator inbox; verify the second destination separately if both are required by your operator policy.
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

**Smallest next user actions:** finish Apple membership activation; arrange a short human Turnstile/recipient acceptance session; decide whether to provision the managed backup tier and development Sentry project. No new secret values should be posted in chat. Engineering must finish hosted acceptance and freeze the compatible manifest before asking you to install.

## Final development state

At 04:58 Sydney, development was open, monitor scheduling restored, and aggregate health clear. Journal version 9 reflects the two controlled fixtures’ withdrawal/deletion records. Deleted controlled identities are denied; no accounts or work remain. The monitor genuinely transitioned DOWN at 03:55 and UP at 03:57. Those non-TEST receipts are now verified in the connected operator inbox, together with operations suppression and reporting-failure recovery. Monitoring gates H13–H15 pass. Exact deployed versions and current journal digest are in the hosted report.

## Additional blocker retry

A focused retry closed **three hosted gates**, raising hosted checklist completion from 8/17 to 11/17. Gmail receipt evidence establishes operations incident/suppression/recovery, missing-heartbeat notification and an explicit reporting-failure notification. The original committed monitor was restored as `ac57442a-4291-43bc-abcf-375975c0ab7f`; development is open and healthy, signup disabled.

Commit `1949846` adds `scripts/hosted-contact-proof.sql`. Its 23 deployed database checks passed without sending messages or retaining fixtures. It is deliberately not credited as the full HTTP/recipient acceptance gate. `npm run check` and whitespace checks pass; no application runtime changed, so the previously completed full local suite remains applicable. The final manifest remains unfrozen.
