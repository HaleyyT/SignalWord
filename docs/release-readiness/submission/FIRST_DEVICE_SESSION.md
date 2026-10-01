# First device session: A1 → C1 → C2 → L1 → L2

**BLOCKED until hosted H01–H17 pass and a manifest is frozen.** This is preparation, not an installation instruction to execute now. No later scenarios until these five cases pass. Existing failure evidence is retained.

## Candidate and signing prerequisites

The release-preparation branch is `feat/hosted-restore-compatibility`. App version/build **1.0 (2)**; this is not yet a frozen candidate. Use the exact commit in the eventual frozen manifest, never the moving branch tip. API contracts v1 and v2. Development Supabase `voepalyamwgenceawdvl`; viewer `https://www.signalword.app`; authority `https://authority-dev.signalword.app`.

Open **apps/ios/SignalWord.xcodeproj**, scheme **SignalWord**, target **SignalWord**, configuration **Release**. Bundle **com.signalword.app**, App Group **group.com.signalword.shared**, minimum iOS **18.0**. Use the activated paid Apple Developer team that owns both identifiers. Team ID is unverified and must be read from the membership/profile, not inferred from an email or Personal Team. App Groups and distribution require suitable active membership/provisioning. Do not change identifiers or remove the group to bypass errors.

Source entitlements contain only `com.apple.security.application-groups = [group.com.signalword.shared]`. Signing adds the owned team/application identifiers and applicable profile entitlements. No push, critical alert, microphone, speech-recognition, background location or silent emergency-call capability is requested. Location While Using and Face ID have usage descriptions; optional timer reminders use local notification authorization.

Set these build settings in an **untracked external xcconfig**, not shell history or a committed secret file:

| Build setting | Value |
|---|---|
| SIGNALWORD_SUPABASE_URL | https://voepalyamwgenceawdvl.supabase.co |
| SIGNALWORD_USER_API_URL | https://voepalyamwgenceawdvl.supabase.co/functions/v1/user-api |
| SIGNALWORD_SUPABASE_PUBLISHABLE_KEY | Development dashboard → Project Settings → API Keys → publishable client key; verify project ref first. Legacy anon key is supported. Never secret/service-role |
| SIGNALWORD_VERIFICATION_URL | https://www.signalword.app/onboarding/verify.html |
| SIGNALWORD_TURNSTILE_SITE_KEY | 0x4AAAAAAFFb3ETKlwBxFCNF |
| SIGNALWORD_CRASH_REPORTING_ENABLED | NO until development telemetry acceptance passes |
| SIGNALWORD_SENTRY_DSN | Empty while disabled; approved development DSN only after verification |
| DEVELOPMENT_TEAM | Verified owned ten-character Team ID |

In xcconfig URLs use `https:/$()/host` so `//` is not treated as a comment. The signed-artifact verifier checks the resolved URLs. Never package service-role, Resend, webhook, encryption, authority or Turnstile secret keys.

## Installation after the gate is released

1. Engineer supplies the frozen manifest, exact commit, verified Team ID and external configuration path. Confirm hosted compatibility is 17/17 and enrollment remains closed with an approved controlled Auth path. A1 cannot pass while fresh enrollment is simply denied; never disable CAPTCHA/signup protection as a workaround.
2. Open the project from that checkout. Select the owned team and registered iPhone 13 Pro. Confirm Developer Mode and pairing. Do not change Bundle ID/App Group.
3. Build the Release device product with the external configuration. Xcode's Scheme → Run → Build Configuration must be Release for this session; retain the configuration used. First build without running, then verify:

```bash
SIGNALWORD_EXPECTED_TEAM=VERIFIEDTEAM node scripts/verify-ios-installation.mjs /absolute/path/SignalWord.app
```

Replace `VERIFIEDTEAM` with the verified value. The script validates the signature, profile, expiry, team, App Group, version/build and development config without printing credentials. It expects a device profile; it is not the App Store distribution-profile verifier.

4. Install that verified product with Xcode Devices and Simulators → paired iPhone → Installed Apps → +. Launch from the Home Screen, without an attached debugger for background/locked trials.
5. Expected app is **SignalWord 1.0 (2)**. Inspect the installed app metadata in Xcode Device Hub and match the verified Info.plist. There is currently no dedicated in-app version label; do not invent one or infer a version from its appearance.

## Evidence harness

Operator creates a private case directory outside Git, mode 0700. Record UTC start/end, candidate commit, build configuration digest and a local case label. Map event/request UUIDs to that label privately. Do not put private phrases, capability links, emails or coordinates in screenshots or reports.

For each created event, run the read-only query using the **development** database connection supplied privately through an operator service file:

```bash
psql service=signalword_dev -v event_id=CONTROLLED_EVENT_UUID -f scripts/physical-evidence.sql > /private/path/C2-backend.txt
shasum -a 256 /private/path/C2-backend.txt
```

