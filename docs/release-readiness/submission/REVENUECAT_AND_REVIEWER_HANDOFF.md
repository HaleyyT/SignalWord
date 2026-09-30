# RevenueCat and reviewer access — 30 September 2026

Status: PARTIAL IMPLEMENTATION, NOT RELEASE READY. No App Review submission or public release performed.
Candidate: release-readiness worktree, feat/hosted-restore-compatibility, implementation commits 15eea45 (RevenueCat/privacy) and 6232fc4 (reviewer sign-in); version 1.0 (4). No final freeze or archive yet.

## Verified dashboard configuration

- RevenueCat project e0c77650, Apple app app80bbacf3d1, bundle com.signalword.app.
- Owner uploaded the In-App Purchase P8; RevenueCat displayed Valid credentials.
- Created non-consumable com.signalword.supporter.appearance (prod6aaa4bd50b).
- Created supporter entitlement (entl6d39f29cef), attached the Apple product.
- Created supporter offering (ofrngcfffc14360), $rc_lifetime package, attached the same Apple product. Reloaded and verified saved mapping. Screenshot: ../evidence/revenuecat-2026-09-30/signalword-revenuecat-offering.png.
- Existing Test Store products/default offering left intact; application explicitly selects supporter.
- Configured the verified public Apple SDK key in both build configurations. No P8 or secret/admin key stored in source.
- Release simulator build succeeded, version/bundle verified, SignalWordRevenueCatAPIKey matched the verified public key and PurchaseHistory disclosure was bundled. This is compilation/configuration evidence, not an App Store purchase test.
- Added purchase history for functionality and analytics, without tracking. The app uses an anonymous billing identity and does not attach the safety account or safety data to RevenueCat. Updated privacy-page purpose wording. Final aggregate archive and App Store privacy responses still require verification.

## Apple account blocker (fresh dashboard observation)

Free Apps Agreement Active. Paid Apps Agreement Pending User Info. Australia ABN and GST Registration Documents Missing Tax Info. US Certificate of Foreign Status and W-8BEN Active. Banking Processing.
Owner reports ABN application did not authorise them and asks engineering to continue independently. Do not invent an ABN, alter region, submit tax declarations, or assume the restriction only delays payments. Owner must resolve applicability with Apple/qualified adviser. Paid purchase release is not cleared.

## Reviewer implementation

Added standard existing-account password sign-in alongside existing email-code sign-in. It uses Supabase /auth/v1/token?grant_type=password and the existing foreground CAPTCHA. No account is created, no OTP bypass or special reviewer entitlement exists, and normal session refresh/deletion protections apply. Password is held only in view/request memory, cleared after submission/backgrounding, never persisted by the app or placed in URLs. Errors do not disclose whether an account exists.

Owner confirmed no dedicated reviewer account exists. Follow REVIEWER_ACCOUNT_OWNER_STEPS.md. Owner must create/set the dedicated review account's password through the normal provider flow; agent must not create credentials through the UI. Use a separate consenting test contact. Never put credentials in Git, public Devpost text, screenshots, or this document. Enter them only in private App Review sign-in information. Verify the hosted provider permits normal password sign-in for this existing account and that CAPTCHA and refresh work on the final installed candidate. Do not expire or delete the account during review; normal short-lived access tokens must still refresh, not become permanent tokens.

Reviewer instructions after hosted acceptance:
1. Launch, enter the supplied invited email, select Use an existing password.
2. Enter supplied password, tap Verify and sign in, complete verification.
3. Use supplied consenting contact; send TEST and inspect its acknowledgement/status.
4. Settings → Supporter Appearance: inspect optional purchase and Restore Purchases. Safety features need no purchase.
5. TEST and REAL App Intents are separate; configuring iOS Vocal Shortcuts is optional. No continuous app microphone listening, emergency dispatch or delivery guarantee.

## Regression evidence

Repository/contracts/security checks PASS. Node 213 and viewer 44 PASS. Swift core 46 PASS after four password tests added; Supporter 9 PASS. First Node run failed a stale Build-3 fixture; corrected to candidate Build 4 and retained both logs. Password tests cover protected request body, invalid input without network, server rejection without session persistence, relaunch reuse and late response after account deletion.
These tests do not prove real reviewer login or real payment. Updated Release simulator app and viewer builds PASS. The focused password/email-code UI test executed and PASS (1 test, zero failures/skips/runtime warnings); retained password-ui-summary.json identifies the simulator/runtime. Hosted login and physical validation remain pending.

## Remaining next actions

1. Apple non-consumable record: verify/create matching product, price, territories, localization, review screenshot and notes. RevenueCat product creation does not create Apple's product.
2. Configure RevenueCat's complete server notification URL in Apple's production and sandbox fields, Version 2, then verify an actual notification. Currently unverified.
3. Validate password reviewer account, CAPTCHA, onboarding and session recovery against hosted service. Final source changes require new binary; Build 3 does not contain them.
4. Build/install final candidate, run purchase → appearance → relaunch → restore, cancellation/pending/offline and safety while billing fails. Keep product missing/unavailable honest.
5. Physically retest recovery warning after interrupted network/background return; TEST/REAL App Intent discovery and delivery; contact acknowledgement/resolution; timer check-in/cancel/expiry; location denied/allowed; accessibility and account deletion.
6. Close hosted H04/H08/H11/H16/H17, production readiness, final privacy/export/metadata/reviewer audit and freeze. Retain previous failures until superseded by evidence.
7. Final normal App Store distribution archive and validation (not Internal Only), first IAP included with app version, owner approval before submission/public release.
8. Devpost public listing, working purchase proof, <=2-minute video, compliant screenshots/icon and legitimate judge access remain required; mapping alone is insufficient.

References: https://supabase.com/docs/reference/swift/auth-signinwithpassword and https://supabase.com/docs/guides/auth/auth-captcha .
