# SignalWord: engineering progress and candidate handoff

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

See [rollout details](HOSTED_DEVELOPMENT_2026-09-29.md), [monitoring setup](MONITORING_SETUP.md), and [device guide](PHYSICAL_DEVICE_TEST_GUIDE.md).

## Historical local baseline — 28 September 2026

The following original local assessment concerns app 1.0 (2), base source `6e7c774`. Current hosted results and repairs above supersede its deployment status.

## Decision

The email-pilot code candidate is ready for **controlled hosted development verification**, once its independent authority/monitoring services are provisioned. It is **not yet ready for public launch or signed-device acceptance against the existing hosted deployment**. Do not install against an unidentified older backend, apply the restore migration alone, or enable SMS.

Independent engineering continued while Apple membership remained pending. The repository's Bundle ID and App Group were inspected, not changed. The [physical-device testing guide](PHYSICAL_DEVICE_TEST_GUIDE.md) records all setup blockers, the exact project/configuration, installation checks and ordered physical cases. The [release runbook](../implementation/pilot-hardening/RELEASE_RUNBOOK.md) provides local reproduction, development rollout, restore and rollback procedures.

## What changed, why and how

1. **Deletion now waits for independently durable evidence.** A transactional privacy outbox records opaque account/contact identifiers and consent generations. The backend sends those records to a separate Cloudflare authority and immutable R2 journal. Only durable journal acknowledgements allow account removal and a completion receipt. Interrupted requests resume without claiming premature success. No recipient address, capability or location enters that journal.
2. **Restored databases cannot automatically resume normal processing.** An external quarantine gates PostgREST and scheduled claims. Replay removes deleted identities, respects withdrawal generations, revokes historical links/sessions and cancels old timer/queued work. Attempted sends with unknown outcomes block release until provider reconciliation. The operator tool verifies the matching database receipt and current external digest before reopening. Missing credentials, archives or coverage fail closed.
3. **Failure states are observable without exposing private data.** Aggregate health adds journal age/backlog, callback lag and delivery-report lag. Existing scoped operational credentials, monitor deduplication/recovery and independent heartbeat checks remain in use. Logging and best-effort wakeup failures cannot turn an accepted alert into an API failure. Native Sentry remains isolated and disabled pending its separately verified SDK build.
4. **Contracts and release identity are explicit.** Inventories cover 19 authenticated method/path combinations and 13 system operations. Shared fixtures exercise success, invalid input and authorization; runtime validators filter responses. A release manifest hashes candidate sources and migrations. Preflight rejects wrong projects, missing migration/function/secret names, lost v1 compatibility and unverified service setup. A signed-app verifier checks the actual product's team/profile, identifiers, version and development configuration.
5. **The integrated regression uses real local services.** Local Supabase Auth, API handlers, PostgREST, Postgres, encryption, workers and the actual React recipient page run together. Only the delivery provider and independently hosted storage are programmable fixtures. The browser actually acknowledges through the API and observes resolution. Provider rejection, retry, lost responses, signed duplicate/out-of-order callbacks, three-contact routing, withdrawal, timer expiry and durable deletion are exercised without real messages.
6. **Accessibility recovery was repaired.** Onboarding reused its previous scroll position, hiding the next step's fields at the largest text size. Each step now starts at its heading. Eight simulator journeys cover setup, contacts, timers, relaunch, resolution, withdrawal, deletion and accessible triggering. Privacy copy now explains durable deletion and opaque recovery records. Existing visual design was preserved.
7. **Verification no longer needs destructive resets.** A helper creates a separate local project and replays all migrations. Existing developer databases stay untouched. Shared locks reject overlapping database suites; cleanup removes only generated fixture records.

## Completion matrix

These counts track named acceptance items, not test count, probability of safety, or a quality score.