No database URL/password on the command line. Query output includes only event/delivery/recipient record IDs, timestamps, statuses and callback counts. It cannot establish actual inbox receipt or a physical action: record those separately. Snapshot before deletion, because deletion removes incident rows. After deletion, use the existing deletion-status HTTP endpoint with the receipt stored privately; retain only status/deleted boolean. Never paste its header. Auth/consent evidence comes from canonical profile/contact-network HTTP state and controlled user/session continuity, not an invented SQL permission bypass.

Create a private JSON input with `commit` (40 hex), `environment: "development"`, and cases containing `id`, `status` (PASS/FAIL/BLOCKED/NOT_RUN), optional `latencyMs`, `evidenceHashes` (SHA-256 files), `defectHashes`, and `retestOf` (prior report SHA-256). Then:

```bash
node scripts/acceptance-report.mjs /private/path/session-input.json /private/path/new-session-summary.json
```

The report includes only allowlisted values and digests, refuses missing proof for PASS, preserves ordering, and refuses to overwrite a prior report. Store the private mapping securely; a digest references evidence but does not prove its contents are correct. Engineer reviews the evidence before marking PASS. Each new retest is a new report referencing the old one.

## A1 — Fresh account and human CAPTCHA

Prerequisite: frozen compatible candidate, approved controlled enrollment mechanism, network available, no timer/incident. Actions: launch; complete the real Turnstile widget; return to setup; relaunch once. Expected: readiness appears only after server acceptance and the same intended identity returns. Operator: record Auth outcome and canonical profile/session continuity, no raw JWT/widget proof. PASS only if genuine human challenge and identity continuity both work. Cleanup: keep this controlled account for C1. Failure: stop, send case label, UTC time, redacted screen, exact visible error and candidate digest; never send CAPTCHA token. Do not repeatedly create accounts.

## C1 — Contact A consent

Prerequisite: A1 PASS, consenting inbox A ready. Actions: enter display name and A's contact details; send one invitation; recipient opens newest confirmation and explicitly confirms; sender refreshes; refresh/relaunch once. Expected: pending before explicit consent, confirmed afterward, no duplicate invitation from a retry. Operator: canonical contact status, invitation attempt/provider/callback states and recipient-reported receipt. PASS only after all agree. Cleanup: retain confirmed A for C2. Failure: preserve original timestamps, no replacement invitations until operator checks ambiguous outcome.

## C2 — Manual TEST end to end

Prerequisite: C1 PASS, A told this is a TEST, no timer. Actions: manually send TEST once; wait for acceptance; A opens email; verify opening alone does not acknowledge; A presses Acknowledge; sender relaunches; authenticate and resolve; A refreshes. Expected: TEST throughout initial/resolution email and UI, one canonical incident, acknowledgement visible after explicit action, recovery after relaunch, resolved view. Operator: query before/after ack/resolve, signed sent/delivered callbacks, one delivery per recipient/message type, acceptance/provider latency measured separately. PASS only when both human observations and backend evidence agree; provider delivery does not prove help or identity. Cleanup: verify resolved and no pending timer/delivery. Failure: stop repeated triggering, save pending/failed state and operator correlation; do not delete the account before evidence capture.

## L1 — TEST intent discovery

Prerequisite: C2 PASS. Actions: iPhone Settings → Accessibility → Vocal Shortcuts → setup → select **Send TEST Alert**; choose and train a private rehearsal phrase distinct from REAL; verify **Trigger Alert** is a separate action. Expected: TEST action visible and explicitly named. Operator evidence: no backend event is expected from merely configuring it. PASS proves discovery only. Cleanup: keep TEST shortcut for L2; do not share or record the phrase. Failure: record iOS/build and redacted action list, stop L2.

## L2 — Execution conditions, one at a time

Prerequisite: L1 PASS, recipient awake, no active timer. For each condition **foreground → background → locked → app terminated**: speak TEST phrase once, observe sender state after opening/unlocking, recipient verifies TEST email and acknowledges, sender resolves, operator verifies lifecycle and cleanup. Launch from Home Screen without debugger. Record four separate evidence files; L2 PASS only when all four pass. Do not count requiring an unlock as successful locked activation; record actual OS prompt/behavior. Failed condition blocks the claim for that condition and stops later trials. Cleanup every incident before the next; end with zero active incidents/timers and no unexplained queued work. Do not test REAL or timer expiry in this first session.

## Repair/retest loop

Keep failed report/screens/query outputs immutable. Classify root cause and identify affected boundaries. Patch only the responsible slice on the candidate branch; rerun its behavior/security/contract tests and affected local/hosted journeys. Revalidate compatibility and freeze a new manifest only when its hosted gates pass. Issue a new case list: for example signing-only repair → A1 then impacted cases; consent repair → C1/C2; intent/command persistence repair → C2/L1/L2. Do not automatically discard upstream passing evidence, but require revalidation whenever shared code/config changed. Never overwrite failed evidence or reuse an old candidate's PASS as proof of new behavior.
