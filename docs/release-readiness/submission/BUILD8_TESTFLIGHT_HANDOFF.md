# Build 8 final candidate and acceptance handoff — 1 October 2026

This replaces the Build 6/7 testing instructions. Build 8 is the intended submission candidate; it is not an assertion that physical acceptance, Apple approval or hosted release gates have passed. Keep this candidate unchanged unless a release blocker is found.

## Exact artifact and focused changes

Version **1.0 (8)**, source **0326ece1cd5b99e3aea1844e569ac9bb7e88b7d9**, branch `feat/hosted-restore-compatibility`. Built from a clean Git snapshot, not the dirty checkout. Bundle `com.signalword.app`; team `NM65T6PR46`; backend **signalword-dev / voepalyamwgenceawdvl**. No blank/test backend configuration is accepted by the build validation.

- Build 6 repaired returning-account/session recovery, distinct password/CAPTCHA errors and protected HTTPS recovery. Those repairs are retained.
- Commit `43ee3fa` applies the saved Ocean/Lavender selection to Home, shared buttons, headings and navigation. One non-consumable unlocks both. REAL/warning/delivery colours and safety behavior are unchanged.
- Commit `0326ece` adds approximate location and retained delivery diagnostics to the bundled privacy declarations and changes the build number to 8. It does not change runtime behavior.

The normal App Store distribution package uploaded successfully at **02:19 Sydney, 1 October**. Exact retained package: `/private/tmp/SignalWord-1.0-8-upload-export/SignalWord.ipa`; SHA-256 `797d2f58560a0e92912bdece6b0e7542bd99ab0e6cd0b5906b954cfe160c297c`; binary/dSYM UUID `A1198288-69C1-3DAC-AF26-E7175EBA1968`. This is not a TestFlight-internal-only export.

All **19 artifact checks passed**, including signature, version, backend/public-key project and role, RevenueCat Apple key, CAPTCHA, team/App Group, icon, matching dSYM, all 10 audited privacy types, tracking disabled, no audio permission requests, disabled crash reporting, and absence of reviewer credentials in the executable. [Exact artifact evidence](../evidence/build8-2026-10-01/artifact-verification.json).

## Verification and its limits

Repository verification passes. The final appearance UI suite passed **2/2**, no skipped tests, failures or runtime warnings: one fixture purchase unlocks both; Ocean and Lavender each survive termination/relaunch and restoration; safety remains available. Both Home screenshots were inspected and show distinct blue/purple accents with amber REAL controls retained. [UI summary](../evidence/build8-2026-10-01/appearance-ui-summary.json). This suite ran against the Build 7 runtime changes, which Build 8 retains unchanged; Build 8 has a fresh signed artifact audit. Fixture purchases do not prove a real Apple transaction.

Earlier regression remains recorded: Swift core 57, crash privacy 1, Supporter 10, Node 223, viewer 44, database 325 in 16 suites and isolated safe-update restore 17 assertions passed. The larger simulator run had 22 passes and one contact-network XCUI activation failure; that unchanged journey passed an isolated rerun. Do not report it as a clean 23/23 run. See the [historical Build 6 handoff](BUILD6_TESTFLIGHT_HANDOFF.md).

CLI distribution export failed because it lacked a local distribution private key/account binding. Xcode's signed-in cloud-managed distribution succeeded. The successful exported/uploaded package was independently verified; the failed attempt is retained in `/private/tmp/signalword-build7-export.log` and its retry log.

Your earlier passed saved setup, TEST acknowledgement, explicit resolution and early check-in are retained as historical device milestones. The latest candidate still needs the small regression below. No account deletion, purchase repetition or missed-deadline REAL repeat is required.

## Exact phone acceptance sequence

1. Update in TestFlight and confirm **1.0 (8)**. Keep the account and existing contact. Open Home/People: the contact remains **Email confirmed**, with no protected-session warning. Force-close/reopen once.
2. Only with no active alert, timer or pending operation, use Settings → Sign out → Sign in → Use an existing password. Use `review@signalword.app` and its latest privately set password; complete CAPTCHA. Do not use an email code for this check. Home and the same confirmed contact must return without another invitation. Relaunch: no session warning and contact preserved. If this fails, record the exact visible error and time; do not delete/reset the account.
3. Open Settings → Supporter appearance. If already unlocked, do not purchase again. Select **Ocean**, return to Home, force-close/reopen, then inspect the checkmark and Restore purchases. Repeat **Lavender**. Each must remain visibly selected on Home and in Settings after relaunch/restore. One purchase unlocks both colours. A missing Buy button is expected when already entitled. If locked, refresh/restore first; only if no entitlement exists, complete one TestFlight sandbox purchase and record Apple's actual result.
4. Send one manual **TEST** to the existing consenting controlled inbox. Acknowledge its matching recipient link, refresh, then explicitly resolve in the app. Verify the resolution email and ready/resolved Home after relaunch. Acknowledgement is separate from resolution. Do not speak the trigger phrase during this check.
5. With no active timer/pending change, start one check-in, wait for server-confirmed active/deadline, then Check in now immediately and refresh. It must show server-confirmed checked in. Do not repeat a missed deadline just to re-prove the earlier successful REAL escalation.
6. Supply an actual Build 8 Supporter-screen screenshot for IAP review, without private email, password or recipient links. Independent sign-up/recovery uses a separate controlled account; do not delete the reviewer account. Password changes are entered personally and Apple's private sign-in fields must stay synchronized.

