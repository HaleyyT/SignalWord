> Historical baseline: current scope, implementation status, and open release gates are maintained in [the quality roadmap](implementation/QUALITY_ROADMAP.md). Conflicting scope or readiness claims below are superseded.

# Day-8 Release Audit

**Audited:** 26 September 2026

**Auditor stance:** release-blocking evidence review, not a product claim.

**Verdict:** **Strong local implementation; not accepted for production release or Shipaton submission yet.**

This audit maps the release decision to committed implementation and evidence.
A passing local test is not recorded as a production, provider, App Store, or
physical-device capability.

## Evidence executed

| Check | Result | What it proves | What it does not prove |
|---|---|---|---|
| `npm run verify` | Pass | Repository/security checks, 61 Node tests, 39 viewer tests, and production viewer build | Hosted availability or physical-device behavior |
| `npm run test:db` | Pass | 126 pgTAP assertions across six suites after a clean migration reset; RLS, ownership, idempotency, retention, provider reconciliation, contact abuse limits, lifecycle, and deletion boundaries | Production database configuration or load behavior |
| `swift run --disable-sandbox --package-path apps/ios SignalWordCoreVerification` | Pass | Durable command, concurrency, retry, cooldown, state, deletion, and location-freshness behavior | Signed App Intent or locked-device execution |
| `xcodebuild ... CODE_SIGNING_ALLOWED=NO ... build` | Pass | The real Swift 6 iOS app compiles for the simulator, including App Intents, Keychain, lifecycle APIs, Core Location, and SwiftUI | Signing, archive, TestFlight, device permissions, or App Review |
| Deno check of all five Edge Function entry points | Pass | Function entry points and shared TypeScript boundaries type-check | Deployed secrets, routing, schedules, or provider credentials |
| `npm audit --omit=dev --audit-level=high` | Pass, zero vulnerabilities | No known high-severity production npm dependency finding at audit time | Vulnerabilities outside that dependency database or future disclosures |
| `npm run release:preflight` | Pass | Required local repository, viewer, Xcode, Supabase, and database gates execute together | Production acceptance |

## Requirement traceability

| Requirement area | Implemented and locally verified | Evidence still required | Decision |
|---|---|---|---|
| Locked phrase trigger | Narrow, silent iOS 18 App Intent; durable cross-process idempotency; honest fallback states | Signed physical iPhone runs while locked, after reboot, force-quit, low power, and poor network; 50 phrase trials | Blocked for release |
| Trusted contact consent | Encrypted destination, one-time expiring confirmation, explicit confirmation UI, confirmed-contact gate | Hosted confirmation URL and real second-device consent/delivery evidence | Blocked for release |
| Alert backend | Authenticated API, atomic canonical event, cooldown, transactional outbox, status, resolve, delete data | Production deployment, environment secrets, scheduler/worker operation, latency/error-budget evidence | Blocked for release |
| Provider delivery | Resend adapter, idempotency, retry taxonomy, leases, raw-body webhook verification, immutable receipts | Verified Resend domain, production webhook, live TEST/REAL/resolved email evidence | Blocked for release |
| Public viewer | Token-only allowlisted projection, same-origin proxy, security headers, location freshness, resolution state | Public HTTPS deployment and revoked/expired/live token smoke tests from a second device | Blocked for release |
| Location | Optional Core Location permission UI, fresh cached snapshot, non-blocking post-acceptance refresh, server validation | Physical-device permission-denied/approximate/precise/timeout tests and map/viewer observation | Blocked for release |
| Security and privacy | RLS, encrypted contact data, hashed capabilities, bounded retention, redacted structured logs, refreshable device identity, deletion, per-user/destination contact setup limits | External security review; production log inspection; remaining IP/token abuse limits and kill-switch exercise | Partially accepted |
| Monetization | Safety path is independent of entitlement state | RevenueCat `plus` entitlement, non-safety paywall, purchase/cancel/restore, outage test, project ID | Not implemented |
| Store and submission | Draft runbooks, evidence templates, and honest claims ledger exist | Owned identifiers, signed archive, TestFlight/App Store URL, final icon/screenshots/video, Devpost page and receipt | Not implemented |

## Quality assessment

**Current repository implementation quality: 88/100.**

**Current production/Shipaton release readiness: 64/100.**

**95/100 acceptance: not yet earned.**

The implementation score reflects a substantial, maintainable vertical slice:

- real SwiftUI/iOS target with refreshable Keychain identity and deliberate UX;
- crash-safe, idempotent alert creation and offline recovery;
- encrypted trusted-contact lifecycle and explicit consent;
- transactional provider delivery with retry, webhook, and receipt handling;
- token-scoped viewer and optional non-blocking Core Location enrichment;
- clean migrations, RLS, deletion/retention, CI gates, and broad local regression coverage.

The release score remains lower because the app's central promise depends on
platform and production evidence that source code and simulators cannot supply.
The repository must not be described as end-to-end working, release-ready,
submitted, or as contacting police/emergency services.

## Remaining critical path to 95+

1. Deploy a production Supabase project, all functions, schedules, secrets, and the viewer; record clean-state smoke evidence.
2. Configure Resend domain/webhook and prove TEST, REAL, resolved, retry, duplicate, and provider-failure behavior on a second device.
3. Configure owned Apple identifiers/signing and execute the physical-device matrix, ten consecutive end-to-end runs, and 50 phrase trials.
4. Add RevenueCat only for non-safety Plus features; prove purchase, cancel, restore, and total RevenueCat outage without affecting alerts.
5. Add and exercise user/destination/IP/token abuse controls and operational kill switches without making emergency alert retries fragile.
6. Complete accessibility, VoiceOver, Dynamic Type, permission-change, localization-copy, performance, and battery checks on devices.
7. Produce the signed archive, App Store/TestFlight evidence, final screenshots/video, public URLs, Devpost entry, and submission receipt.

Only after every release-gate row has evidence, no P0/P1 remains, and the
five-demo/ten-E2E/50-trial requirements pass should a senior QA acceptance
score of 95 or above be considered.
