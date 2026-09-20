# SafeWord V1 Product Requirements

## Product statement

SafeWord turns a private, user-trained vocal shortcut into a discreet alert to a trusted contact even when the iPhone is locked.

It is a personal safety coordination tool. It does not detect danger, dispatch emergency services, guarantee rescue, or record ordinary conversations.

## Target user

An adult who is entering a situation where visibly reaching for a phone may be uncomfortable or unsafe and wants one trusted person to know if they intentionally speak a chosen phrase.

Examples include meeting someone new, walking to transport, working alone, viewing a property, or travelling in an unfamiliar place.

## Core job to be done

> When I cannot safely unlock or navigate my phone, let me speak a private phrase I trained with iOS so a trusted person receives an alert and my latest available location.

## Product principles

- The user—not an AI classifier—decides when to trigger.
- The operating system owns phrase listening through Vocal Shortcuts; the app does not run a hidden always-on recorder.
- No raw ambient audio is stored or uploaded by default.
- The phrase stays on device and out of logs/analytics.
- The alert path stays free and works without a premium entitlement check.
- Every state is honest about permission, delivery, and location freshness.
- The user sees limitations before relying on the product.

## Primary experience

1. The user completes onboarding and sees why each permission is needed.
2. The user maps SafeWord’s Trigger Alert action to an uncommon phrase in iOS Vocal Shortcuts and successfully rehearses it.
3. The user adds one trusted contact and sends a test/consent alert.
4. The home screen shows a Readiness Check.
5. The user can lock the phone; SafeWord does not need to remain open.
6. iOS recognizes the trained Vocal Shortcut on device and invokes SafeWord’s App Intent.
7. One intent invocation creates exactly one alert event.
8. The app provides subtle haptic confirmation.
9. The backend sends the trusted contact a secure, expiring URL.
10. The contact sees the alert time, latest location, freshness, and status.
11. Location updates continue only while the OS and current product mode permit.
12. The user deliberately resolves the alert; the contact sees that update.

## Functional requirements

### Onboarding and readiness

- Explain the product in three screens or fewer before configuration.
- Request permissions in context, not all at launch.
- Let the user continue after a denied optional permission and explain the resulting limitation.
- Show readiness items for phrase, contact, speech/microphone, location, delivery test, and backend reachability.
- Block Guardian start only when phrase, microphone/speech, or contact delivery is unavailable; location failure degrades rather than blocks.

### Vocal trigger setup

- Expose a background-capable `TriggerAlertIntent` and an App Shortcut.
- Guide the user through Settings > Accessibility > Vocal Shortcuts to select the action and train a private phrase.
- Recommend unusual multi-word phrases and warn against common speech.
- Require two successful locked-device test alerts before marking ready.
- Never display an invented numeric “accuracy” score.
- Never ask for, read, store, log, or upload the Vocal Shortcut phrase or its audio.
- Do not claim speaker/voice biometric verification; secrecy of the phrase is not proof of identity.

### Trusted contact

- V1 supports exactly one active contact.
- Store only the minimum destination data.
- Preview exactly what will be sent and who appears as sender.
- Send a clearly labeled test/consent message.
- Record verification/readiness state.
- Rate-limit test and real alerts.

### System trigger and optional Guardian Session

- The system trigger must work without an active Guardian Session when Vocal Shortcuts and the intent are available.
- State machine: notReady, ready, triggering, alertPending, alertActive, resolving, resolved, recoverableError.
- Explicitly allow locked execution through the App Intent authentication policy only for alert creation.
- Store intent credentials using an accessibility class proven available after first unlock while preserving device-only security.
- The intent returns no spoken sensitive detail and does not require the app to foreground.
- Guardian Session is optional: it may preflight readiness and improve location freshness, but is not a prerequisite for the vocal alert.
- Persist enough state to recover after a crash/relaunch.

### Trigger and alert

- Intent handling and cooldown logic are deterministic and covered by unit tests.
- A trigger creates a device-generated idempotency key.
- Repeated invocations inside the cooldown reuse the same event.
- Do not wait for RevenueCat, analytics, or nonessential services.
- If offline, persist a redacted outbox item and retry with bounded exponential backoff.
- Show pending/delivered/failed honestly when the user later views status.

### Location

- Capture the best available current location after trigger.
- Upload latitude, longitude, horizontal accuracy, captured-at time, and server received-at time.
- Viewer state is based on server time, not device clock alone.
- Show location unavailable without failing the alert.
- Do not claim background continuity unless the released build actually provides it.

### Contact viewer

- Open on a mobile browser with no account or app install.
- Use a high-entropy token; store only a hash server-side.
- Show user-selected display name, test/real badge, alert time, status, latest location, accuracy, and last update.
- Poll on a modest interval with backoff; no complex realtime system is required.
- Handle invalid, revoked, and expired tokens without revealing event existence.
- Provide an explicit prompt to contact the person and local emergency services if appropriate, without claiming dispatch.

### Resolution and deletion

- Resolution requires a deliberate hold plus device authentication when available.
- Resolution stops location updates and sends a status update; it does not retract the original alert.
- Default event/location retention: delete location samples 24 hours after resolution; retain redacted delivery diagnostics for at most seven days.
- “Delete my data” revokes tokens, removes server data, clears Keychain/local storage, and signs out the anonymous backend identity.

### RevenueCat

- One `plus` entitlement with one offering.
- Premium may unlock noncritical themes, session presets, or non-sensitive history presentation.
- Purchase and restore are user-initiated and have loading, cancellation, success, and error states.
- Missing/offline entitlement data defaults to the free safety core.

## Non-goals

- App-owned always-on listening.
- Detecting violence, distress, emotion, or intent.
- Calling police or emergency services automatically.
- Recording or uploading ambient audio.
- Multiple contacts, circles, or escalation policies.
- Claims of locked-screen support before the released path passes real-device tests.
- Precise global emergency coverage.
- Android or watchOS in this sprint.

## Success measures

### Release gates

- 10 consecutive end-to-end runs without duplicate alert delivery.
- 50 documented phrase trials across quiet/moderate noise with conditions and outcomes recorded.
- Zero false activation in the agreed near-match test set.
- Median trigger-to-server-event latency and delivery latency recorded honestly.
- Contact page works on a second physical device and a private browser session.
- Fresh install, denied permissions, offline trigger, relaunch, purchase, restore, and delete-data paths pass.
- No P0/P1 issue and no known cross-user data access.

### Usability targets

- A new tester explains the product correctly after onboarding.
- Median first-time setup under four minutes, excluding contact response time.
- At least 4 of 5 testers complete the happy path without developer help.
- Contact viewers correctly identify who triggered, when, location freshness, and what action to take.

## Submission proof points

- Real device phrase trigger.
- Real message arriving on a second device.
- Secure viewer with changing/stale location states.
- Readiness Check and test mode.
- Privacy architecture and no stored audio.
- RevenueCat purchase/restore for non-safety features.
- Measured reliability report with limitations.
- Accessibility evidence and real tester feedback.
