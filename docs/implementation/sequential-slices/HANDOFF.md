# Sequential feature handoff — 28 September 2026

This is local implementation evidence, not physical-device, hosted or provider acceptance. No live alerts, production changes, emergency-service contact, main merge or remote push was performed during this work.

## Branch structure

Each feature branch starts from clean main `2303014`; completed prerequisites are then cherry-picked explicitly because merging main was forbidden. Review prerequisite patches once, then the feature-specific commits. These are dependent candidates, not three unrelated changes that can be merged in arbitrary order.

| Slice | Branch | Status |
|---|---|---|
| Trusted-contact escalation | `feat/contact-escalation` | Local gate passed; controlled acceptance required |
| Safety check-in timer | `feat/check-in-timer` | Local gate passed; controlled acceptance required |
| SMS delivery | Not started | Waiting for timer local gate |

Main and the user's original `feat/ui` checkout were left intact. The two untracked strategy/emergency-response documents in the original checkout were not modified.

## Contact escalation

Commits: `d845180` (session deletion prerequisite), `324aa59` (contact feature), `f71fed4` (due-time monitoring correction).

Up to three individually consenting contacts, explicit confirmed primary, everyone-now or primary-now/others-in-two-minutes policy. Server acceptance snapshots recipients/policy and creates separate recipient capabilities and outbox records. Acknowledgement is scoped to the link, establishes neither identity nor assistance, and does not stop escalation. Resolution, expiry and withdrawal cancel unclaimed work; provider-submitted messages cannot be recalled. The iOS People screen manages contacts/routing; active incidents show per-recipient progress.

Migrations: `20260929010000_contact_escalation.sql`, `20260929011000_escalation_health.sql`.

Evidence: 109 Node/API tests; 43 viewer tests; 31 Swift tests; 237 database assertions initially, plus the standalone health assertion = 238; five simulator journeys; five true concurrent database scenarios. Viewer, signup and homepage browser regressions, production viewer build, Release simulator build, core verification, six function type checks, public SQL lint and production dependency audit passed. Later timer runs also exercise these prerequisites.

See [contact details](CONTACT_ESCALATION.md) for architecture, files, limitations and manual cases.

## Timer

One active server-owned 15/30/60-minute timer. Start/check-in/cancel/extend become confirmed only after server acceptance. A one-minute grace and scheduled server sweep create one missed-check-in REAL incident through the contact pipeline, or associate an existing REAL incident without duplicate traffic. TEST is independent. Explicit incident resolution is still required. Durable client command IDs recover uncertain responses after relaunch; account deletion fences late responses and cascades timer data. Optional local reminders are supplementary.

Migrations: `20260929020000_check_in_timers.sql`, `20260929021000_timer_projection_and_retention.sql`, `20260929022000_check_in_health.sql`.

Evidence so far: 114 Node/API, 44 viewer, 36 Swift, 268 database assertions across 13 suites after a fresh local migration replay, three actual cancellation/extension/duplicate-expiry race scenarios, viewer browser regression, core verification, six function type checks, public SQL lint, zero production dependency vulnerabilities and final Release simulator build passed. Final full UI result: seven passed, zero failures/skips/runtime warnings on iPhone 18 Pro simulator, iOS 27.0 (`signalword-ui.EdQmKs/Journey.xcresult`).

See [timer details](CHECK_IN_TIMER.md).

## Defects and test failures addressed

- Fixed late authentication replies restoring deleted sessions through the prerequisite patch.
- Cancelled unsent initial messages on resolution; updated older tests that assumed those messages would still be sent.
- Counted deliberate escalation delay from the due time rather than treating it as backlog.
- Made timer extension add to the current deadline, avoiding accidental shortening.
- Retained minimal operation receipts after timer-detail retention to prevent stale commands rearming a timer.
- Corrected a Swift actor-isolation compile failure.
- Excluded two overlapping simulator runs; added a process lock to prevent recurrence. Optional Xcode system-diagnostic collection stalled and was stopped after test execution; it is disabled in the script, while XCTest assertions/results and failure screenshots remain.
- Fixed UI test scrolling that hit the safety hold control and then scrolled in the wrong direction when returning to the incident card. No application safety assertion was removed.

## Shared external release blockers

These are not satisfied by local tests: signed iPhone locked-phrase/relaunch behavior; actual recipient email/SMS delivery and signed callbacks; deployed schedule/operator-alert drills; independent deletion journal/restore protection and restore drill; accessibility/usability observation, device trial evidence, pilot observation, scale/cost tests and final security/release review. Professional monitoring and police/000 integration are excluded from this work.

Do not infer a 97/100 quality score or public-launch readiness from the passing local counts.