| Milestone | Completed engineering items | Evidence and remaining distinction |
|---|---:|---|
| A — Trust boundary | **5/5** | Service-only writes; caller ownership/session check; legacy grant/RLS regressions; 32-operation inventory with contract tests; invitation/public-link budgets and v1/v2 tests. Hosted abuse/CAPTCHA enforcement remains a separate gate. |
| B — Observability | **5/6** | Scoped rotating health credential; scheduled monitor/heartbeat; queue/schedule/timer/journal/provider signals; notification/failure/recovery tests; privacy-safe logging and nonblocking telemetry. **SDK-enabled native crash collection is not complete.** The permitted safe adapter fallback is implemented, but it is not crash evidence. |
| C — Deletion/restore | **7/7 locally** | Independent journal protocol; consent generations; resumable deletion; response-loss recovery; external quarantine; replay/unknown-outcome gate; coverage/digest/receipt enforcement. Local account dump/restore and SQL consent/provider regressions pass. Cloudflare retention and managed full restore are not yet verified. |
| D — Repeatable release | **6/6 locally** | Manifest; environment inventory preflight; real local browser/API/provider-fault journey; CI migration/race/harness wiring; rollback/roll-forward runbook and failed-proof/config tests; declared 2× local pilot burst. Hosted rollout and production-scale capacity remain unproven. |
| E — Usability/recovery | **6/6 locally** | Contact/timer journeys; honest state meanings; draft/relaunch retention; accessible trigger; largest-text repair and narrow/keyboard browser checks; complete physical acceptance instructions. VoiceOver, actual locked activation and signed-device failures remain physical evidence. |

**Full original engineering matrix: 29/30 = 96.7%.** Of the 29 items currently executable with available dependencies, **29/29 local items pass**. This is not a 96.7/100 product score. Native crash integration still requires a checksum-verified SDK-enabled build and actual privacy test execution; the artifact acquisition problem is isolated rather than bypassed.

| Acceptance track | Passed / total | Progress | Definition |
|---|---:|---:|---|
| Locally executable engineering | 29/29 | 100% | Named local items above; SDK-enabled collection excluded explicitly. |
| Hosted development candidate | 0/7 | 0% | Matching deployment, authority retention, CAPTCHA/isolation, live consent/delivery callbacks, operator notification/heartbeat, hosted restore/rollback, hosted load/security. Previous live work is not evidence for this new candidate. |
| First physical acceptance groups | 0/10 | 0% | Signed install, authentication, manual TEST, locked/restart TEST, three-contact routing, offline recovery, timers, withdrawal, deletion, accessibility/cleanup. Preparation statements do not count as completed trials. |
| Pilot readiness gates | 1/6 | 16.7% | Local email candidate passes; hosted path, physical path, operational/crash/restore acceptance, usability/reliability observation, release decision are pending. This is gate completion, not time remaining. |

No ≥95/100 engineering or product quality award is made. Correctness/recovery/security/verification have substantial local evidence; usability lacks observed device results; operability lacks hosted drills and native crash evidence. Scoring those as excellent already would conceal the remaining gaps.

## Exact verification

All results below are for the candidate's source content, on this Mac. GitHub Actions is configured but was not run remotely in this work.

