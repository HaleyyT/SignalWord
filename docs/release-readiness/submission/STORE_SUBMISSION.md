# TestFlight and App Store preparation

**Draft only. No upload/submission/public release approval is implied.** Development is not production; passing the development gates does not authorize publishing a development backend to the public. Closed signup currently also blocks ordinary reviewer onboarding: an approved controlled reviewer access path must exist before review.

## Packaging audit

- Added an opaque 1024×1024 AppIcon asset using the existing website mark, not a UI redesign. Xcode compiles it as AppIcon. Inspect the actual archived icon; no alpha/pre-rounded transparent corners.
- Added `PrivacyInfo.xcprivacy`. UserDefaults uses CA92.1 for app-private preferences and recovery state. App Group command storage uses files/SQLite, not shared defaults. No tracking domains or advertising tracking declared.
- Declared app-functionality data: names, email addresses, manually entered trusted contacts, account identifiers, optional precise snapshot location, alert/timer content and interaction state. Treat as linked to the account even though authentication is anonymous. No address-book permission is used. Do not answer “Data Not Collected.”
- Crash reporting currently disabled. Review the SDK's own bundled manifest and Xcode aggregate privacy report. If enabling Sentry, update disclosures for crash/diagnostic data and verify actual serialized/hosted data. Current declaration is not a substitute for the final archive/privacy audit.
- Existing Face ID text: “Authenticate before resolving an active SignalWord alert.” Location text: “Attach an optional location snapshot to an alert for your trusted contact. Alerts still work without location.” No microphone/speech/background-location permissions should appear.

Owner must review Supabase/Resend/Cloudflare/Sentry processor retention, support-email handling and actual server logs before final privacy answers. Account deletion removes application access; independent opaque revocation records retain restore protection for at least 90 days. Do not promise every operational record disappears immediately.

## Metadata ready to paste after owner approval

**Name:** SignalWord

**Subtitle:** Trusted contacts, kept informed

**Keywords:** safety,contacts,check-in,timer,rehearsal,location,alerts,consent

**Promotional text:** Rehearse your safety plan, notify trusted contacts by email, and use a check-in timer. Clear delivery and acknowledgement states help you understand what happened.

**Description:**

SignalWord helps you share a safety alert with people you trust. Invite up to three contacts, ask them to confirm consent, and practise with clearly labelled TEST alerts.

Send email alerts to everyone immediately, or notify your primary contact first and the remaining contacts after two minutes while the alert remains unresolved. Contacts can open their individual link and acknowledge the alert. An acknowledgement does not verify identity, promise help, or stop escalation. Resolving the alert stops future escalation.

Set a 15-, 30- or 60-minute check-in timer. The deadline is managed by the service; a missed check-in can create a REAL-labelled alert after the grace period. Internet and functioning delivery services are required. Device reminders are supplementary.

You can optionally attach a recent location snapshot. SignalWord does not continuously track your movement. Supported iOS Vocal Shortcuts can invoke separately named TEST and REAL actions after you configure them. Availability and locked-device behavior depend on iOS and must be rehearsed on your device.

SignalWord is not an emergency service and does not contact police or guarantee delivery or response. It does not continuously listen in the background or silently call emergency numbers. SMS and professional monitoring are not available in this version. In an emergency, use your local emergency number or the emergency features provided by your phone.

**TestFlight beta description:** Invitation-only email pilot. Please test only with consenting recipients. Start with account verification, contact consent, a manual TEST and the separately configured TEST Vocal Shortcut. Do not use the beta as your sole emergency plan. Timer-expiry drills require separate agreement because messages are labelled REAL. Send redacted failures with build and UTC time to support.

**What to test:** Follow A1 → C1 → C2 → L1 → L2 in the supplied first-session guide. Stop on a failure and preserve its evidence. Do not run later scenarios until these pass.

**Release notes:** Initial invited beta: consenting trusted contacts, TEST rehearsals, email alert status and acknowledgement, contact escalation, check-in timers, recovery and account deletion.

**Review notes draft:** This build is an invitation-only development pilot, not a police-dispatch service. TEST and REAL are separate actions. Use only the supplied consenting review fixtures and TEST flow. Please do not trigger timer expiry without coordination. Reviewer access instructions and a functioning controlled onboarding path must be supplied privately here before submission. We do not claim a demo account exists yet. Device authentication protects resolution. App Group supports durable command sharing. Contact consent occurs on the recipient website. Account deletion is available in Settings. No purchases or SMS are enabled.

