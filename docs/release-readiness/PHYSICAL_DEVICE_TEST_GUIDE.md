# SignalWord: physical-device testing guide

> **Operator evidence received:** screenshots confirm a non-TEST `UP | signalword-dev-operations` recovery email at 2026-09-29 03:18:45 +10:00, after eight minutes down. Operations recovery delivery passes. Separate monitor missed-heartbeat DOWN/UP receipt and duplicate suppression remain pending. Both screenshots show the same recovery event.

> **Current hold — 29 September 2026:** restore repair and development viewer promotion are complete. Monitoring required a further Cloudflare runtime repair; accepted automatic failure/recovery pings are recorded, but operator notification acceptance and other hosted gates remain open. The missed-heartbeat pause is complete and monitoring is scheduled again; development reopened after fresh reconciliation, with aggregate health reporting no problems. Operator email receipt remains pending. Do not install until one clean hosted manifest is frozen. See [current progress](engineer-progress.md) and [monitoring instructions](MONITORING_SETUP.md).

### Original device procedure and app baseline

Updated 28 September 2026 for `feat/pilot-hardening`. **Local code candidate: 6e7c77421cbe89ba4b60f5b8aaec5f3498797100**, app **1.0 (2)**. This is the historical app baseline, not the final installation manifest. The current hosted restore repair additionally requires migration `20261001030000`; the original baseline latest migration was `20261001020000_journal_and_provider_health.sql`. See [engineering progress](engineer-progress.md) and the [development release runbook](../implementation/pilot-hardening/RELEASE_RUNBOOK.md). Development deployment has begun; hosted acceptance is incomplete as described in the update above. No signed installation is claimed. SMS remains unavailable.

**Local evidence is not installation or public-launch approval.** Complete the hosted setup and signing gates before the actions below. The optional crash SDK remains disabled and requires its own verified candidate before crash acceptance.

**Start with Section 1. Do not assume your currently installed app or public website contains these changes.** The previous verification used local databases, simulators and provider fixtures. This file does not authorize or perform deployment or live sending.

## Prerequisites reported by you

- Apple Developer membership: **still pending**; this blocks the required signing/App Group registration and distribution, not independent engineering.
- Xcode is signed into your enrollment Apple Account; the iPhone is paired and shown as Available in Device Hub; Developer Mode is enabled/available (all user-reported).
- Vocal Shortcuts is available on your physical iPhone. **SignalWord TEST intent visibility and locked TEST activation are still pending**, not passed.
- Sender: **iPhone 13 Pro, iOS 26.7**, user-reported; confirm the displayed version when recording the session.
- Recipient device: **MacBook, macOS Tahoe 26.7**, user-reported.
- Supabase Auth Turnstile: **enabled**, user-reported; hosted enforcement and the app token handoff still require verification.
- Recipients A/B/C: all three inboxes are owned and controlled by you. You explicitly consent to confirmation, TEST, resolution and agreed timer-expiry development messages. Record the addresses privately when configuring the session; they have not all been supplied in this guide.

Independent engineering continues while membership is pending. These statements record prerequisites and permission; they do not mark a device or hosted test as passed.

## 0. Blockers and reminders — check this before booking a session

This register includes engineering blockers as well as actions you perform. **Unchecked means pending, not passed.** Ask engineering to record a dated evidence reference when closing an item. Do not enable a service simply because its configuration field exists.

| ID | Owner | Required check and next action | Evidence needed to pass | Tests that must wait |
|---|---|---|---|---|
| B01 — Candidate and compatibility | Engineer | Finish the local suite, commit the candidate, and record matching app, API, viewer and migration versions. Verify the actual development environment before installation. | Full commit/build IDs, final command results and a compatibility/preflight report. | All hosted and device acceptance. |
| B02 — Apple signing | You + engineer | Check Apple Developer membership is active; select your owned team, bundle ID and App Group in Xcode. Install a signed development build and launch from the Home Screen. | Recorded team/configuration match and successful launch without debugger or UI-test fixtures. Do not share signing credentials. | Sender-device tests; local engineering can continue. |
| B03 — Device and voice support | You + engineer | Record the actual iPhone model/iOS from Settings → General → About. Confirm the candidate supports that OS and that the separate TEST action appears in the supported voice setup. Use distinct TEST and REAL phrases. | Locked/background/reboot trials with actual outcomes; limitations recorded, including before first unlock. | Claims about locked voice activation. |
| B04 — Optional Sentry SDK | Engineer first, then you | Complete the SDK-enabled build and serialized-event privacy tests before enabling reporting. The SDK-disabled build is a supported fallback, but does not verify crash collection. Follow O2 below for the signed-device check. | Exact SDK version/checksum, enabled build/test result, redacted event inspection and a successful TEST while reporting is unreachable. | O2 and crash-observability acceptance; other verified local work can continue. |
| B05 — Monitoring services | You + engineer | Review accounts/costs for Cloudflare, Healthchecks and Sentry; select an operator and private incident destination. Engineer configures scoped credentials and runs O1. | Received failure, deduplicated repeat, recovery and missed-heartbeat notifications with timestamps. | Pilot enrollment and operational acceptance. |
| B06 — Independent restore authority | Engineer | Finish API/database integration, deletion resumption, consent replay and fail-closed gate tests. Provision an independent journal only after the local drill passes. Verify retention/coverage for at least 90 days. | Executable local restore report followed by isolated hosted O3 evidence. A journal unit test alone is insufficient. | Restore/deletion-resilience acceptance and pilot enrollment. |
| B07 — Development deployment | Engineer | Check migration ordering, secret names, schedules, anonymous-auth isolation, CAPTCHA integration, routing and headers. Deploy only the agreed development candidate after a deployment decision. | Hosted preflight plus direct GET/POST routing and authentication/isolation results, tied to versions. | C1 onward against hosted services. |
| B08 — CAPTCHA and account identity | You + engineer | Complete real onboarding without a bypass; engineer tests expired/replayed CAPTCHA and cross-account denial. Reopen the app and confirm the same intended account is recovered. | Normal signup succeeds; rejected tokens and other-account access fail; app shows actionable retry states. | Signup/security acceptance. A site key alone does not pass this gate. |
| B09 — Email and scheduling | Engineer + consenting recipients | Verify sender domain, signed callbacks, scheduled workers and Vault configuration. Use only agreed recipients, then perform C1/C2 before escalation or timers. | Inbox receipt, provider/callback states and acknowledgement recorded separately; no unexpected recipients or duplicate traffic. | Escalation and timer live drills. |
| B10 — Recipient consent | You | Obtain explicit consent from A/B/C for the session, including REAL-labelled timer-expiry messages where applicable. Confirm all three individually. | Session consent record and confirmed contacts; no personal addresses in shared reports. | Any live sends to those recipients. |
| B11 — Accessibility and recovery | You + engineer | Run the guide's interruption, relaunch, location-denied, large-text and VoiceOver checks on the actual signed candidate; test recipient pages on a narrow phone screen. | Case-by-case expected/actual results and retests for every failure. | Device usability/recovery acceptance. |
| B12 — SMS | Engineer + you for provider setup | Keep SMS unavailable. Complete approved provider setup, phone verification, channel consent/withdrawal, callback verification and ambiguous-send handling before a separate live test decision. | New SMS candidate and passing integration, carrier and cost-control evidence. | All real SMS tests and SMS claims; email pilot scope remains separate. |
| B13 — Pilot/public launch | You + engineer | Review all critical defects, security findings, restore/rollback evidence, load results, support ownership and pilot results. Preserve the planned observation period and device-trial targets. | Signed-off release evidence with no unresolved critical gates. | Public launch; passing one TEST is not launch approval. |

