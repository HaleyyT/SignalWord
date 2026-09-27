# SignalWord implementation and release authority

This document supersedes scope and scheduling decisions in the eight-day, recovery,
Shipaton, and Day-8 audit documents. Historical test results remain historical.
Implementation does not establish production readiness or a 97/100 score.

## Product boundary

Australia-first, English, adults, iOS 18+. One consenting contact. Invitation-only
email pilot first; consented Australian SMS is required before broad launch. Core
safety remains free. Subscriptions, circles, continuous tracking, timed check-ins,
Android and emergency dispatch are outside this release. No ambient recording.

## Implemented critical slice

- Separate silent REAL and TEST intents. REAL never changes meaning.
- App Group SQLite commands, transactional legacy import, independent TEST/REAL
  records, cross-process leasing, original idempotency keys, launch reconciliation.
- Automatic retries only during permitted execution opportunities for ten minutes;
  older commands require explicit confirmation. No guaranteed background execution.
- Persisted onboarding and distinct acknowledged TEST event evidence. Locked
  execution is explicitly user-reported, not inferred from provider delivery.
- Authenticated sender profile, unresolved-event recovery, command alias lookup,
  separate initial/resolution delivery, recipient acknowledgement.
- Explicit POST acknowledgement. Reading a link never acknowledges. Link possession
  is a capability, not proof of the recipient's identity or of rescue.
- Destination ciphertext snapshots, request deadlines, one-slot workers, lease
  fencing, expiry/exhaustion recovery, immutable callback reconciliation, sender-identifying email, dispatch
  wakeup and scheduled sweep, bounded diagnostics retention.
- Viewer acknowledgement states and cached location ageing; resolution does not
  assert that the person is safe.

## State and data ownership

| Entity | Authority | States and rules |
|---|---|---|
| Local command | App Group SQLite | attempting / queuedOffline / created / rejected; retries keep key; TEST cannot touch REAL |
| Delayed command | App + server reconciliation | after ten minutes require confirmation only if no canonical server event exists |
| Event | Postgres | pending / active / resolved / expired; server time determines expiry |
| Delivery | Postgres + provider receipts | queued / sent / delivered / failed; OUTCOME_UNKNOWN is exposed as unknown in the new status API |
| Acknowledgement | Explicit capability POST | absent → timestamp; idempotent; never inferred from GET or delivery |
| Rehearsal | Acknowledged TEST + user attestation | count each event once; user reports locked execution separately |
| Contact | Postgres | pending / confirmed / disabled; replacement revokes old links and queued delivery |

App → authenticated Edge Function → atomic event/outbox → bounded worker → provider
→ recipient viewer. Callbacks reconcile receipts. Foreground recovery reconciles
commands. Cron recovers dispatch and exhausted leases. Postgres owns privacy
retention. Neither billing nor GPS participates in the acceptance dependency chain.

In-flight provider requests cannot be retracted by deleting a contact. Withdrawal
prevents unclaimed/future work and revokes capabilities; this limitation must remain
in privacy copy and the threat model.

## API additions

- GET /v1/profile and PUT /v1/profile {displayName}: owner-only profile.
- GET /v1/alerts/recovery?key=<uuid>: unresolved events, or command-key reconciliation.
- GET /v1/alerts/<uuid>: additive kind, acknowledgement and resolution-delivery fields.
- POST /v1/public/events/<token> with X-SignalWord-Action: acknowledge: explicit,
  idempotent acknowledgement. Same expiry/revocation boundary as the read capability.
- Alert creation records clientTriggeredAt separately from serverTriggeredAt.

Old alert creation requests remain compatible. Apply additive database migrations
before functions and before the new mobile binary. Older clients can continue to
use their existing response fields. Roll back application versions, not database
history. New command-key aliases preserve cooldown reconciliation.

## Verification and evidence matrix

| Requirement | Owner | Verification | Release gate |
|---|---|---|---|
| TEST/REAL separation and concurrency | iOS | XCTest command-store tests + signed intent trials | physical evidence pending |
| Migration and delayed retry | iOS | XCTest import/reopen/deadline tests | offline/kill/reboot device trials pending |
| Recipient acknowledgement | full stack | HTTP tests, browser tests, pgTAP capability/replay/revocation | real second device pending |
| RLS/profile/recovery | backend | pgTAP ownership and command-alias tests | production configuration pending |
| Provider recovery | backend | pgTAP lease/final-attempt/early webhook/order tests | live provider outage drill pending |
| Accessibility | frontend/iOS | browser behavior + keyboard; VoiceOver/Dynamic Type checklist | external tester evidence pending |
| Deployment/rollback/restore | operations | controlled deployment runbook and restore exercise | NOT executed |
| SMS consent/delivery/withdrawal | backend | adapter and production carrier evidence | NOT implemented end-to-end |
| Production SLOs | operations | 30-day pilot, independent synthetic probes | NOT measured |
| Growth/cost | product | real activation/retention/support costs and load forecast | NOT measured |

## Acceptance targets, not current claims

No P0/P1, no unresolved high/critical security findings; every critical transition
has behavioral regression coverage. At least 300 documented device trials. Service
availability 99.9%; connected acceptance p95 ≤2s; provider acceptance p95 ≤5s;
viewer usable content p75 ≤2.5s; crash-free sessions ≥99.9%. At least 18/20 unfamiliar
testers complete setup unaided. Demonstrated RPO ≤15m/RTO ≤60m. Conditions and sample
sizes accompany all measurements. Never average a failing safety gate into a pass.

## Remaining implementation and external blockers

1. XCUITest coverage of the full app, full API schema validation, hosted and device validation of deletion receipt recovery, location background
   execution evidence, device validation of contact resend/recipient withdrawal UX, user-visible handling
   of every terminal recovered state, and old-command cancellation policy.
2. Complete provider ambiguity reconciliation before retry, key-ring rotation,
   IP/token abuse budgets, production privacy log review, restore/deletion tombstones,
   hosted security header verification, operational alerting and crash reporting.
3. Exact message previews, cross-device rehearsal
   history, recipient consent details and support workflows.
4. Production project/domain/signing, Vault configuration, verified sender/webhook,
   signing archive, device matrix, 20–30-person/30-day pilot and 300 trials.
5. Twilio consent and verification, independent channel delivery, authenticated
   callbacks, carrier testing and costs before public launch.
6. Staged growth gates at 100/1,000/10,000 users. Capacity is concurrent alerts,
   provider throughput and viewer polling, not account count.

Do not mark the multi-phase plan complete until these gates have evidence. The
current work is an implemented and locally tested critical slice, not a public
release. Do not claim 97/100 or a guaranteed emergency outcome.


September 27 follow-up: [repair report](STEP2_REPAIR_REPORT.md) records signed
provider-tag reconciliation, runtime authenticated response contracts, three
simulator UI journeys, hosted preflight, and operational-health tooling. These
locally verified changes do not close the remaining external release gates or
independent restore-protection implementation.