Report **build, step, local time, displayed result and a screenshot with secrets removed**. Stop at an account/session/purchase failure. A trusted recipient needs a consenting email inbox and browser, not a second Google or SignalWord account.

## A. TestFlight / Physical Acceptance — YELLOW

Completed: focused repairs, repository/regression verification, 2/2 final appearance UI checks, clean archive, 19/19 signed artifact checks and successful Apple upload. Apple processing is Complete, status Ready to Submit, SignalWord Internal has one tester and What to Test is saved. No Missing Compliance warning was present. [TestFlight readback](../evidence/build8-2026-10-01/testflight-status.json).

Remaining/release blocker: actual Build 8 password/CAPTCHA login, same-contact/session persistence and Apple restore plus both appearance selections on the phone. A successful OTP login does not substitute for password proof. Earlier colour and session failures remain recorded until these replacement checks pass.

## B. Apple App Review Submission — YELLOW

Build: Build 8 normal App Store upload; select it in the version draft only after acceptance. IAP: non-consumable `com.signalword.supporter.appearance`, US base USD 5.99; RevenueCat supporter entitlement/offering and lifetime package mapped. Actual replacement purchase/restore and IAP review screenshot remain open. First IAP must accompany the first app submission.

Reviewer login: private credentials must be device-verified and saved in Apple's private fields; no password in this repository. Review contact needs the owner's reachable name, international phone and email. This is separate from reviewer sign-in credentials.

Privacy: ten data types are prepared in Apple, matching the audited implementation. Purchase history is unlinked, used for functionality/analytics; safety identity/contact/location/workflow/delivery diagnostics are linked for functionality, with no tracking. Publishing the responses requires the owner's legal confirmation. Approximate location and delivery diagnostics now appear in Build 8's manifest. No Sentry crash collection is enabled in this artifact. Both the app and RevenueCat bundled manifests were checked: SDK purchase-history linkage/purposes are covered, and tracking is disabled in both. [Aggregate audit](../evidence/build8-2026-10-01/privacy-aggregate-audit.json).

Metadata: accurate public description, actual support URL and privacy URL saved; approved Utilities category and 30-character subtitle saved. Age rating/content-rights declarations remain owner-confirmed requirements. Build 8 shows Ready to Submit with no Missing Compliance warning at readback. Six existing App Store screenshots need final accepted-candidate comparison. Prepared [Build 8 review notes](APP_REVIEW_BUILD8_NOTES.md) describe password login, optional recipient inbox, both accents, TEST/REAL separation and timer limits. Saving the new review notes was rejected with required first-name/last-name/email/phone errors; the prepared notes remain unsaved in the active draft until the owner supplies those fields. No final Submit for Review performed.

## C. Public App Store Release — RED

No Apple approval/public listing verified. Manual release remains selected. TestFlight and Ready to Submit are not App Review approval. Approval, owner-authorized manual release, public URL and production store functionality remain necessary.

## D. Shipaton Submission — RED

RevenueCat project ID **proje0c77650**. The ordinary entry still needs a public App Store URL, working RevenueCat purchase and legitimate judge premium access. The 1024 icon exists; a final 1179×2556 frame-free screenshot and public <=2 minute demo must be verified. Devpost remains an incomplete draft; descriptions/category responses must match actual demonstrated behavior. Peace/Design/HAMM responses and final submission are not verified complete.

The recorded official deadline is **1 October 2026 16:45 Sydney**. Store publication is the preferred path; App Review timing is outside our control. The student's Next Gen exception has separate public-source/academic/video conditions and has not been selected or satisfied here. [Official rules](https://revenuecat-shipaton-2026.devpost.com/rules).

## E. Final Quality

Candidate 0326ece / 1.0 (8), evidence 1 October 2026. The focused engineering/artifact checks pass within the stated scope. A >=95 release score or guaranteed Apple approval is not supported while physical, submission and hosted operational gates remain open.

Critical open gates: physical reviewer/restore/session acceptance; private review fields, legal privacy/age/content declarations, first-IAP screenshot/association and final draft readback. H04 full human auth/recovery, H08 actual managed restore, H11 fresh provider replay and H16 retained duplicate p95 **2,020 ms versus 2,000 ms** remain open. The coordinated H17 environment freeze cannot be marked PASS. Pro upgrades and isolated restore fixtures do not prove a hosted managed restore. Preserve failed evidence and use bounded authorized retests.

## F. Exact Owner Actions

1. Complete the phone acceptance sequence above; report password/session and both appearance/restore results first.
2. Approve accurate prepared App Privacy publishing; personally confirm legal age/content-rights answers. Enter reachable App Review contact details directly in Apple. Reviewer credentials belong in separate private sign-in fields after successful password testing.
3. Provide the actual device IAP screenshot and public demo video. Supply any required consent/paid managed-restore approval for the remaining bounded hosted gates.
4. After a complete verified draft is presented, approve final App Review submission. After Apple approval, authorize manual public release. Devpost final confirmation follows its actual eligibility/readiness.

No further service plan purchase is required by this handoff.

## G. Exact Engineering Actions

Apple processing/internal assignment and readback are complete. Diagnose only reported failed acceptance steps; preserve passed milestones. Finish private review notes, first-IAP attachment and accepted-build/screenshot readback after device results and owner declarations. Stage bounded managed restore/provider replay/load verification with necessary consent and authorized scope; freeze the coordinated manifest only after its prerequisites pass. Present the concrete review submission for owner approval. Verify public listing/store behavior, then complete Devpost once its actual requirements are met.