| B14 — Complete contract coverage | Engineer | Finish the endpoint inventory and verify request, response, error, authorization and old-client compatibility for every supported endpoint. | Inventory linked to executable positive/negative fixtures and passing results. | Engineering acceptance of complete API coverage. |
| B15 — Integrated failure and restore drill | Engineer | Exercise the real local API/database/worker/viewer with a fake provider; include response loss, worker interruption, duplicate callbacks and a real isolated backup/restore. | Reproducible commands and redacted results. Current unit/SQL replay tests do not replace this drill. | Full end-to-end engineering and restore acceptance. |
| B16 — Release automation and capacity | Engineer | Finish the candidate manifest, deployment preflight, rollback/rollforward, CI concurrency checks and load verification at twice the declared pilot peak. | Versioned manifest, failed-configuration rejection, rollout/rollback results and capacity report. | Deployment readiness and pilot capacity claims. |
| B17 — Final native/UI regression | Engineer | Rerun Swift behavior, simulator UI journeys and browser suites on the final candidate after all repairs; then repeat the device cases below. | Exact commands, test totals and final commit. A Release build alone is not a UI test. | Final local UI acceptance and signed-device acceptance. |

### Candidate checkpoint against the register

- **B01/B14/B15/B16/B17 — local portions completed:** use the exact candidate and results in `engineer-progress.md`. The inventory covers 19 authenticated routes and 13 system operations; real local API/database/recipient UI, provider-fault, restore, race and release-configuration checks are recorded. Hosted versions, hosted rollout/rollback and signed installation remain pending. The local restore drill dumps account tables; consent/provider replay also has SQL regressions. It does not prove managed PITR or RPO/RTO.
- **B06 — local protocol implemented/tested, hosted provisioning pending:** independent authority, durable outbox, quarantine, replay and provider-outcome gate are implemented. You do not need to write this code. An engineer must provision retention-protected storage and perform O3.
- **B02/B03 — preparation recorded, physical results pending:** account signed in, device paired and Vocal Shortcuts available. No Team ID or locked activation is claimed verified.
- **B04/B05/B07/B08/B09/B11/B13 — external acceptance still pending.** SDK-enabled privacy/crash checks, operator receipt, hosted CAPTCHA/provider/security and physical behavior must pass separately.
- **B10 — consent stated by you for all three owned inboxes.** Record the actual addresses privately and reconfirm the particular REAL-labelled timer-expiry drill at the session start.
- **B12 — unavailable by design in this email candidate.** Do not test or advertise SMS.

### How to close a blocker

1. Find the ID above and identify the owner. You do not need to solve engineer-owned items yourself.
2. Complete the stated prerequisite before starting its dependent test. If unavailable, record **BLOCKED** and continue only independent checks.
3. Record date, build/configuration, expected result, actual result and a redacted evidence reference.
4. Have engineering review failures and name the repair/retest. Keep the failed result; do not overwrite it with a later success.
5. Update the register and the engineering progress report together. Configuration, local tests, hosted checks and physical observations are separate evidence.

Use this record for SDK/setup checks as well as device trials:

```text
Blocker ID:
Owner:
Current status: PENDING / FAIL / PASS
Prerequisite and action taken:
App/API/viewer/migration versions:
Date/time/timezone:
Evidence reference (redacted):
Remaining action and dependent tests:
Engineer reviewed:
```

## 1. Before you touch the test buttons

### What you need

- [ ] Your iPhone, with its actual model and iOS version recorded.
- [ ] An active signing setup and a signed **development** build installed by engineering. Confirm Apple membership/signing status rather than assuming payment completed activation.
- [ ] A second device to receive email and open links: your MacBook or another phone is sufficient for the recipient website. It does not have to run the sender app.
- [ ] Three distinct consenting recipient email addresses for the complete escalation tests. Label them **A, B and C** in your notes. You can own all three inboxes for an initial smoke test; later repeat with different people for usability evidence.
- [ ] A clock/stopwatch on the second device and somewhere to record results.
- [ ] Time to finish, resolve alerts and cancel timers before leaving the session.

Tell every recipient:

> We are testing a development build of SignalWord. You may receive confirmation, TEST and resolution emails. For an agreed timer-expiry drill, you may also receive a REAL-labelled missed-check-in alert. These scheduled drills do not indicate an actual emergency. Please follow the agreed test steps and contact me directly if anything is unclear.

Most contact tests below use **TEST**. Timer expiry is different: it creates a **REAL missed-check-in incident**. Do not run an expiry drill until all affected recipients have agreed to that specific drill. Do not use police, emergency-service or monitoring-centre addresses.

### Engineering preparation — ask Codex/your engineer to complete this first

You do not need to edit database tables, paste credentials or run deployment commands yourself for these device tests.