**Support URL:** https://www.signalword.app/support

**Privacy-policy URL:** https://www.signalword.app/privacy

**Marketing URL (optional):** https://www.signalword.app/

Check these URLs unauthenticated on a phone and verify copy/ownership before submitting; current hostname serves development. Keep review credentials out of public metadata.

## Age rating and export compliance

Complete the current App Store Connect questionnaire using actual behavior: no ads, gambling, contests, unrestricted web browsing or medical diagnosis/treatment; recipients receive user-configured safety notices, so review the current user-generated content/messaging questions rather than blindly selecting “None” throughout. Adult-only pilot enrollment is an operational policy, not Apple's calculated age rating. Owner confirms final questionnaire/result and regional obligations.

The client uses system HTTPS/Keychain and Apple cryptography; inspect the final linked archive for any additional crypto before choosing an exemption. Backend encryption does not itself determine the app binary's export answer. Do not set `ITSAppUsesNonExemptEncryption=NO` without confirming eligibility under Apple's questionnaire. Required documentation/territory answers remain owner-reviewed; no invented approval code.

## Screenshots and review assets

Capture the actual accepted candidate with synthetic names and no real emails, locations, links or phrases. Prepare 3–5 screenshots: readiness/TEST entry, consenting contacts, active TEST progress, timer setup with no active expiry, settings/privacy. Do not present mock screens as implemented functionality or show police/live-tracking claims. App is iPhone-only; use the current App Store Connect required iPhone screenshot slot and pixel dimensions. A supported 6.9-inch portrait set (for example 1320×2868 where accepted by the dashboard) avoids upscaling an iPhone 13 Pro capture. Recheck Apple's current specifications at upload. No iPad screenshots unless the supported-device setting changes.

## Archive and upload, after acceptance and membership

1. Verify paid membership, owned identifiers, App Store Connect role, agreements, SKU/app record and export/privacy answers. Retain verified Team ID privately in configuration. No account purchase is automatic.
2. Use exact frozen commit and external development xcconfig for the invited beta. If a new backend/config is required for public release, make a new candidate and repeat compatibility/acceptance; never silently switch an archive's backend.
3. Run the unsigned clean reproduction and relevant regressions first. Then use Xcode Product → Archive on a generic iOS device, or:

```bash
xcodebuild -project apps/ios/SignalWord.xcodeproj -scheme SignalWord \
  -configuration Release -destination 'generic/platform=iOS' \
  -xcconfig /private/path/development.xcconfig \
  -archivePath /private/path/SignalWord.xcarchive archive
```

Do not put service secrets in the xcconfig. No `CODE_SIGNING_ALLOWED=NO` for the submission archive. Do not add `-allowProvisioningUpdates` until the owned team/capabilities are verified.

4. Inspect archive Info.plist, privacy resources, icon, actual entitlements, Team ID, resolved backend config, embedded SDK manifests and symbol UUIDs. Verify the signature:

```bash
codesign --verify --deep --strict /private/path/SignalWord.xcarchive/Products/Applications/SignalWord.app
xcrun dwarfdump --uuid /private/path/SignalWord.xcarchive/dSYMs/SignalWord.app.dSYM
```

Match dSYM UUID to app executable. For an exported App Store artifact, inspect distribution profile/team/App Group and ensure get-task-allow is false. The device-install script intentionally requires a registered-device profile and must not be used to falsely reject/approve an App Store distribution artifact.

5. Organizer → Validate App; resolve every error and assess warnings. Retain redacted validation report and archive SHA-256. Ensure build 2 has not already been uploaded; if used, increment build and regenerate/retest the candidate. Do not let automatic version management silently break manifest identity.
6. **Ask owner approval before upload.** Organizer → Distribute App → App Store Connect → Upload. Wait for processing; resolve Missing Compliance/errors. Upload success is not beta approval.
7. Configure beta contact/description/review access; invite only approved internal testers initially. External TestFlight may require Beta App Review. Public links remain off; enrollment capped by runbook.
8. After physical/pilot evidence and separate public-release approval, select accepted build, upload actual screenshots, fill privacy/age/export data, review support URLs and submit. Choose manual release. Do not click Submit for Review or Release without explicit approval.

Official references reviewed 29 September 2026: [privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files), [required API reasons](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitypereasons), [privacy answers](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy), [screenshots](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications), [export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance), [upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds), [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).