| Command / suite | Result | Evidence boundary |
|---|---|---|
| `npm ci` | Pass; 59 packages installed; audit reports 0 vulnerabilities | Exact lockfile; dependency audit is not a penetration test. |
| `npm run verify` | **168 Node/API tests; 44 viewer tests; security/contracts and production viewer build pass** | Includes source checks as well as behavior; not all 168 are runtime journeys. |
| `npm run test:db` | **312 pgTAP assertions, 15 suites** | Fresh isolated project; RLS, grants, old/new RPC behavior, consent, timer, restore receipt and unknown outcome cases. |
| `npm run test:restore` | Pass | Real local account `pg_dump`/restore and database HTTP quarantine; archive outage/restart, duplicate replay and deleted-identity denial. Authority storage is a fixture; not a full managed PITR drill. |
| `npm run test:integration` | Pass | Real local Auth/API/database/React browser; three contacts, signed callbacks, ambiguity, escalation, timer expiry, withdrawal, resolution, deletion. Fake email adapter sends nothing. |
| Integrated local burst | **20 viewer requests: 99 ms p95; 10 duplicate submissions: 98 ms p95** | Twice the explicitly declared pilot burst; local machine only, not concurrent new-account/provider throughput. |
| Contact/timer concurrency scripts | **8 race scenarios pass** | Five contact/worker/acknowledgement/resolution/withdrawal; three cancel/extend/expiry. |
| `swift test --package-path apps/ios` | **36 core tests + 1 SDK-unavailable fallback test pass** | The fallback test does not execute the Sentry serialization/privacy test. |
| Swift core verification | Pass | Core state behavior. |
| Release simulator build | Pass, unsigned | No Apple membership or device provisioning involved. |
| `npm run test:ios:ui` | **8 pass, 0 failures, 0 skipped** | iPhone 18 Pro simulator, iOS 27.0; controlled native services. Not your iPhone 13 Pro/iOS 26.7. |
| Viewer/signup/home browser scripts | **3 suites pass** | 320px viewer/signup; home 320/768/1440, keyboard and light/dark. These standalone suites use fixtures; the integrated React journey additionally uses real local API/database. |
| Deno check | **7 entrypoints pass** | user-api, public-event, contact-confirm, deletion-status, dispatch-deliveries, resend-webhook, operational-health. |
| `npm audit --omit=dev --audit-level=high` | **0 vulnerabilities** | Advisory lookup, not complete security assurance. |
| Local `release:preflight` | Pass: all six local preflight checks | Repository, syntax/toolchain, isolated database and viewer-copy checks. |
| Configuration negative tests / signed-artifact model tests | Pass | Reject wrong backend/team/group/build, private keys, expired profile, missing inventory and stale restore proof. A real signed product has not been inspected. |

The durable redacted [evidence record](../implementation/pilot-hardening/LOCAL_EVIDENCE.json) identifies the code commit, commands, counts and limitations. Temporary full logs are `/tmp/signalword-*-final.log`; Xcode result bundle `/var/folders/hx/q701f8992p35385dn217cg1w0000gn/T/signalword-ui.cVrUAx/Journey.xcresult` confirms eight passing UI tests. Those temporary files are not a permanent evidence store. CI's committed-history secret scan remains a required remote check; it was not claimed run locally.

## Defects and failed runs retained

- SDK artifact retrieval/build could not establish a verified enabled integration. Safe optional adapter commit `16a6097` preserves a working SDK-disabled app; reporting remains off.
- A shared pending-deletion trigger referenced a contact-only field on other tables. Clean replay exposed it; table-specific branching and database regressions pass.
- Successful void PostgREST mutations return **204**. The initial journal gateway attempted JSON decoding and falsely reported failure. It now accepts 204; real local deletion succeeds.
- A Durable Object record alone did not prove its R2 archive survived. Snapshot/release now verify every archived record and refuse missing or conflicting objects.
- Historical attempted queued sends could be treated as cancelled without reconciling provider acceptance. Replay now blocks release on unknown outcomes; a failed replay cannot produce an acceptance receipt.
- Largest-text onboarding retained the prior step's scroll offset. The initial eight-test run had one failure; the focused repair passed and the final eight-test run passed.
- Native reduced-motion injection used a read-only SwiftUI environment property and failed compilation during test setup. That injection was removed; actual reduced-motion/VoiceOver checks remain in the physical guide, not falsely counted as native automated evidence.
- Harness setup initially lacked real iOS signup metadata, trusted local TLS configuration, correct accelerated timer chronology and correct retry-count expectations. Those fixture errors were corrected; no production TLS verification was disabled.
- The new separate local project initially lacked optional seed/required function files; startup now copies the required inputs and tolerates an absent optional seed.
- A source-string repository check expected the old database-runner arguments. Updated it for the explicit isolated workdir; real DB execution still validates behavior.
- Repeated DB verification initially encountered prior fixture records and an overlapping race suite. Shared locks and own-record cleanup now prevent overlap; final verification uses a fresh isolated project sequentially. No application assertion was removed to hide interference.
- Automatic approval review rejected broad local truncation/reset. Those actions did not execute. The alternative preserves existing data and creates a separate empty test project.

## Repository and rollout

Focused commits:

