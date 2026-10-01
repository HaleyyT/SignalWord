# Build 5 TestFlight handoff — 30 September 2026

Source: 1550d09, feat/hosted-restore-compatibility. Version 1.0 (5). Clean git archive snapshot.

## Changes

- Confirmed invited accounts initialize their own missing profile; existing authentication and deletion checks remain enforced. Backend migration is live.
- Sign out is separate from account deletion and preserves server data. Active alerts, active timers, and pending local sends must be finished before switching accounts.
- Old API responses cannot cross a local session change. Password entry is retained through the CAPTCHA sheet, and an uncertain invitation has a read-only status action.

## Verification

All release-preflight gates pass. Node 218, viewer 44, database 325, core Swift 47, crash-reporting 1, Supporter 9 and simulator UI 22 pass. No skipped UI tests or runtime warnings. Actual simulator screenshots were inspected; fixtures do not prove live delivery or purchases.

Signed Release archive and normal App Store export pass. Bundle com.signalword.app, team NM65T6PR46, App Group group.com.signalword.shared. Distribution debug entitlement is false, no device list, icon/privacy manifest bundled and binary/dSYM UUIDs match. The actual app has the intended Supabase project voepalyamwgenceawdvl, matching anon/public key, CAPTCHA configuration and Apple RevenueCat SDK key. No reviewer email is embedded in the executable. See ../evidence/build5-2026-09-30/artifact-verification.json.

Owner verified after the backend repair: reviewer contact invitation delivered to a controlled inbox, consent confirmed, People displays Email confirmed. The earlier successful login was OTP; password login is still a separate acceptance item.

## Installed candidate acceptance

1. Update through TestFlight and confirm 1.0 (5). Do not delete the reviewer account.
2. Complete one labelled TEST: receive, acknowledge, then resolve in the app. Relaunch and check the state stays correct.
3. With no active alert or timer, use Settings → Sign out. Sign back in using the reviewer email and existing password, completing CAPTCHA. Confirm consent/contact survives.
4. Open Settings → Supporter appearance. Verify the localized store price corresponds to the owner-configured USD 5.99 base price. Complete a TestFlight sandbox purchase, select a theme, relaunch, and restore. Record the RevenueCat sandbox transaction separately.
5. Keep a dedicated recipient inbox available for independent review; a recipient does not need a second SignalWord/Google account. Private review credentials belong only in App Store Connect.

Upload succeeded at 21:20 Sydney. Apple readback shows Build Uploads Complete and Build 5 Missing Compliance. Its encryption declaration is open for the owner to complete; the new build has no tester group assigned yet. Build 4 remains selected in the App Store version until replacement acceptance. No App Review submission or public release performed. Hosted H04/H08/H11/H16/H17, real password/purchase acceptance, IAP review screenshot/association and final store privacy/metadata/screenshots remain release gates. No >=95 readiness score or Apple approval guarantee is claimed.

Artifacts: /private/tmp/SignalWord-1.0-5-Release.xcarchive and /private/tmp/SignalWord-1.0-5-export/SignalWord.ipa. Logs and full simulator attachments are under /private/tmp/signalword-build5-*.
