# Build 6 focused repair and TestFlight handoff — 1 October 2026

**Superseded:** use [Build 8 acceptance instructions](BUILD8_TESTFLIGHT_HANDOFF.md). The later concrete Home/navigation palette defect was repaired in commit 43ee3fa. Both final appearance simulator journeys pass; actual replacement device acceptance remains open. Preserve the results below as historical Build 6 evidence.

This supersedes Build 5's instructions for authentication, returning-account recovery and Supporter appearance. It is a testing candidate, not a declaration that all release gates passed.

## Exact candidate and changes

Source `faa650bce06a3700e226e8334623531b9c2e31f3`, branch `feat/hosted-restore-compatibility`, version **1.0 (6)**. Clean git archive snapshot; normal App Store distribution export. Bundle `com.signalword.app`, Team `NM65T6PR46`, App Group `group.com.signalword.shared`.

| Commit | Change | Acceptance affected |
|---|---|---|
| 340fcaa | Distinct sign-in errors; serialized refresh and bounded retry; same-account reauthentication; preserve contact/readiness on failed reads; restore appearance at launch/foreground | Password/CAPTCHA login, returning contact, session recovery, colour relaunch |
| 2970f9c | Protected HTTPS recovery page, explicit email-code registration, code-based templates | New-account code flow and password recovery |
| faa650b | Allowlisted operation labels on sanitized API errors | Diagnostics only; no safety contract or migration change |

Build 5's user-passed saved setup, TEST acknowledgement, resolution and early check-in remain valid historical evidence. Repeat a small regression on Build 6; do not erase those earlier results or call them replacement-candidate proof. No TEST-to-REAL, delivery, consent or timer contract was relaxed.

## Completed verification

Swift core 57, crash privacy 1, Supporter 10, Node 223, viewer 44, database 325 in 16 suites and safe-update restore 17 assertions pass. Repository/release preflight, web build, clean signed archive and App Store export pass.

Simulator suite: 22 passed; one existing contact-network journey failed on an offscreen XCUI activation point. The unchanged journey passed its isolated rerun. The new purchase/colour cold-launch fixture journey passed. This is not a single clean 23/23 run and fixtures do not prove Apple purchases, live CAPTCHA or live mail.

The bundled backend URL/public key match **signalword-dev / voepalyamwgenceawdvl**. Build validation rejects blank/mismatched configuration. The signed artifact has the intended RevenueCat Apple key, CAPTCHA, icon and privacy manifest, distribution entitlement `get-task-allow=false`, no development device list, and matching dSYM UUID. Reviewer email/password are absent from the executable. See [artifact verification](../evidence/build6-2026-10-01/artifact-verification.json).

Hosted recovery routes return 200 with no-store and restricted CSP. Supabase Site URL and recovery template point to HTTPS, not localhost. Explicitly approved email-code registration is enabled with email confirmation and Turnstile kept enabled. The existing anonymous-provider setting was left unchanged; the native app does not create anonymous accounts. `user-api` is ACTIVE version 13 with JWT verification true; other function versions are retained in evidence. No migration was introduced by this focused repair.

