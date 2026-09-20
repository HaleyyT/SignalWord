# SafeWord V1 Test Plan

## Testing objective

Prove that a trained system vocal shortcut can invoke SafeWord while the iPhone is locked, produce exactly one honest alert, attach the best available location, reach a confirmed contact, and render a secure viewer without exposing another user’s data.

## Test environments

- One physical iPhone on the intended minimum/current iOS versions where available.
- A second physical phone or desktop browser for the trusted-contact experience.
- Debug/sandbox backend and separate production backend.
- RevenueCat Test Store first, then App Store sandbox/TestFlight.
- Network Link Conditioner or equivalent for offline/slow/loss cases.

Record device model, OS version, locale, network, permission state, phrase type, timestamp, result, latency, and build commit for every formal trial.

## Day-1 existential test

Pass only if all are true:

1. The SafeWord App Intent appears as an action available to Vocal Shortcuts.
2. The user trains an uncommon phrase.
3. The app is backgrounded and the phone is locked.
4. Saying the phrase invokes the intent without authentication or opening the app.
5. The intent accesses its safe credential after first unlock.
6. The backend creates one event.
7. The contact receives a real test message.
8. The contact opens the event page.
9. At least last-known location or an honest unavailable state appears.
10. A repeated phrase within cooldown does not send another message.

Also record outcomes after force-quit and reboot-before-first-unlock. These may be limitations, but they cannot be unknown.

## Locked-trigger capability matrix

Complete this table on the physical release device before approving any locked-trigger claim:

| Device state | Expected evidence | Result/build |
|---|---|---|
| Unlocked, app foreground | Intent runs and creates/reuses one event | Pending |
| Locked, app backgrounded | Intent runs without opening app | Pending |
| Locked, app force-quit | Exact observed behavior recorded | Pending |
| Reboot, before first unlock | Exact credential/intent behavior recorded | Pending |
| Reboot, after first unlock | Intent and credential recover | Pending |
| Wi-Fi online | Event and provider outcome recorded | Pending |
| Cellular online | Event and provider outcome recorded | Pending |
| Airplane mode | Pending state, no false delivery claim | Pending |
| Location allowed/precise | Best available timestamped location | Pending |
| Location approximate | Approximate result labeled honestly | Pending |
| Location denied | Alert succeeds with unavailable state | Pending |
| Low Power Mode | Exact observed behavior recorded | Pending |
| Vocal Shortcuts disabled | Clear readiness failure and fallback | Pending |

The weakest relevant result controls public wording. A success in one convenient state cannot be generalized to all locked-device states.

## Automated iOS tests

- readiness aggregation;
- trigger cooldown and event reuse;
- idempotency key persistence;
- outbox encode/decode and retry schedule;
- safe Keychain configuration abstraction;
- alert state transitions and illegal transition rejection;
- location freshness mapping;
- API error mapping and retryability;
- redacting logger;
- RevenueCat entitlement mapping and free-core fallback;
- delete-data local cleanup;
- Dynamic Type snapshots for critical screens if stable tooling is available.

App Intent logic should call a protocol-based coordinator so most behavior is unit-testable without invoking the system UI.

## Backend tests

- unauthenticated alert creation rejected;
- user A cannot read/write user B data;
- confirmed contact required for a real alert;
- test alert is unmistakably labeled;
- same idempotency key returns same event;
- 20 concurrent identical requests create one event and one delivery;
- rate limits apply per user, destination, token, and IP where appropriate;
- valid location accepted; invalid ranges/accuracy rejected;
- location after resolution rejected;
- resolution is idempotent;
- viewer token hash lookup works;
- unknown/expired/revoked viewer token returns indistinguishable `404`;
- viewer response contains no internal IDs/contact destination;
- provider callback signature verified;
- retention job deletes expired samples/tokens;
- account deletion removes owned data and revokes tokens.

## Viewer tests

- TEST and REAL states are visually unambiguous;
- active/resolved/expired/unavailable states;
- live/recent/stale freshness thresholds;
- polling pauses when hidden and backs off on error;
- map unavailable falls back to coordinates/external map link;
- token never enters analytics, logs, localStorage, or referrer;
- mobile widths from 320 px upward;
- large text, keyboard navigation, screen reader names, contrast, reduced motion;
- private browser and second-device access;
- no cached event data after expiry.

## Contract/E2E scenarios

1. Fresh install → configure contact → confirm → train Vocal Shortcut → two locked tests → ready.
2. Locked phrase → event → message → viewer → fresh location → resolve → viewer updates.
3. Locked phrase with location denied → alert delivered → viewer says unavailable.
4. Locked phrase offline → local pending state → reconnect → one event/message.
5. Phrase repeated five times → one event/message.
6. App force-quit → locked phrase behavior documented and consistent.
7. Device rebooted but not yet unlocked → behavior documented and consistent.
8. Wrong device clock → server timestamps/freshness remain correct.
9. Provider primary fails → configured fallback or honest failed delivery.
10. RevenueCat offline → manual/system alert still works.
11. Purchase → entitlement → relaunch → restore from user action.
12. Delete data → old viewer link fails → local state wiped.

## Vocal phrase trial protocol

Use at least 50 controlled trials before submission:

- 20 quiet-room target phrase trials;
- 15 moderate-noise target phrase trials;
- 5 phrase-in-natural-sentence trials;
- 5 near-match phrases that should not trigger;
- 5 different-speaker/recorded-voice attempts to understand—not claim—speaker specificity.

Report raw counts by condition. Do not call the result universal accuracy or voice authentication.

## Permission matrix

| Microphone/Vocal Shortcut | Location | Network | Expected |
|---|---|---|---|
| configured | precise allowed | online | event + best location + delivery |
| configured | approximate only | online | event + approximate location labeled honestly |
| configured | denied | online | event + location unavailable |
| configured | any | offline | queued locally; no delivered claim |
| not configured | any | online | readiness failure; Siri/Action/manual fallback visible |

## Physical-device regression

- cold launch and warm launch;
- locked/unlocked, screen down where relevant;
- app foreground/background/force-quit;
- reboot before and after first unlock;
- Wi-Fi, cellular, airplane mode, bad network;
- Low Power Mode and low battery;
- notification/location permission changed in Settings;
- VoiceOver, Dynamic Type XXXL, Reduce Motion, dark mode;
- two Vocal Shortcut invocations close together;
- contact page in Safari/Chrome/private mode;
- sandbox purchase cancellation, success, restore, RevenueCat failure;
- install TestFlight build over prior build and fresh install.

## Release gates

- Existential locked-trigger test passes on the release candidate.
- 10 consecutive full E2E runs pass.
- Formal phrase-trial report is complete.
- No P0 or P1 issue; P2 issues are documented and accepted.
- RLS/cross-user and token tests pass.
- No duplicate-delivery result under concurrency.
- Clean install onboarding completes without developer help.
- Contact viewer works on the second device.
- RevenueCat purchase and restore pass in the required environment.
- Five consecutive filmed-demo rehearsals pass.
- Store/Devpost claims match observed behavior exactly.

## Defect policy

- **P0:** data exposure, false police/contact delivery claim, alert storm, crash/data loss in trigger. Stop release.
- **P1:** primary locked trigger, delivery, viewer, delete-data, or purchase unavailable. Stop release.
- **P2:** degraded noncritical UX with workaround. Fix if schedule permits; disclose/track.
- **P3:** cosmetic or post-launch improvement. Do not destabilize the release.

Every fixed P0/P1 gets an automated regression test or a recorded physical-device regression case before closure.
