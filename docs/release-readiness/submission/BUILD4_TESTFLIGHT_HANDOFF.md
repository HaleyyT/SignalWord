# Build 4 TestFlight handoff — 30 September 2026

Source: bf836df, feat/hosted-restore-compatibility. Clean git archive source snapshot. Version 1.0 (4).

Archive and normal App Store distribution export succeeded. Upload succeeded at 19:00 Sydney; Apple processing follows. This is NOT Internal Only and NOT submitted for App Review. Signing team NM65T6PR46, bundle com.signalword.app, App Group group.com.signalword.shared, no debug entitlement or provisioned device list. App icon and privacy manifest bundled. Binary/dSYM UUID 94F71FC4-93A2-38A7-8BD1-B40144F61E64 matches.

Bundled backend is exactly https://voepalyamwgenceawdvl.supabase.co; public backend key, Turnstile and Apple RevenueCat SDK configuration populated. Build guards validated both settings and processed Info.plist. No reviewer credential embedded.

Verification: repository/contracts/security PASS; Node 218 PASS; viewer 44 PASS; core Swift 46 PASS; Supporter 9 PASS; simulator UI 20 PASS, zero skips/failures/runtime warnings. Archive and export verification evidence retained under ../evidence/build4-2026-09-30.

Apple purchase: owner chose USD 5.99; existing pricing and 133 territories observed. English US localization saved as Ocean & Lavender theme, description Unlock Ocean and Lavender accent colours. Review notes saved. Review screenshot still missing. Real product retrieval/purchase/restore and reviewer password/CAPTCHA authentication require installed candidate acceptance.

RevenueCat correction: Project Settings explicitly displays proje0c77650. Use that full project ID in Devpost. e0c77650 is the dashboard URL segment. App ID app80bbacf3d1 and supporter mapping unchanged.

Owner reports Resend and Supabase upgraded. This does not close hosted H04/H08/H11/H16/H17; no recovery/load/provider evidence is fabricated. Final release approval and a >=95 score are withheld pending hosted and physical acceptance, IAP, privacy/metadata and final submission checks.

Artifacts: /private/tmp/SignalWord-1.0-4-Release.xcarchive; /private/tmp/SignalWord-1.0-4-export/SignalWord.ipa. Logs: /private/tmp/signalword-release-archive.log, signalword-release-export.log, signalword-release-upload.log, signalword-final-reverify.log, signalword-final-core.log, signalword-final-supporter.log, signalword-final-ui.log.

## Apple processing readback

At approximately 19:13 Sydney Apple lists upload Complete and Build 4 Missing Compliance; Groups (0). Owner export declaration requested. Not yet represented as installable. Production and sandbox notification fields both showed the full matching RevenueCat endpoint after saving; no notification delivery claimed. Apple UI did not expose a version selector in those dialogs. Confirm callback format with the actual sandbox event.

## Follow-up after owner export compliance

Apple Build 4 detail no longer shows the export-compliance prompt, and SignalWord Internal is assigned with one tester. Build 4 is selectable for normal App Store submission; Build 3 remains disabled in that picker. Build 4 was selected and saved in version 1.0. This does not prove installation on the owner's phone.

Version 1.0 was changed from automatic to manual release and saved. Promotional text was replaced with the conservative check-in/rehearsal/email wording from STORE_SUBMISSION.md. Six existing store screenshots are listed but their visual accuracy is not yet revalidated. Review credentials and contact fields were blank at inspection. No App Review submission was performed.

Build 4 has existing-account password sign-in but no sign-out UI. Do not use account deletion to reach reviewer login. Test on a separate clean installation, or implement and test a safe sign-out/account-switch path before recommending a replacement build. An external TestFlight group named Review is separate from the private App Review credential fields.

Owner acceptance next: install/update through TestFlight, confirm 1.0 (4), preserve existing data, verify TEST delivery/acknowledgement/resolution and session recovery; then sandbox purchase/unlock/relaunch/restore. Reviewer authentication and controlled-contact setup remain unverified. IAP review screenshot, first-IAP association, privacy, age rating, review contact and final screenshot audit remain open.
