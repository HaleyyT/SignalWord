# Day-1 vertical-slice runbook

This runbook turns the Day-1 plan into evidence. Do not mark the product’s locked-trigger, delivery, or location claims as passed until every relevant physical-device row is observed on the release candidate.

## 1. Clear the toolchain gate

The current machine has Command Line Tools only, not full Xcode. Install full Xcode through the App Store or Apple Developer downloads, then run these commands in Terminal:

```sh
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
xcodebuild -version
xcode-select -p
```

Open Xcode once to finish component installation, add an iOS simulator runtime, and sign a blank iOS app on the target iPhone. Do not commit an Xcode project generated under an unverified signing identity.

From the repository root, the preflight is:

```sh
npm run day1:preflight
npm run day1:preflight:strict
```

The normal command reports blockers without failing. The strict command fails until the Xcode gate is green.

## 2. Create the Xcode target

After signing works, create an iOS 18 SwiftUI app target named `SignalWord` and add every file beneath `apps/ios/SignalWord/` to that target. Enable the App Intents capability. Do not add a background-audio capability or any app-owned continuous speech recognition.

Set up the initial device identity only after your backend can issue an authenticated user/device bearer token. Store it through `DeviceCredentialStore.saveBearerToken(_:)`; the implementation uses `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`, which deliberately makes reboot-before-first-unlock a documented limitation rather than a secret fallback.

Set the development/test API base URL with `SignalWordConfiguration.setAlertAPIBaseURL(_:)`. Never put a service credential, provider credential, or contact destination in the app, an `.xcconfig` committed to Git, or a viewer bundle.

## 3. Register and rehearse the system action

1. Build the signed app on the target phone.
2. Confirm **Trigger Alert** appears in Shortcuts and the Vocal Shortcuts action picker.
3. In iPhone Settings, add the action through Accessibility → Vocal Shortcuts and train an uncommon multi-word phrase.
4. Lock the phone, say the phrase, and observe the configured test backend.
5. Repeat inside the 60-second cooldown and verify the same event is reused with no second delivery.

The intent is intentionally silent and does not foreground the app. It must never reveal contact details, location, viewer links, token values, or delivery status to someone holding the locked phone.

## 4. Backend and delivery proof

Before using a real recipient, deploy a development/test `POST /v1/alerts` endpoint matching [the API contract](API_CONTRACTS.md). It must authenticate the device, enforce the `(user_id, idempotency_key)` uniqueness rule, and return `200` for reuse or `201` for a new event.

Configure exactly one verified development/test delivery route and label the message `TEST — no emergency has been reported`. Record the backend event ID and provider receipt outside Git. Only once this path works may a real alert be rehearsed with the recipient’s consent.

## 5. Record the evidence

Append the result—not any secret or personal data—to `docs/build-notes.md` using this template:

```text
Build/version:
Device/OS:
Date and timezone:
Vocal Shortcut visible: pass/fail
Locked/background: pass/fail
Force-quit: observed behavior
Reboot before first unlock: observed behavior
Credential access after first unlock: pass/fail
One event and one TEST delivery: pass/fail
Cooldown reuse: pass/fail
Location state: fresh / stale / unavailable
Known limitation and chosen fallback:
```

Update the corresponding `Pending` cells in [the test plan](TEST_PLAN.md) and do not alter the [claims ledger](CLAIMS_LEDGER.md) until the release build passes the full matrix.