| Preparation | What engineering must confirm to you |
|---|---|
| Test environment | App, API, database, worker, webhook and viewer all point to the intended development environment. Known project reference: `voepalyamwgenceawdvl`; verify it is still the intended project. |
| Build identity | Use the exact `feat/pilot-hardening` candidate recorded in the hardening status, not the older timer or SMS branch. Record the full commit and app build before installation. |
| Compatible deployment | The `20261001010000_independent_restore_protection` migration requires the independent authority and matching backend first: **do not apply it alone**. Missing authority configuration intentionally denies application access and delivery claims. Finish B06/B15/B16 before deployment. The baseline API and database include `20260930010000_delivery_trust_boundary` and `20260930011000_public_link_budget`; the API uses service-only gateway routines. Deploy them together in a controlled development maintenance window. Old backend functions fail closed after grants are tightened. Viewer and timer-aware templates must match the recorded candidate. |
| Delivery | Resend sender/webhook and scheduled dispatch are configured; provider records can be inspected by engineering. No fake provider or simulator fixture is used. |
| Scheduling | Escalation dispatch and timer expiry/retention jobs are present and healthy. |
| Isolation | Only agreed test accounts/recipients can receive this session's messages. Production remains untouched. |
| Signing and identity | The real app launches from the Home Screen without a debugger or UI-test launch arguments. CAPTCHA/signup works; it is not bypassed for the device trial. |
| Observation | An engineer can correlate redacted event references with server acceptance, queue claims, provider IDs and signed callbacks without exposing secrets. |

The currently known viewer address is `https://www.signalword.app`, but the domain alone does not identify which backend/build it uses. Engineering must verify the deployed version and routing. Do not replace a public deployment merely to run these tests without a separate deployment decision.

**Ready to begin only when engineering confirms the table above.** If a feature/control is missing, record **BLOCKED — build/deployment mismatch**; do not substitute an older app and count it as passing.

### Exact development installation configuration

**Preparation reference, not installation approval.** The final tested commit and manifest must be recorded in the engineering handoff before using these settings. Do not install a build from an arbitrary branch or assume the currently deployed website matches it.

| Setting | Candidate configuration |
|---|---|
| Xcode project | `/Users/haleytran/.codex/worktrees/release-readiness/SignalWord/apps/ios/SignalWord.xcodeproj`; open this project, not the original `feat/ui` checkout and not the Swift package. Scheme/target: **SignalWord**. |
| App version/build | `1.0 (2)`; verify the final manifest and installed build agree. |
| Bundle ID | `com.signalword.app`, as currently configured in the repository. Your Apple team must own/register this identifier. |
| App Group | `group.com.signalword.shared`; both the entitlement and `SignalWordAppGroupIdentifier` Info.plist value must match. |
| Signing | `DEVELOPMENT_TEAM` is blank in both repository build configurations. Your active Apple Developer team with permission for this Bundle ID, App Group and registered development device. The Team ID is not supplied yet; engineering must not invent it. Automatic signing is enabled. |
| Minimum iOS | `18.0`; your reported iOS 26.7 is above this minimum, subject to actual device verification. |
| `SIGNALWORD_SUPABASE_URL` | `https://voepalyamwgenceawdvl.supabase.co` |
| `SIGNALWORD_USER_API_URL` | `https://voepalyamwgenceawdvl.supabase.co/functions/v1/user-api` |
| `SIGNALWORD_SUPABASE_PUBLISHABLE_KEY` | Copy the **publishable client key** from this development Supabase project's API settings. Never use the secret/service-role key. Verify project identity before copying. |
| `SIGNALWORD_VERIFICATION_URL` | `https://www.signalword.app/onboarding/verify.html` |
| `SIGNALWORD_TURNSTILE_SITE_KEY` | `0x4AAAAAAFFb3ETKlwBxFCNF` (public site key supplied by you). |
| Turnstile allowed hostname | Verify the widget permits `www.signalword.app`; the secret belongs in Supabase Auth's CAPTCHA configuration. An Edge Function secret alone does not configure Supabase Auth. |
| `SIGNALWORD_CRASH_REPORTING_ENABLED` | `NO` for the SDK-disabled build. O2 remains blocked until a separately verified SDK-enabled build is available. |
| Viewer origin | `https://www.signalword.app`, after engineering verifies the matching development backend. |
| Delivery scope | Consenting test recipients only; email. SMS and professional monitoring unavailable. |

### Capabilities and signing: verified repository requirements

The checked-in entitlement file contains **only** `com.apple.security.application-groups = [group.com.signalword.shared]`. The Xcode project sets the same App Group in generated Info.plist and `com.signalword.app` for both Debug/Release. No rename is requested. Your activated paid team must own/register both; ownership is not yet verified. If unavailable, stop and have engineering reconcile identifiers together. Do not remove the group to get a build installed: durable commands depend on its shared container.

