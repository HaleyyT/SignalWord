# SignalWord: physical-device testing guide

Updated 28 September 2026 for `feat/pilot-hardening`, based on timer commit `2c5b42d`. Engineering candidate: **`547142c`** (unverified native build; **not ready to install for acceptance**). See [hardening status](../pilot-hardening/STATUS.md). SMS is outside this candidate and must not send messages.

**Engineering hardening is still in progress. This guide is a test procedure, not a release approval.** Hosted setup, restore protection, and physical-device acceptance must each have evidence before their gates can pass.

**Start with Section 1. Do not assume your currently installed app or public website contains these changes.** The previous verification used local databases, simulators and provider fixtures. This file does not authorize or perform deployment or live sending.

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
| Compatible deployment | API and database include `20260930010000_delivery_trust_boundary` and `20260930011000_public_link_budget`; the API uses service-only gateway routines. Deploy them together in a controlled development maintenance window. Old backend functions fail closed after grants are tightened. Viewer and timer-aware templates must match the recorded candidate. |
| Delivery | Resend sender/webhook and scheduled dispatch are configured; provider records can be inspected by engineering. No fake provider or simulator fixture is used. |
| Scheduling | Escalation dispatch and timer expiry/retention jobs are present and healthy. |
| Isolation | Only agreed test accounts/recipients can receive this session's messages. Production remains untouched. |
| Signing and identity | The real app launches from the Home Screen without a debugger or UI-test launch arguments. CAPTCHA/signup works; it is not bypassed for the device trial. |
| Observation | An engineer can correlate redacted event references with server acceptance, queue claims, provider IDs and signed callbacks without exposing secrets. |

The currently known viewer address is `https://www.signalword.app`, but the domain alone does not identify which backend/build it uses. Engineering must verify the deployed version and routing. Do not replace a public deployment merely to run these tests without a separate deployment decision.

**Ready to begin only when engineering confirms the table above.** If a feature/control is missing, record **BLOCKED — build/deployment mismatch**; do not substitute an older app and count it as passing.

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

1. Engineering first confirms that the Sentry integration's build and serialized-payload privacy regression passed for this candidate. If not, record **BLOCKED**.
2. Confirm a dedicated development Sentry project, an approved retention/privacy configuration and an explicitly enabled signed build. Reporting is disabled when configuration is absent.
3. Resolve all incidents and cancel timers. Engineering supplies an isolated diagnostic build or test-only crash procedure; do not add a public crash button.
4. Launch from the Home Screen without the debugger, perform the agreed diagnostic crash, then relaunch to allow reporting.
5. Engineering verifies the event corresponds to this build and inspects the actual payload. Contact details, exact coordinates, capability URLs, request bodies, breadcrumbs and secret phrases must be absent.
6. Verify useful crash frames/build identity remain, and repeat normal TEST creation with telemetry unreachable. Reporting failure must not block alert creation.
7. Remove the diagnostic build/control and repeat the normal launch. Record **BLOCKED** until a real signed-device result exists.

### O3 — Restore and deletion protection

**Do not run a restore drill until the independent journal and enforced restore gate are implemented and locally verified. They are currently an engineering blocker.**

The eventual isolated drill must record: quarantine enabled before restoring; journal coverage for the backup; deletion/withdrawal replay; revoked links still denied; old sends not restarted; uncertain provider outcomes reconciled; explicit reopen approval; measured RPO/RTO. A successful database restore by itself is not a pass. Use no real recipient links or production data in the drill.

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

Do not count any of those as passed now. Full engineering details: [SMS integration boundary](SMS_DELIVERY.md).

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

Related files: [consolidated handoff](HANDOFF.md), [contact implementation](CONTACT_ESCALATION.md), [timer implementation](CHECK_IN_TIMER.md), [SMS boundary](SMS_DELIVERY.md).