Apple upload completed at **00:48 Sydney, 1 October**. Apple readback: Build Uploads **Complete**, compliance saved by owner, **SignalWord Internal assigned**. Build detail: [Build 6](https://appstoreconnect.apple.com/teams/f7b5e6dc-616b-47e4-ace2-bac071116633/apps/6817293151/testflight/ios/43b8ed3f-546e-4b13-afaa-61747aa3865c). Focused What to Test instructions are saved. The owner approved and Apple saved primary category Utilities and subtitle “Trusted contacts kept informed” (30 characters). External beta review and public App Review are separate; no final public submission or release was performed here.

Archive `/private/tmp/SignalWord-1.0-6-Release.xcarchive`; IPA `/private/tmp/SignalWord-1.0-6-export/SignalWord.ipa`; SHA-256 `ddb63271475151053510140ff2c6e530d1ba8976c979015e123b9d5e4695adba`. Full local logs/xcresults are referenced in [verification summary](../evidence/build6-2026-10-01/verification-summary.json).

## Latest device report

The owner reports Ocean remains after close/reopen. Lavender is reported as not remaining; the selected checkmark after relaunch is pending clarification because Lavender is close to Standard visually. One purchase unlocks both accents. Keep this item open until the device result is clear. Supplemental tests now exercise switching Ocean → Lavender, cold launch and restore; model tests pass, simulator result pending. No runtime change was made solely on this ambiguous report.

## Exact iPhone acceptance sequence

1. In TestFlight, update SignalWord and verify **1.0 (6)**. Keep the reviewer account and existing contact; do not use Delete account and data. Open Home and People. The confirmed contact must remain and no protected-session warning should appear. Force-close/reopen once and check again.
2. With no active alert, timer or pending send, use Settings → Sign out. Choose Sign in → Use an existing password. Enter `review@signalword.app` and the latest privately set password, complete CAPTCHA, and sign in. An email code is not password-login proof. Home and the same confirmed contact must return without sending another invitation. Relaunch again. If it fails, record the exact visible error and local time; do not reset/delete the account.
3. Open Supporter appearance. If Ocean/Lavender are already unlocked from the earlier sandbox purchase, select Ocean; do not buy again. Force-close and reopen. Check Home's colour before visiting Settings, then return to appearance and tap Restore purchases. The appearance must persist and restore must succeed. Repeat with Lavender. If locked, refresh/restore first; if no entitlement exists, verify the localized one-time price and complete one TestFlight sandbox purchase. Record the actual Apple result separately from fixture tests.
4. Send **one manual TEST** to the already consenting controlled inbox. Acknowledge its matching recipient link, Refresh status, resolve in the app, and check the resolution email. Relaunch: resolved/ready and contact still confirmed. Do not speak a trigger phrase during this manual test. Acknowledgement alone does not resolve an alert.
5. Start one check-in only when no active timer/pending change exists. Wait for server-confirmed active/deadline, tap Check in now immediately, refresh: checked in confirmed. Do not run another missed-deadline REAL escalation just to repeat the already-passed test.
6. In a separate controlled account/inbox, test Create account → email code → CAPTCHA → code verification. Test Forgot password at `https://www.signalword.app/auth/recovery` with a fresh email. The owner enters/submits the new password personally. Return to app and use the password route. Reused/expired links should show an honest error. If you reset the reviewer password, update Apple's private review field before submission; do not put passwords in GitHub.
7. Recheck the configured **TEST** Shortcut/Vocal Shortcut once, including the physical states needed by the earlier device matrix. Its result must remain TEST. Any REAL voice test requires the controlled contact to expect it and explicit resolution afterward.

Report build, step, timestamp, exact displayed result and a screenshot without credentials/recipient links. Stop at the first account/session/purchase failure. A recipient needs a consenting email inbox and browser, not a second Google or SignalWord login.

## A. TestFlight / Physical Acceptance — YELLOW

Completed: focused repairs, regression, signed artifact, upload/processing, owner compliance, internal group. Remaining: the exact Build 6 device sequence above. Failure retained: simulator interaction flake passed on isolated rerun; previous Build 5 password/session/colour failures require replacement proof. Release blocker: real device password/CAPTCHA, contact persistence and Apple purchase/restore.

## B. Apple App Review Submission — YELLOW

Build: uploaded/processed; compliance owner-saved. IAP: `com.signalword.supporter.appearance`, non-consumable, USD 5.99 base price; RevenueCat `supporter` offering/entitlement and lifetime package configured. Actual replacement purchase/restore and real IAP review screenshot still pending. Reviewer login: latest password route must pass on Build 6 without owner's inbox. Live draft still selects Build 4; six existing screenshots are uploaded but need comparison with the accepted candidate. Review sign-in and contact fields are blank, age rating is not configured, and final App Privacy and same-submission first-IAP association remain pending. Description/support link need the Build 6 draft adjustments below. Use [prepared review notes](APP_REVIEW_BUILD6_NOTES.md); credentials only in Apple's private fields. Do not click final Submit for Review before acceptance and owner approval.

## C. Public App Store Release — RED

No public approved/released listing verified. Manual release remains intended. TestFlight availability is not public App Store release. Verify the public listing and store purchase after approval before claiming release.

## D. Shipaton Submission — RED

RevenueCat project ID **proje0c77650**. Devpost SignalWord remains an incomplete draft. Ordinary entry requires public store release, working RevenueCat purchase, judge premium access, 1024 icon, 1179×2556 screenshot without device frame and public <=2 minute video. User is preparing video. Do not claim complete category responses or judge unlock proof from dashboard mapping alone. [Official rules](https://revenuecat-shipaton-2026.devpost.com/rules) were refreshed through the Devpost connector: deadline **1 October 2026 16:45 Sydney**. The student Next Gen exception may be relevant to the user's USYD enrollment, but is not selected/verified here; it requires the corresponding academic and public open-source/video conditions. App Store remains the owner's preferred path.

## E. Final Quality

Candidate faa650b / 1.0 (6), evidence 1 October 2026. Engineering verification passes within the documented limits; no >=95/96 release score or guaranteed Apple approval is justified yet. H04 full replacement human auth/recovery, H08 actual managed restore, H11 fresh provider replay and H16 retained duplicate p95 2,020 ms against 2,000 ms remain open; H17 coordinated freeze cannot be relabelled PASS. Supabase Pro upgrade alone does not prove a managed restore. Preserve the earlier evidence and retest through bounded approved workflows.

## F. Exact Owner Actions

1. Update to Build 6 and report the acceptance sequence, especially password/returning contact and colour/restore.
2. Perform fresh recovery/password entry personally if testing recovery; keep Apple credentials synchronized privately.
3. Provide the actual device IAP review screenshot and finish the public demo video; choose a legitimate judge-access path when available.
4. Provide any required bounded paid-restore/recipient-consent authorization for remaining hosted gates.
5. After all required gates and live draft checks, approve final App Review submission; after Apple approval, authorize manual public release.

No additional plan purchase is inferred from this handoff.

## G. Exact Engineering Actions

After device results: diagnose any remaining failed step using sanitized operation labels; retain successful evidence. Finish live App Privacy/age/metadata/screenshots and first-IAP association; attach accepted Build 6 to the review draft. Complete required bounded hosted replay/load/restore evidence and the coordinated environment manifest. Confirm independent reviewer access, then present the concrete submission for owner approval. Verify public listing and complete Devpost only after its actual requirements are met. No unrelated redesign or feature expansion is needed.