- `16a6097`: optional crash SDK isolation.
- `9b0e6b3`: independent deletion/restore authority, backend integration, privacy outbox, consent replay and health signals.
- `828b0bd`: route contracts, release manifest, local failure/restore tooling and signed-app preflight.
- `aa79178`: accessible setup recovery, eight UI journeys and accurate deletion copy.
- `6e7c77421cbe89ba4b60f5b8aaec5f3498797100`: integrated recipient browser and final fixture isolation.

New migrations: `20261001010000_independent_restore_protection.sql` and `20261001020000_journal_and_provider_health.sql`. Prior trust-boundary/contact/timer migrations remain required and additive. Runtime functions changed in `_shared`, user-api, public-event, contact-confirm and dispatch-deliveries; all seven deployment entrypoints must match the candidate. New infrastructure is under `infrastructure/control`; monitor infrastructure is retained. No new third-party runtime dependency was added for this work.

Use `git show --stat <commit>` for exact files. Generate a clean manifest with `npm run --silent release:manifest`; do not use `--allow-dirty` as release evidence. Follow the runbook's maintenance/quarantine → migrations → matching functions → viewer/monitor → verified replay/reopen → hosted checks → signed-device order. Roll forward after security migrations; never restore insecure grants or silently downgrade the backend.

## Remaining blockers and risk register

| Blocker / risk | Likelihood / impact | Owner and next action | Required evidence |
|---|---|---|---|
| Membership/Team ID and identifier ownership | Known pending / prevents required signing | You + engineer: wait for activation, verify owned paid Team ID and registered identifiers. Keep exact repo values until ownership is checked. | Signed product passes `verify-ios-installation.mjs`, launches on Home Screen. |
| Independent authority/retention not provisioned | Known missing / candidate fails closed | Engineer + account owner: approve/setup independent DO/R2 route, distinct secrets, ≥90-day retention lock; run hosted restore. | Quarantine denies traffic; deleted/withdrawn access never reopens; actual RPO/RTO recorded. |
| SDK-enabled crash reporting | Known incomplete / no native crash visibility | Engineer: acquire exact official pinned artifact, verify checksum, compile/run enabled privacy test; you: signed crash drill. | Actual SDK event serialization test, filtered server event and outage behavior. Do not enable the draft SDK path meanwhile. |
| Hosted component/configuration mismatch | Plausible / failed or misrouted alerts | Engineer: deploy candidate only to development after service setup; inspect name-only inventory and hosted routing. | Matching manifest, all seven functions, schedules, origin and Auth enforcement. |
| Operator service/receiver not active | Known pending / incidents unnoticed | You + engineer: accounts/cost review; provision monitor, Healthchecks, destination/owner. | Received incident, deduplicated repeat, recovery and missed-heartbeat alarm. |
| Locked-device/OS behavior | Unmeasured / trigger unavailable under some conditions | You: follow L1–L7 with the signed candidate. | Condition-specific outcomes; no pre-first-unlock guarantee without proof. |
| Live provider, withdrawal/in-flight delivery | Unmeasured / delayed or irreversible message | Engineer + agreed recipients: explicit development session, signed callbacks, cancellation/race observation. | Honest provider/delivery/ack status; no duplicate or unexpected routing. Accepted messages cannot be retracted. |
| Capacity and usability extrapolation | Unmeasured / latency/support risk | Engineer + testers: hosted new-incident load and unfamiliar-user/device observations. | Original availability/latency, ≥18/20 setup and pilot/device-trial targets. Local bursts do not pass these. |

**Engineering work still requiring an unavailable dependency:** SDK-enabled crash integration and its true privacy test. All other newly implemented local items above have passing local evidence; further defects discovered during hosted/device acceptance must be repaired and retested. No independent external security review is claimed. SMS, emergency dispatch and professional monitoring remain outside this email-pilot candidate.

Your next action while membership processes: keep the paired phone and A/B/C inboxes ready, review the guide, and decide/provision the listed operator/control services with engineering. Do not run timer-expiry or REAL drills against the old hosted candidate. Once hosted and signing gates pass, begin A1 → C1 → C2 → L1/L2 before escalation and timers; deletion comes last.


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