App Groups provisioning requires the appropriate program membership. Apple documents [capabilities by membership](https://developer.apple.com/help/account/reference/supported-capabilities-ios) and [App Group registration](https://developer.apple.com/documentation/xcode/configuring-app-groups). This candidate therefore retains membership activation as a signing gate. The expected team is **your enrolled paid team for this app**; the exact ten-character Team ID remains unknown because the repository intentionally leaves it blank. Account login and a Personal Team do not prove the required provisioning is available.

Location While Using and Face ID usage descriptions are generated by the project; they are runtime permissions, not additional paid capabilities. Local timer reminders require notification permission and are supplementary. This candidate does not request push/critical-alert, continuous background-location, microphone, speech-recognition or legacy Siri entitlements. App Intents supplies `Send TEST Alert` and `Trigger Alert`; iOS manages Vocal Shortcuts. Do not add unrelated capabilities to address a signing error. Continuous tracking, SMS and monitoring are not part of this candidate.

Installation steps after the candidate and signing gates pass:

1. Obtain the exact candidate commit and manifest from engineering; check out that commit in the dedicated candidate worktree. Do not discard another branch's uncommitted work.
2. Open the exact `.xcodeproj` path in the table above in Xcode. Select the **SignalWord** target and **Signing & Capabilities**.
3. Select your active developer team. Confirm the Bundle ID and App Groups capability above. If registration/signing fails, save the error and mark B02 blocked; engineering must reconcile identifiers consistently before rebuilding.
4. Under **Build Settings**, enter the user-defined `SIGNALWORD_*` values above for the configuration being installed. Leave service-role, Resend, webhook, encryption, control-service and CAPTCHA secret keys out of the app.
5. Connect and unlock the iPhone; trust the Mac if prompted. Select this iPhone as the run destination. Enable Developer Mode if Xcode/iOS requests it, restart when prompted, then reconnect.
6. Build and run. Record version/build, commit, team and configuration. Before an alert, engineering runs `SIGNALWORD_EXPECTED_TEAM=<verified-owned-Team-ID> node scripts/verify-ios-installation.mjs /exact/path/to/SignalWord.app` against the signed device build. This checks the built Info.plist, entitlements, development profile and API origin without printing credentials. A simulator product cannot pass this check. Team ID is obtained from your activated membership/profile, never guessed from the account email.
7. Stop the Xcode debug session. Launch the installed app from the iPhone Home Screen; do not use UI-test launch arguments or simulator fixture controls.
8. Complete real Turnstile onboarding. Record failures; do not bypass CAPTCHA to count the test as successful.
9. Start the first tests below. If membership/signing is still pending, stop only installation/device testing; local engineering and service preparation continue.

### First physical tests — run in this order

1. **C1:** invite and explicitly confirm A; check the sender sees confirmed consent.
2. **C2:** one manual TEST, real inbox receipt, explicit acknowledgement, sender relaunch, resolution and recipient update. Check server/provider/acknowledgement separately.
3. Complete the **locked TEST phrase** case below, using the separate TEST action. Record foreground/background/locked behavior without inferring that every locked condition works.
4. Add and confirm B/C. Run the contact routing cases: everyone immediately, then primary followed by remaining contacts after two minutes while unresolved. Verify acknowledgement alone does not stop escalation.
5. Run offline/relaunch recovery and withdrawal cases. Confirm no lost pending work, duplicate acceptance or access after withdrawal.
6. Run timer start/check-in/cancel/extend before expiry tests. Only then run an agreed expiry drill: it generates a **REAL-labelled** missed-check-in incident. Resolve that incident explicitly.
7. Run interrupted deletion last for that sender account. Verify both server completion and local cleanup; start a new account only after documenting the result.
8. Perform the end-of-session cleanup checklist. No active timer, unresolved drill incident or unexplained delivery should remain.

### Set up the session record

```text
Session date/time and timezone:
App branch / commit / build:
Backend migration/function version:
Viewer version and origin:
Confirmed development project:
Sender iPhone model / iOS:
Recipient devices / OS / browser:
Recipients A/B/C have agreed: yes/no
Engineer available for backend evidence:
```

Keep recipient addresses, private links, tokens and exact coordinates out of shared reports. Crop the address bar from screenshots of recipient pages.

## 2. How to judge a result

Use **PASS**, **FAIL** or **BLOCKED**. Not seeing an error is not enough for PASS.

| What you see | What it proves |
|---|---|
| App says server accepted | Backend accepted the incident; it does not prove email delivery. |
| Provider accepted | Provider accepted a send request; it does not prove inbox receipt. |
| Delivery report | Provider reported delivery; it does not prove anyone read it. |
| Email visibly arrives | That particular inbox received the message. Check Spam/Junk too, recording where it arrived. |
| Recipient presses Acknowledge | Someone using that private link acknowledged it. It does not verify identity or mean help is coming. |
| Sender resolves the alert | Incident ended; already-submitted messages cannot be recalled. |

Record when each step happens. Use **server acceptance time**, supplied by engineering, when checking the two-minute escalation delay. Notification previews and browser/email prefetch must not acknowledge an alert.

If a result is missing after five minutes, ask engineering to investigate and mark it unresolved. Five minutes is a troubleshooting checkpoint, **not an acceptable delivery target**. A later arrival still needs its actual latency recorded. Do not repeatedly press Send to see whether anything happens.

## 3. First session: prove one complete TEST journey

Allow roughly 30–45 minutes after engineering setup. Stop and fix a failure before starting the more complicated scenarios.

### C1 — Invite and confirm contact A

1. Launch SignalWord from the iPhone Home Screen.
2. Complete signup/verification if asked. Set a display name the recipient will recognise.
3. Open **People** and add A as your initial trusted contact; send the confirmation.
4. On A's device, open the confirmation email and its website link.
5. Before confirming, check the sender app still treats A as pending. Merely opening the email/link must not grant consent.
6. Have A press the explicit confirmation button.
7. In SignalWord, use **Check confirmation** or reopen/refresh People.

**Expected:** A is confirmed, the sender is recognisable, and A becomes the primary contact. No safety-alert email was generated just by confirming.

**Record:** invitation and confirmation times; whether email landed in Inbox or Spam; any unclear wording. Engineering confirms the same contact record changed state.

### C2 — Send, acknowledge, relaunch and resolve

1. Tell A you are starting C2.
2. On **People**, press **Send TEST alert** once. Do not use the REAL alert control on Home.
3. Wait for server acceptance and record the time/event reference.
4. Have A check their inbox. The message must clearly say TEST/rehearsal.
5. Open A's private alert link on the recipient device. Check the sender name, TEST label and active state.
6. Before pressing anything, verify the sender has no acknowledgement yet.
7. Have A press **Acknowledge** once. Refresh the sender's status.
8. Leave SignalWord, close it through the app switcher, then launch it again from the Home Screen.
9. Confirm the same incident and acknowledgement are still visible. Do not send a new alert.
10. On Home, use **Hold to resolve this alert**, or its explicit review-and-confirm alternative.
11. Refresh A's recipient page. Check that it says resolved, and observe the resolution email if the initial send was submitted.

**Expected:** one TEST incident, one initial message to A, acknowledgement appears, relaunch preserves the incident, resolution updates the recipient page. Initial and resolution emails are different message purposes, not duplicates.

**Engineering checks:** actual event ID, one initial outbox record, provider acceptance, valid signed delivery callback, acknowledgement timestamp and resolution transition. Inbox arrival alone does not prove callback handling.

## 3A. Authentication, locked execution and accessibility matrix

Run after C1–C2, before timer expiry or deletion. Each row is a separate trial using the evidence template in Section 9: record build/configuration, expected/actual state, redacted event reference, timestamp and PASS/FAIL/BLOCKED. **Pass only when every expected condition holds.** A blocked test is never a pass. Use TEST only and resolve each incident before starting the next.

| ID / purpose | Prerequisite and numbered actions | Expected result / pass rule |
|---|---|---|
| A1 — Fresh account CAPTCHA | Fresh test account after documented cleanup. 1. Launch normally. 2. Complete the real widget. 3. Return to app. 4. Relaunch. | Account becomes ready only after server acceptance; same intended identity returns; no widget token in screenshots/logs. |
| A2 — Missing/expired/replayed CAPTCHA | Engineer-assisted dev session. 1. Cancel widget; attempt setup. 2. Let a token expire before submission. 3. Engineer replays a consumed token using synthetic account tooling. 4. Complete a fresh widget. | First three attempts cannot create a usable new session; clear recovery offered; fresh verification succeeds. Do not disable Auth CAPTCHA for this test. |
| A3 — Expired session/isolation | Engineer can expire only the test session and create a second synthetic account. 1. Relaunch the first app. 2. Attempt recovery. 3. Engineer checks cross-account reads/writes. | Refresh succeeds or actionable verification appears; no silent account swap; other-account data is denied. No real account credentials in evidence. |
| A4 — Deletion/recreation | Perform D1/D2 at session end. 1. Confirm server/local deletion complete. 2. Reopen and complete new CAPTCHA. 3. Inspect readiness and contacts. | Fresh setup with no old contacts/rehearsals/timers; old capabilities remain unavailable. |
| L1 — Intent discovery | Signed candidate installed. 1. Open Vocal Shortcuts setup. 2. Select **Send TEST Alert**. 3. Set a distinct rehearsal phrase. 4. Check REAL remains a separately named action. | Exact TEST action is visible and selectable. Its meaning never changes with an app mode. Record visibility; do not count it as locked activation. |
| L2 — Execution conditions | C2 and L1 pass. 1. Trigger TEST with app foregrounded. 2. Resolve. 3. Repeat backgrounded, locked, then after terminating app. | Record acceptance/delivery/acknowledgement for each condition separately. No duplicate event from the same pending command. A failed condition blocks claims for that condition. |
| L3 — Restart/first unlock | Test recipient warned. 1. Restart phone. 2. Attempt TEST before first unlock. 3. Unlock once. 4. Attempt TEST while locked again. | Record actual pre-unlock limitation, not guaranteed delivery. After permitted execution, pending state is honest and recovery works. Do not promise pre-first-unlock reliability without evidence. |
| L4 — Location denied/allowed | TEST session, no active timer. 1. Deny app location; send TEST. 2. Resolve. 3. Grant While Using; send another TEST. | Manual sending remains available without location. Recipient displays unavailable or dated location honestly; no continuous-live claim. Never copy exact coordinates into the report. |
| L5 — Offline under ten minutes | Confirmed contact. 1. Disable connectivity. 2. Trigger TEST. 3. Relaunch. 4. Reconnect before ten minutes. | Saved command survives; original command reconciles/retries once; accepted event is not silently replaced. Recipient receives no duplicate initial alert. |
| L6 — Delayed offline submission | As L5, but stay offline over ten minutes. 1. Reconnect and foreground. 2. Inspect pending command. 3. Explicitly confirm or cancel the delayed send. | No blind delayed submission; original trigger time remains distinguishable. Uncertain server outcomes reconcile before another send. |
| L7 — Duplicate and TEST/REAL isolation | Engineer-assisted agreed drill; REAL requires explicit session agreement. 1. Create pending REAL work offline. 2. Invoke TEST. 3. Reconnect. | TEST cannot overwrite, reuse or suppress REAL; no unintended duplicate acceptance. Stop and resolve every accepted drill incident. |
| U1 — VoiceOver/largest text/reduced motion | Enable each setting separately. 1. Navigate setup, People, timer and active alert. 2. Use the accessible review/confirm alternative to holding. 3. Cancel once; then perform TEST normally. | Labels and reading order are understandable; controls reachable; text uncut; cancel sends nothing. Motion is reduced appropriately. No simulator result substitutes for your actual VoiceOver experience. |
| U2 — Recipient keyboard/narrow/stale view | MacBook plus narrow browser window. 1. Use keyboard only to open/acknowledge. 2. Restrict width to 320px. 3. Interrupt networking after a location loads. 4. Restore network. | Focus visible; no horizontal overflow; explicit acknowledgement only; retry clear; cached location ages rather than claiming a fresh update. |
| R1 — Expired/revoked recipient links | Engineer expires/revokes only fixture links. 1. Open without acknowledging. 2. Reopen. 3. Resolve/withdraw as appropriate. 4. Open revoked/expired links. | GET never acknowledges; valid repeated opens safe; revoked/expired capabilities show unavailable, not private incident data. |

## 4. Contact escalation: complete these after C1–C2 pass

Before each new case, resolve the previous incident and wait for any app cooldown. Engineering must confirm the next case has a **new event ID**. Reusing an existing alert is not a new trial.

### C3 — Three contacts; everyone immediately

1. On People → **Your contact network**, choose **Invite another person** and invite B, then C.
2. Have B and C independently confirm through their own emails. Do not copy A's link to them.
3. Choose A as primary using **Make primary** if necessary.
4. Select **Everyone immediately** and wait for the server-confirmed selection.
5. Send one TEST.
6. Ask A/B/C to open only their own received links. A acknowledges first; B/C do nothing yet.
7. Check sender **Recipient progress**: only A should show acknowledged. Then let B and C acknowledge separately.
8. Resolve the incident and check recipient pages update.

**Expected:** three independent recipient links and progress records. All initial deliveries become eligible immediately; network/provider delays may differ. No acknowledgement is attributed to the wrong recipient. The app does not claim verified identity or rescue.

### C4 — Primary now; others after two minutes

1. Select **Primary now, others after 2 minutes**; wait for confirmation.
2. Send a fresh TEST and keep it unresolved.
3. Have A acknowledge as soon as their message arrives.
4. Check B/C receive no initial alert before the server's two-minute due time.
5. After that due time, let the worker process the remaining recipients. Record actual inbox arrival times.
6. Confirm A's acknowledgement did **not** cancel B/C escalation.
7. Resolve the incident.

**Expected:** A is eligible immediately; B/C are scheduled two minutes after acceptance and become eligible while unresolved. Scheduler/provider latency is additional. Engineering verifies scheduling/claim timestamps rather than relying only on inbox timestamps.

### C5 — Resolve before secondary escalation

1. Use the delayed policy and send a fresh TEST.
2. Resolve it well before the two-minute deadline, for example after approximately 30 seconds.
3. Wait beyond the deadline and the next worker runs.
4. Ask B/C whether anything arrived.

**Expected:** B/C's unclaimed initial deliveries are cancelled; no initial or unnecessary resolution email goes to a recipient whose initial send was never submitted. Engineering confirms cancellation in the outbox. A may receive a resolution message.

A message already claimed/submitted before resolution may still arrive. Record and investigate its claim time; do not promise recall or automatically label it a duplicate.

### C6 — Withdraw a secondary recipient before its send

1. Use the delayed policy, with all three recipients confirmed. Send a fresh TEST.
2. Before B becomes due, ask B to open their saved confirmation/consent page and press **Withdraw trusted-contact consent**.
3. Refresh the sender app. Let the delay and worker runs complete.
4. Check B's earlier alert links are unavailable, while C still receives their scheduled message.
5. Resolve the incident.
6. Repeat as a separate case using the sender's **Withdraw B** control and explicit confirmation.

**Expected:** B is disabled; B's unclaimed sends and access are revoked; A/C remain unaffected. Re-invite and explicitly reconfirm B before using B in another test. Revoked consent must not silently return after relaunch.

### C7 — Recovery with no connection

1. Ensure no active timer is running. Tell recipients an offline TEST may arrive later.
2. Enable Airplane Mode and explicitly turn off Wi-Fi too. Verify the device cannot load an ordinary website.
3. Try **Send TEST alert** once.
4. Check the app does not claim server acceptance or delivery while offline.
5. Close and reopen the app while still offline; record the pending/error state.
6. Restore connectivity within ten minutes and reopen SignalWord. Use the recovery/retry control if offered.
7. Verify a single accepted TEST incident/message set, then resolve it.
8. In a separate case, stay offline for more than ten minutes before reopening online. Confirm the app asks before sending the delayed command. Review the original trigger time, explicitly confirm only if the recipients still expect the drill, then resolve.

**Expected:** durable original command identity, no duplicate acceptance, no silent delayed send after the confirmation threshold. If no pending command was saved, record that observed failure instead of assuming it will retry. Engineering checks the idempotency key and original client trigger timestamp.

### C8 — Locked-phone TEST phrase

1. Have engineering demonstrate which installed action is **Send TEST Alert**. **Trigger Alert** is the separate REAL action.
2. Configure a distinct rehearsal phrase using the device's supported shortcut setup, with engineering help for your iOS version. Never map the rehearsal phrase to the REAL action.
3. First invoke the TEST action with the phone unlocked; complete and resolve that TEST.
4. Lock the phone, leave it untouched, say the rehearsal phrase once, and observe whether A receives a TEST.
5. Unlock/reopen the app. Confirm the same incident is recoverable; have A acknowledge; resolve it.
6. Repeat as separate recorded trials with the app backgrounded, after force-closing it, and after rebooting **and unlocking once**. Test reboot-before-first-unlock separately with engineering.

**Expected:** TEST never becomes REAL. Record exact locked/unlocked/app state, prompts, failures and limitations. Do not assume all those conditions are supported because one succeeds. Any unavailable locked condition must remain a documented limitation/release blocker as appropriate.

Use **I used the locked TEST shortcut** only after you actually did so. That is your report, not automatic proof of locked execution.

## 5. Safety check-in timer: use the timer-enabled development build

Do not begin until engineering confirms the timer migration, scheduler, API, viewer and email renderer are deployed together. The current design selects confirmed contacts and policy **when the timer expires**, then snapshots them into the incident; changing People settings during a timer affects that future selection.

**For every expiry case, obtain agreement for REAL-labelled missed-check-in emails. There is no TEST timer mode in this implementation.** Start with one consenting recipient, then repeat an expiry case with the verified three-contact policy.

### T1 — Start, relaunch and check in on time

1. On Home → **Safety check-in**, press **Start 15-minute check-in** once.
2. Wait for **Active — confirmed by server**. Write down **Check in by** and the server grace-end time.
3. Close and reopen the app. Confirm the same timer and deadline recover.
4. While online and comfortably before the deadline, press **Check in now**.
5. Wait for **Checked in — confirmed by server**.
6. Keep observing through the original deadline, grace and subsequent scheduler runs.

**Expected:** one server timer, no missed-check-in incident/messages after successful check-in. A spinner, pending label or offline tap is not confirmation.

### T2 — Duration choices, extension and cancellation

1. Start a 30-minute timer and record its deadline.
2. Press **Extend by 15 minutes**. Wait for confirmation; the deadline should increase by 15 minutes, not become 15 minutes from now.
3. Relaunch and verify that extended deadline persists.
4. Press **Cancel check-in timer**; wait for **Cancelled — confirmed by server**.
5. Start a 60-minute timer, confirm its deadline, then cancel it while online.
6. Try to start a second timer while one is active in a separate case; the app/server must not create two active timers.

**Expected:** all duration choices work, extension never shortens an active timer, and confirmed cancellation produces no later incident. Engineering verifies no active timer remains; follow up after the cancelled deadlines.

### T3 — Miss the deadline with the app closed and phone offline

1. Agree on the REAL-labelled drill with every potentially selected contact.
2. Start a 15-minute timer online and wait for server confirmation.
3. Close the app, enable Airplane Mode and turn off Wi-Fi. Leave the sender phone unused.
4. Keep the recipient device online. Wait through the recorded deadline plus one-minute grace and the next server scheduling run.
5. Record email arrival and open the private link.
6. Verify the message/page explains **missed check-in** and does not claim danger was confirmed. Have the recipient acknowledge.
7. Reconnect and reopen the sender. Confirm **An alert already exists**, the active incident and recipient progress.
8. Resolve the incident explicitly on Home and verify recipient updates.

**Expected:** exactly one missed-check-in incident even though the sender is closed/offline. Acknowledgement does not resolve it. Delivery timing includes scheduler and provider latency; engineering checks that the worker ran and did not duplicate the incident.

### T4 — Offline check-in/cancel is not a stopped timer

1. Start and confirm a 15-minute timer online.
2. Go offline. Press **Check in now** (repeat with Cancel in a separate case).
3. Confirm the UI shows a pending/unconfirmed change, not successful check-in/cancellation.
4. Close/reopen, reconnect before the deadline and use **Retry timer request** if needed.
5. Confirm the server result and no extra timer.
6. For an agreed expiry drill, repeat but reconnect after grace has ended. Refresh/retry the original operation.

**Expected:** before expiry the server can confirm the stop; after expiry it must report the existing incident and require explicit resolution. Never assume a network error prevented the server from acting. Engineering reconciles the original request ID.

### T5 — Local reminders, permissions and device clock

1. With notifications allowed, start a confirmed timer. Lock the phone and observe whether a reminder appears before the deadline. Record Focus mode and notification settings.
2. Dismiss the reminder. Verify this did not check in or cancel the server timer. Open the app and explicitly check in while online.
3. Deny SignalWord notifications in device settings. Start another timer; the UI must explain reminders are supplementary, and the server timer must still work. Cancel it explicitly.
4. In an engineer-assisted session, change the sender's local clock/timezone while a timer is active. Use the second device/server time as reference; restore automatic time afterward.

**Expected:** notification denial/dismissal cannot stop the server timer, and device clock changes cannot move its server deadline. Record missing/late reminders as defects or limitations; do not count an inbox alert as proof the reminder worked.

### T6 — Existing REAL incident and TEST separation (assisted drill)

1. Agree explicitly on REAL-labelled messages. Start a confirmed timer.
2. Before it expires, create one manual REAL incident using the app's explicit confirmation flow. Keep it unresolved.
3. Let the timer expire. Engineering checks that it associates the existing REAL incident without a second initial contact batch.
4. Resolve the incident.
5. In another timer run, create only a TEST incident before expiry. Let the timer expire as agreed.
6. Verify the timer creates a separate REAL missed-check-in incident; a TEST must not suppress it. Resolve both incidents as needed.

**Expected:** no duplicate REAL initial traffic when a REAL incident already exists. Separately scheduled secondary escalation or resolution messages are not duplicates; engineering must distinguish their purpose and event IDs.

### T7 — Consent disappears before expiry

1. Start a timer with A as the only confirmed primary; agree on this failure drill.
2. Have A withdraw consent before expiry. Do not nominate a replacement primary during this case.
3. Let the timer pass grace, then refresh the sender.

**Expected:** explicit timer escalation failure and no send to A; never a misleading successful-delivery state. Engineering checks the failure record and whether the configured operator notification actually arrived. No operator service configured means that operational part remains **BLOCKED**.

Re-invite/reconfirm a primary and verify a new timer can be started and cancelled successfully.

## 6. Deletion and interruption checks — do these last

Use a disposable development test account. Deletion is destructive to that account, so finish any other trials first. Closing/uninstalling the app is not account deletion.

### D1 — Delete with pending timer/recipient work

1. Record only redacted event references. Keep recipient links privately on the recipient device for the revocation check.
2. In an agreed drill, start a confirmed timer. Engineering can also arrange an unclaimed delayed TEST delivery.
3. In Settings, choose **Delete account and data** and confirm. Wait for completion.
4. Close/reopen the app. Check that the deleted account's readiness, active alerts and timer do not return.
5. On the recipient device, refresh old alert and confirmation links.
6. Wait beyond the old timer deadline/grace and delivery due times with engineering observing the queue.

**Expected:** old links cannot reveal deleted incident data; no new work is sent for the deleted account after deletion takes effect. In-flight provider submissions cannot be recalled. Engineering verifies account/data removal, timer cancellation/cascade and revoked access.

### D2 — Lose the deletion response (engineering-assisted)

1. Use a new disposable test account.
2. Ask engineering to arrange a controlled development interruption after server deletion commits but before the app receives the response. Randomly toggling Wi-Fi does not reliably hit this condition.
3. Reconnect and relaunch. Follow the app's deletion recovery prompt.
4. Confirm deletion completes without needing the invalidated account credentials, and local data is cleared.

**Expected:** the deletion receipt reconciles the result. The app must not say deletion is complete while local cleanup failed. Engineering verifies that a late response cannot restore the deleted session.

## 7. Checks that need engineering, not just tapping the phone

| Check | Your part | Engineering part / pass evidence |
|---|---|---|
| Duplicate workers and callbacks | Notice/report duplicate inbox messages and event references | Fault-inject development workers; verify one claim/incident, signature rejection and monotonic callback reconciliation. |
| Resolution/withdrawal near dispatch | Follow a timed drill and report messages received | Determine whether work was unclaimed, claimed or submitted; verify no new claims after invalidation. |
| Contact/routing changes mid-incident | Change policy after accepting one TEST, then create a later TEST | First incident retains its snapshot; later incident uses the new confirmed policy. |
| Expired links/incidents | Open the agreed expired test link | Arrange isolated expiry; verify access closes and no future unclaimed delivery. Do not edit shared production timestamps. |
| Missing/slow provider response | Report honest UI outcome and eventual email | Inject timeout/429/5xx safely; prove unknown-outcome reconciliation before any resend. |
| Cross-user isolation | Use two separate test phones/accounts if available | Attempt access with the wrong authenticated account; verify denial. A recipient capability link is intentionally usable by its holder—do not confuse that with sender-account authentication. |
| Location | Test permission allowed/denied; inspect displayed age/accuracy on recipient page | Verify location never blocks alert acceptance and unavailable/stale data is labelled accurately. These tests do not establish continuous tracking. |
| Old-client compatibility | Run an older signed development build if supplied | Verify old API requests still work against additive migrations; keep new-feature UI disabled where unsupported. |
| Scheduler/operator outage | Follow the isolated drill; keep consenting recipients informed | Pause only isolated development processing, observe operator notification, resume, verify one incident per due timer. |
| Backup restore/deletion guarantees | Review the evidence | Restore into isolation; enforce restore gate/deletion journal; prove deleted access/work cannot resurrect. Phone testing alone cannot prove this. |
| Accessibility/usability | Repeat setup and resolution with large text/VoiceOver; ask unfamiliar users to try without coaching | Record task completion, focus order, clipping, contrast, errors and required fixes. |

These remain open until there is recorded evidence, even when local automated tests passed.

## 7A. Operational acceptance — do this with engineering

These steps require separate authorization for the **development** environment. They are not ordinary app buttons. Do not pause public processing or crash a phone during an active alert/timer.

### O1 — Operator notification and recovery

1. Engineering confirms the scoped health function, Cloudflare scheduled monitor, incident receiver and independent Healthchecks heartbeat are configured.
2. Record the operator's name and the notification destination privately. No database service-role key belongs in the external monitor.
3. Engineering introduces an isolated synthetic queue-health failure without sending live alerts.
4. Confirm the responsible operator actually receives one incident notice. A successful webhook HTTP response alone does not pass this step.
5. Allow two more scheduled checks with the same failure. Confirm the incident is grouped without repeated unchanged notifications.
6. Engineering removes the failure. Confirm a recovery notice arrives.
7. Engineering stops only the dedicated development monitor. Confirm the independent missed-heartbeat notification arrives, then restore the schedule and verify recovery.
8. Record times, expected thresholds, actual notifications and cleanup. Missing notification means **FAIL** and blocks enrollment.

### O2 — Privacy-filtered crash reporting

1. Engineering first verifies the official SDK artifact and builds/tests with `SIGNALWORD_WITH_SENTRY=1`. Record the pinned version and verified checksum from `apps/ios/TelemetrySDK/Package.swift`; never use a partial archive. The default SDK-disabled test only proves that the app can operate without reporting. It does **not** pass this step. Require the serialized-payload privacy test to actually run, rather than be excluded by conditional compilation. If any check is missing, record **BLOCKED — B04**.
2. Confirm a dedicated development Sentry project, an approved retention/privacy configuration and an explicitly enabled signed build. Reporting is disabled when configuration is absent.
3. Resolve all incidents and cancel timers. Engineering supplies an isolated diagnostic build or test-only crash procedure; do not add a public crash button.
4. Launch from the Home Screen without the debugger, perform the agreed diagnostic crash, then relaunch to allow reporting.
5. Engineering verifies the event corresponds to this build and inspects the actual payload. Contact details, exact coordinates, capability URLs, request bodies, breadcrumbs and secret phrases must be absent.
6. Verify useful crash frames/build identity remain, and repeat normal TEST creation with telemetry unreachable. Reporting failure must not block alert creation.
7. Remove the diagnostic build/control and repeat the normal launch. Record **BLOCKED** until a real signed-device result exists.

### O3 — Restore and deletion protection

**Do not run a restore drill until the independent journal and enforced restore gate are implemented and locally verified. They are currently an engineering blocker.**

This is engineer-assisted work; you should not restore a database yourself.

1. Engineering completes B06 and B15 locally and supplies the exact approved drill procedure. Record the candidate, backup timestamp and isolated target. Use synthetic identities and no real recipient links or production data.
2. Confirm the independent control service and journal are outside the restored database. Verify retention protection and coverage for the chosen backup; a backup older than verified coverage must be rejected.
3. Enable external quarantine **before** restoring. Demonstrate that API requests, recipient reads and scheduled delivery claims fail closed, including when the control service is unreachable.
4. Restore the isolated backup and replay durable deletion and consent changes. Interrupt and restart the procedure; repeat replay to verify idempotency.
5. Check deleted identities, pre-restore sessions, withdrawn recipients and revoked links remain denied. Check old queued messages and timers cannot silently resume. Reconcile uncertain provider outcomes rather than blindly resending.
6. Obtain the current journal version/digest and database reconciliation receipt. Try an outdated proof and confirm reopening is rejected. Only an authorized engineer may reopen with current evidence.
7. Perform one separately authorized TEST after reopening. Record measured data-loss interval and elapsed recovery time against RPO ≤15 minutes and RTO ≤60 minutes.
8. Close the isolated environment and confirm the normal development environment is unaffected. Record **FAIL/BLOCKED** for any missing evidence; a successful database restore alone does not pass O3.

## 8. SMS: what you can and cannot test now

**Now:** if engineering supplies the SMS-boundary build, open People and confirm **SMS not enabled**. There should be no working SMS enrollment/send control and no SMS success claim. Existing email behavior should continue normally.

**Not ready yet:** real phone verification, recipient SMS consent/opt-out, SMS sends, provider callback signatures, delivery/retry reconciliation and actual carrier behavior. These require an approved provider and additional implementation. Adding an API key is insufficient.

After that work is ready, engineering must provide a new device-test build and guide covering:

1. Verify a consenting recipient's number and separately confirm SMS consent.
2. Send an explicitly agreed TEST; inspect SMS receipt, provider callback, private link and acknowledgement independently.
3. Test the provider-supported opt-out route; verify SMS stops while email-only consent remains as intended.
4. Test interruption/unknown send/duplicate callback/retry limits without duplicate billing or misleading delivery claims.
5. Resolve, expire and delete; verify revoked access and cancelled unclaimed SMS.
6. Repeat on supported Australian carrier/device paths and measure actual cost and latency.

Do not count any of those as passed now. Full engineering details: SMS integration remains outside this candidate; its separate branch handoff must be reviewed before enabling it.

## 9. Record and report each trial

Copy this template for every case; include failures and retests, not just successes.

```markdown
### Trial C2-001 — TEST journey
- Date/time/timezone:
- App commit/build and environment:
- Backend/viewer version:
- Sender device/iOS; recipient device/browser:
- Case ID and action performed:
- Phone state: foreground/background/force-closed/locked/rebooted
- Connectivity and permissions:
- Server acceptance/deadline time (engineering):
- Email arrived at / Inbox or Spam:
- Link opened / acknowledged at:
- Sender recovered / resolved at:
- Expected result:
- Actual result:
- PASS / FAIL / BLOCKED:
- Redacted event/request reference:
- Screenshot filename (private URL/contact/location removed):
- Defect reference and retest ID:
```

Send me the case IDs, build, result, what you saw and roughly when it happened. Do not paste private links, credentials or exact locations. If something fails, keep the original evidence and pause that scenario; repeating Send can create confusing extra traffic.

### End-of-session cleanup

- [ ] Reconnect the sender and restore automatic time/normal device settings.
- [ ] Confirm every timer is checked in or cancelled on the server, or has an explicitly resolved incident.
- [ ] Resolve all active drill incidents, including separate TEST and REAL incidents.
- [ ] Engineering confirms no unexplained queued/unknown delivery remains.
- [ ] Tell recipients the session is finished.
- [ ] Save redacted results; file defects and identify which cases need rerunning.

## 10. When can a feature be considered verified?

- **Contact escalation:** C1–C8 plus relevant assisted isolation/race/expiry/deletion checks pass on the recorded development build; actual messages and callbacks corroborate the phone observations.
- **Timer:** T1–T7, timer deletion/recovery and real schedule/operator checks pass. Closed/offline operation and explicit resolution are demonstrated.
- **SMS:** still blocked until remaining provider integration is implemented and the later live acceptance cases pass.

One passing session is an initial acceptance result, not population-wide reliability. Broader device/OS trials, accessibility/usability, security review, restore/rollback, load/cost monitoring and the invited pilot are still needed before public release. Keep the original 300-trial evidence target and release gates; do not award 97/100 from this checklist alone.

Related files: [consolidated handoff](../implementation/sequential-slices/HANDOFF.md), [contact implementation](../implementation/sequential-slices/CONTACT_ESCALATION.md), [timer implementation](../implementation/sequential-slices/CHECK_IN_TIMER.md). SMS remains unavailable in this candidate.
