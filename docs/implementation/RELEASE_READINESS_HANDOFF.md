# Release-readiness handoff

Updated 28 September 2026. Scope: complete the current email release candidate before starting the next feature. This is not public-release approval.

## What changed and why

The homepage polish is committed to main as `2303014`. It explains the voice-triggered trusted-contact journey and retains recipient guidance, limitations, support and privacy navigation.

The iOS authentication manager previously allowed a request started before local deletion to save credentials after deletion. Cancelling a network task alone is insufficient: its response may already be arriving. Local deletion now advances a session generation and cancels outstanding work. A response must belong to the current generation before it can write to Keychain. Cleanup from an old request cannot clear the reference to a newer request.

Malformed authentication responses now become the existing retry-classified `invalidResponse` error. They do not silently replace identity or erase the existing session. Refresh rejection still does not fall back to anonymous signup.

The manager accepts transport and credential adapters with production defaults. Tests exercise the actual manager using an isolated in-memory store, without touching developer credentials or creating remote accounts. The Swift package explicitly includes this implementation and excludes unrelated application sources.

Nine new behavioral tests cover missing CAPTCHA, unreadable credentials, valid stored sessions, signup proof, identity-preserving refresh, rejected refresh, malformed responses, and late signup/refresh after deletion, and a deliberate new signup while an old refresh completes. This protects local session deletion; it does not implement backup restore protection or prove server-side CAPTCHA enforcement.

## Verification for this change

- Repository verification: 102 Node tests, 43 viewer tests, security/contract checks and viewer production build passed.
- Swift: 27 tests passed, including nine new authentication tests; core verification passed.
- Release iOS Simulator application build passed.
- Local database: 194 assertions across ten suites passed.
- Live viewer: all six hosted routing checks passed. These use invalid capability tokens and do not send notifications.
- Simulator application journeys: four passed, zero failures, zero runtime warnings (iPhone 18 Pro simulator, iOS 27.0). These use controlled service fixtures, not live email delivery.

No new emergency messages or real alerts were sent. No production backend was changed. A previous controlled development email test is historical evidence, not proof that this iPhone build has completed the journey.

## Device acceptance checklist

Use the development backend and a consenting recipient. Never use police or emergency-service destinations for tests.

1. Activate Apple membership and confirm owned bundle/App Group identifiers. Install a signed build configured with development API and CAPTCHA settings. Launch from the Home Screen without an attached debugger.
2. Verify that Supabase **Authentication → Bot and Abuse Protection** has the Turnstile secret. An Edge Function secret alone does not protect anonymous Auth signup. Verify fresh onboarding succeeds and missing/invalid CAPTCHA is rejected; returning users should reuse their identity.
3. Confirm recipient consent, then run the separately named **TEST** action. The email must clearly say TEST, identify the sender and open the correct event. Record server acceptance, provider acceptance and delivery separately.
4. Open the recipient link. Opening alone must not acknowledge. Press Acknowledge and confirm it appears on the sender. Acknowledgment must not claim help is coming.
5. Relaunch the sender and resolve the same event. Check the recipient view and resolution email; delivery is not proof of reading.
6. Repeat with the locked TEST shortcut, location denied, network loss and an expired session. Record actual behavior after reboot and before first unlock. Do not infer arbitrary background speech recognition from one successful shortcut.
7. Restore connectivity before ten minutes and check recovery without duplicates. After ten minutes, check that delayed sending requires confirmation. Test that TEST work does not replace pending REAL work.
8. Delete the development test account, including an interrupted deletion attempt; confirm local cleanup, revoked links and no further pending sends. Do not delete a real account to run this check.
9. Check VoiceOver, largest text, small recipient screens and consent withdrawal. Keep capability URLs, coordinates, credentials and recipient addresses out of evidence.

For each trial record build/commit, device/OS, environment, expected and actual behavior, pass/fail, and defect/retest reference. Failed trials count as evidence and must not be omitted.

## Remaining gates and ownership

| Gate | Next action | Owner |
| --- | --- | --- |
| Signed iPhone and CAPTCHA | Complete steps 1–8 above; record real provider callbacks | You + engineering |
| Independent operator notification | Configure Healthchecks destination, test failure and missed-heartbeat delivery | You + engineering |
| Restore protection | Provision independent deletion/withdrawal journal, implement enforced quarantine and reconciliation, run isolated restore drill | Engineering + account owner |
| Crash reporting and submission assets | Select privacy-reviewed crash reporting; audit app icon, privacy manifest, App Store disclosures, signed archive and support content | Engineering + account owner |
| Production | Provision separate production resources and promote tested versions only after gates pass | Account owner + engineering |
| Public launch evidence | Pilot, device trials, security review, load/cost and recovery evidence | Team/testers |

Detailed external setup remains in [RELEASE_GATE_SETUP.md](RELEASE_GATE_SETUP.md). No gate is waived by a passing simulator build. Do not enable public enrollment yet.

## Next complete feature slices

Keep main deployable. Use one feature branch and a reviewable, tested vertical slice at a time; merge only after its acceptance checks pass.

1. **Trusted-contact escalation:** up to three consenting contacts; primary immediately, remaining contacts after two minutes while unresolved. Snapshot routing, invalidate withdrawal, preserve idempotency and independent status. Acknowledgment alone does not stop escalation. Test concurrent timer workers, resolution races, retries and withdrawal before delivery.
2. **Server-backed check-ins:** 15/30/60-minute choices; show armed only after server confirmation. One-minute grace, then a missed-check-in event uses the contact pipeline. Test offline setup, cancellation/expiry races, delayed worker execution, clock changes and relaunch.
3. **SMS:** implement channel-specific consent/verification, withdrawal, provider adapter, callback verification and ambiguous-send handling. Validate Australian sender suitability and real delivery first. Keep email/SMS independently retryable.
4. **Emergency assistance:** immediately notify all confirmed contacts and a contracted monitoring partner when enabled; bound active location updates to the incident lifecycle. Require provider sandbox, acceptance/rejection states, outage fallback and authorized drills. Until a partner exists, label monitoring unavailable; never claim police were notified. A separate user-confirmed emergency call action must not be described as a silent automatic call.

Each phrase must map visibly to one exact configured action. TEST must remain a separate action and must never reach an emergency responder. Do not implement arbitrary continuous background listening or promise locked-device execution without platform and device evidence.

## Progress interpretation

The earlier approximately 72% readiness estimate covers the original email scope only; it is not a measured completion percentage and does not include the expanded feature slices above. The current fix improves authentication recovery but does not justify increasing that estimate or awarding 97/100. All four external release gates remain incomplete until their evidence is recorded. The larger emergency-response product remains a staged backlog, not an implemented service.
