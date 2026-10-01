# Build 8 final candidate and acceptance handoff — 1 October 2026

## Latest Apple status — 04:16 Sydney, 1 October 2026

**SUBMITTED: Waiting for Review.** Apple independently shows two submitted items: **iOS App 1.0 (8)** and **SignalWord Supporter Appearance**, both Waiting for Review. Submission ID `871aa417-f89f-48d8-b7ee-5bb67d86c2f8`. The owner provided the required IAP screenshot and confirmed submission; the browser readback verifies receipt. App download pricing is free. Automatic release was saved before submission.

[Open the received submission](https://appstoreconnect.apple.com/apps/6817293151/distribution/reviewsubmissions/details/871aa417-f89f-48d8-b7ee-5bb67d86c2f8). [Redacted evidence](../evidence/build8-2026-10-01/apple-submission-readback.json).

This closes the Apple IAP screenshot, association, and final submission tasks. It does **not** establish Apple approval, public store availability, Devpost submission, or completion of the independent hosted operational gates. The owner reports the remaining account setup completed; exact final DSA status has not been independently retained. Earlier checklist/status sections below are the historical pre-submission audit and must not be mistaken for the latest submission status.

## Historical candidate and pre-submission audit

This replaces the Build 6/7 testing instructions. Build 8 is the intended submission candidate; the owner has passed the focused password/session and both appearance/Apple-restore acceptance checks. This does not assert Apple approval or completion of hosted release gates. Keep this candidate unchanged unless a release blocker is found.

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

Focused replacement acceptance is **GREEN**: the owner reports password/CAPTCHA login, same confirmed contact and warning-free relaunch passed on TestFlight 1.0 (8); both Ocean and Lavender remain selected through relaunch and Restore purchases. This closes the reported session/password/appearance defects. Keep their earlier failures as historical evidence. The small TEST/resolve and early-check-in Build 8 regression, and independent new-account/recovery acceptance, remain unreported; do not duplicate a purchase or delete the reviewer account.

## B. Apple App Review Submission — YELLOW

Build: Build 8 normal App Store upload, selected and saved in the version draft after focused device acceptance. The fresh browser readback shows build 8, its matching Apple build ID, and Save disabled. IAP: non-consumable `com.signalword.supporter.appearance`, US base USD 5.99; RevenueCat supporter entitlement/offering and lifetime package mapped. Replacement Apple restore and both accents passed on the owner device. A new purchase is unnecessary if already unlocked. The actual Build 8 IAP review screenshot and same-submission association remain open. First IAP must accompany the first app submission.

Reviewer login passed on Build 8. Apple's saved private sign-in fields match the dedicated account and latest password. The owner entered review contact details; all four fields are nonempty. No credential or private contact values are stored in this evidence. The prepared 2,928-character notes match Apple's saved draft.

Privacy: ten audited data types are **published** in Apple after explicit owner legal approval. Fresh Apple readback shows Published a few seconds ago and all ten types present. Purchase history is unlinked, used for functionality/analytics; safety identity/contact/location/workflow/delivery diagnostics are linked for functionality, with no tracking. The owner's legal publication confirmation was received and applied. Approximate location and delivery diagnostics now appear in Build 8's manifest. No Sentry crash collection is enabled in this artifact. Both the app and RevenueCat bundled manifests were checked: SDK purchase-history linkage/purposes are covered, and tracking is disabled in both. [Aggregate audit](../evidence/build8-2026-10-01/privacy-aggregate-audit.json).

Metadata: accurate public description, actual support URL and privacy URL saved; approved Utilities category and 30-character subtitle saved. Content Rights is saved as no third-party content after owner confirmation; the external OpenStreetMap link does not embed map tiles in this binary. Apple now shows global 4+ with regional exceptions. The owner approved the exact questionnaire choices, but complete saved-answer readback remains to be retained. DSA currently shows non-trader; owner self-assessment confirmation was requested because in-app revenue/business activity is relevant. Build 8 shows Ready to Submit with no Missing Compliance warning at readback. Six existing App Store screenshots need final accepted-candidate comparison. Prepared [Build 8 review notes](APP_REVIEW_BUILD8_NOTES.md) describe password login, optional recipient inbox, both accents, TEST/REAL separation and timer limits. The earlier required-contact-field rejection is resolved: owner contact details and the prepared review notes are now saved and read back. No final Submit for Review performed.

## C. Public App Store Release — RED

No Apple approval/public listing verified. The owner specifically approved **Automatically release this version**, and it is saved with Build 8. It removes the later manual release step; it does not accelerate review or guarantee immediate publication. Apple says store publication can take up to 24 hours after approval. TestFlight and Ready to Submit are not App Review approval. Actual approval, public URL and production store functionality remain necessary.

## D. Shipaton Submission — RED

RevenueCat project ID **proje0c77650**. The ordinary entry still needs a public App Store URL, working RevenueCat purchase and legitimate judge premium access. The 1024 icon exists; a final 1179×2556 frame-free screenshot and public <=2 minute demo must be verified. Devpost remains an incomplete draft; descriptions/category responses must match actual demonstrated behavior. Peace/Design/HAMM responses and final submission are not verified complete.

The recorded official deadline is **1 October 2026 16:45 Sydney**. Store publication is the preferred path; App Review timing is outside our control. The student's Next Gen exception has separate public-source/academic/video conditions and has not been selected or satisfied here. [Official rules](https://revenuecat-shipaton-2026.devpost.com/rules).

## E. Final Quality

Candidate 0326ece / 1.0 (8), evidence 1 October 2026. The focused engineering/artifact checks pass within the stated scope. A >=95 release score or guaranteed Apple approval is not supported while physical, submission and hosted operational gates remain open.

Closed focused gates: Build 8 reviewer password/session/contact and both appearance/restore checks; saved private review fields, contact information and clear review notes; accepted Build 8 selection and owner-approved automatic release. Critical open gates: small replacement regression, complete saved age-answer readback and DSA owner self-assessment, first-IAP screenshot/association and final complete draft readback. H04 full human auth/recovery, H08 actual managed restore, H11 fresh provider replay and H16 retained duplicate p95 **2,020 ms versus 2,000 ms** remain open. The coordinated H17 environment freeze cannot be marked PASS. Pro upgrades and isolated restore fixtures do not prove a hosted managed restore. Preserve failed evidence and use bounded authorized retests.

## F. Exact Owner Actions

1. Focused phone acceptance passed. Retain the reviewer account/contact and purchase. Report only the remaining small TEST/resolve and early-check-in regression if performed on Build 8.
2. App Privacy is published. Confirm/update the DSA self-assessment; trader contact details are public in EU storefronts and belong in the owner-operated compliance flow. Age questionnaire answers are owner-approved and Apple displays a saved rating; Content Rights is saved. App Review contact information and verified private reviewer credentials are already saved.
3. Provide the actual device IAP screenshot and public demo video. Supply any required consent/paid managed-restore approval for the remaining bounded hosted gates.
4. The owner has explicitly authorized App Review submission when ready. Submit after required gaps close and final draft readback succeeds; do not ask again for the same ordinary submission authorization. Automatic release after approval is already specifically authorized and saved. Devpost final confirmation follows its actual eligibility/readiness.

No further service plan purchase is required by this handoff.

## G. Exact Engineering Actions

Apple processing/internal assignment and readback are complete. Diagnose only reported failed acceptance steps; preserve passed milestones. Private review notes, contact details and accepted Build 8 selection are complete. Retain the complete saved age-answer readback, retain published privacy readback, resolve DSA owner self-assessment, and finish actual first-IAP screenshot/association and final screenshot/readback checks. Stage bounded managed restore/provider replay/load verification with necessary consent and authorized scope; freeze the coordinated manifest only after its prerequisites pass. Present the concrete review submission for owner approval. Verify public listing/store behavior, then complete Devpost once its actual requirements are met.

Fresh Apple draft readback: [redacted submission evidence](../evidence/build8-2026-10-01/apple-submission-readback.json). No final review submission has occurred.

Apple account audit: Supporter US base price is USD 5.99, 133 territories selected and clear purchase notes saved; the required IAP screenshot is empty. Encryption source uses Apple OS facilities; no proprietary/independent crypto implementation was found. The archive has no ITSAppUsesNonExemptEncryption automation key, but Apple shows no Missing Compliance warning. Utilities is neither a game nor a medical/treatment app; Vietnam game licence and regulated-device documentation are not applicable to the audited scope. DSA status is an owner self-assessment, not a field we can infer from a free app price.

## Apple draft validation — approximately 03:20 Sydney

Add for Review returned **Unable to Add for Review: An unexpected error was encountered when submitting for review.** One bounded retry after a requested browser reload returned the same message. Apple did not provide a specific missing-field list. Build 8 and automatic release still read back correctly; no final Submit for Review was sent. Complete the required IAP screenshot/association and DSA owner assessment, then retry. If the unexplained error remains after requirements are complete, escalate through Apple support rather than claiming a successful submission. The owner has authorized ordinary submission when ready; that does not remove required legal declarations or unresolved release gates.
