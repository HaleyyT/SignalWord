# Safety check-in timer — local verification candidate

No hosted deployment or live recipient messages were performed. This branch includes the completed contact-network slice and the session-deletion repair as explicit prerequisite commits, starting from main `2303014`. No branch was merged.

## Behavior and architecture

- One active timer per account; 15/30/60-minute choices. A partial unique index and the same user advisory lock as alert acceptance enforce this under concurrent requests.
- Only the server computes deadlines. The deadline and a one-minute grace period are returned with server time. The app displays Active only after a confirmed API response. If the server reports an overdue active timer, the UI says reconciliation is pending rather than implying expiry was processed.
- Check-in, cancellation and extension require server confirmation. Extension adds time to the existing deadline (or current server time during grace), never shortens it. A late request first executes the same expiry transition as the worker, then reports the resulting incident.
- A cron sweep owns expiry when the app is closed/offline. It claims the user lock before the timer row, avoiding cancellation/worker lock inversion. Duplicate workers cannot create multiple incidents. It creates one REAL incident with cause `missed_check_in`; a currently unresolved REAL incident is associated instead, with no duplicate delivery batch. TEST incidents do not satisfy this REAL reuse condition.
- Expiry selects currently confirmed recipients and current contact policy, then snapshots them through the contact outbox. The timer stores only pre-encrypted recipient capabilities and hashes, never plaintext viewer tokens. Missing confirmed primary produces an explicit failed timer instead of pretending delivery happened.
- The worker provides best-effort dispatch wakeup; the independent scheduled delivery sweep remains authoritative. The one-minute grace is not a promise of instant delivery: cron/provider latency is additional and must be measured in development.
- Emails and recipient pages explicitly describe a missed check-in and say it does not confirm danger. TEST messaging still takes precedence. Each recipient uses the existing independent capability, acknowledgement, withdrawal and resolution behavior.
- The mobile model persists a pending operation before sending. Relaunch reconciles its original operation ID; retry does not create a new request ID. Unconfirmed start/stop is visibly unconfirmed. A definite conflict clears the pending request, allowing recovery of another active timer. Late responses cannot restore deleted local state.
- Device notifications are optional supplementary reminders. Their relative interval comes from the server's deadline/time difference. Denial or scheduling failure does not affect the server timer. Deletion/ending a timer clears pending reminders; reminder dismissal does not check in.
- A timer that escalated points to a persistent incident. Ending a timer does not resolve that incident. The UI directs the user to explicit authenticated resolution.

## Data lifecycle and compatibility

Additive timer tables have RLS enabled and no direct client table privileges. RPCs enforce ownership. Internal expiry is not callable by clients; the sweeper is service-only. Each account has a limit of 60 new timer operations per hour; idempotent retries are checked before rate limiting.

Encrypted timer payloads are cleared after completion. Ended timer details are purged after 24 hours by the hourly retention job. Minimal operation receipts (account/command identity, action, duration and timestamp) remain until account deletion so retired commands fail explicitly rather than starting a new timer. Account deletion cascades both tables. This retention distinction must appear in the privacy inventory before public release.

Existing v1 mobile and public contracts remain compatible. New worker/public projection fields are additive. Deploy the new message-aware worker and viewer before enabling timer UI; older workers cannot describe the missed-check-in cause. No production activation is part of this work.

The operations projection adds overdue/failed timer counts and health for expiry/retention schedules. Existing monitors remain compatible with older backends; an enabled timer deployment must confirm the new `checkIns` health block is present. Operator delivery still needs external configuration and a real drill.

## Verification

Final results and commits are recorded in the consolidated handoff. Coverage includes real model pending/offline/relaunch and deletion tests, shared Swift/backend fixtures, API bounds and private-field filtering, recipient wording, and transactional database cases for expiry, idempotency, late cancellation, existing REAL reuse, ownership, retention and deletion. A local Docker-only script exercises overlapping cancellation/expiry, extension/expiry and duplicate sweeps. Simulator services and browser responses are controlled fixtures, not live provider or signed-device evidence.

Defects corrected during implementation: extension initially used `now + duration`, which could shorten a running timer; retired operation receipts initially cascaded with timer retention, which could permit a stale start to re-arm; actor-isolated constant access failed the Release build; and deliberate contact delays initially counted as overdue delivery backlog. The backlog correction is isolated and backported to `feat/contact-escalation` at `f71fed4`.

## Manual acceptance before merge/enablement

1. With a signed development build and consenting contacts, start each duration and confirm the displayed server deadline. Interrupt acceptance; relaunch and reconcile without another timer.
2. Keep the app closed/offline past deadline plus grace. Confirm exactly one missed-check-in incident and actual recipient delivery. Check the cause, deadline, location limitations and independent acknowledgements.
3. Cancel and extend near the grace boundary, including competing devices. Record whether the server accepted the change or reported an existing incident. Never assume a failed network request stopped a timer.
4. Create a REAL incident before timer expiry and verify there is no extra contact traffic. Repeat with TEST only and verify the missed timer creates its separate REAL incident.
5. Deny notifications, change local device time, reboot, and disable network. The server timer must remain authoritative. Verify reminder timing/cleanup independently.
6. Withdraw the primary before expiry; verify the explicit failure state and operational alert. Replace/confirm contacts and verify a later timer can be armed.
7. Resolve an escalated incident explicitly, then start another timer. Delete the account while a timer is active and verify no later dispatch or capability access.
8. Stop the development expiry schedule in an isolated drill; verify overdue/missing-job notification, resume and observe one incident per due timer. Do not disrupt other testers' incidents.

Keep signed-device, provider, restore and pilot release gates open until those checks are recorded.

## Recorded local results

- `npm run verify`: 114 Node/API tests, 44 viewer tests, repository/security/contract checks and viewer production build passed.
- `swift test --package-path apps/ios`: 36 tests passed; core verification passed.
- Fresh local-only migration replay succeeded, then `npm run test:db`: 268 assertions in 13 suites passed.
- `node scripts/test-check-in-concurrency.mjs`: all three overlapping-worker/mutation scenarios passed.
- All six Edge Function entry points passed Deno type checking; public-schema SQL lint found no errors; production dependency audit found zero vulnerabilities.
- Viewer browser regression passed, including missed-check-in wording, acknowledgement retry and revoked links.
- Final Release simulator build passed. Seven simulator journeys passed, zero failures/skips/runtime warnings, iPhone 18 Pro / iOS 27.0, result bundle `signalword-ui.EdQmKs/Journey.xcresult`.
- An initial new UI case failed because a centre-screen test swipe hit the hold-to-resolve control; scrolling from the page margin corrects the test without weakening the safety gesture. Two overlapping UI runs were discarded. The runner now rejects overlapping invocations, preserves failure screenshots, and skips lengthy optional system diagnostics while retaining XCTest failures/results.

## Files changed in this slice

- `apps/ios/Package.swift`
- `apps/ios/SignalWord/App/AppCompositionRoot.swift`
- `apps/ios/SignalWord/App/UITestCheckInService.swift`
- `apps/ios/SignalWord/Core/Alerts/CheckInTimer.swift`
- `apps/ios/SignalWord/Features/AppShell/CheckInModel.swift`
- `apps/ios/SignalWord/Features/AppShell/CheckInPanel.swift`
- `apps/ios/SignalWord/Features/AppShell/HomeScreen.swift`
- `apps/ios/SignalWord/Features/AppShell/SignalWordRootView.swift`
- `apps/ios/SignalWord/Services/UserAPI/RemoteUserLifecycleAPI.swift`
- `apps/ios/Tests/CheckInTests.swift`
- `apps/ios/UITests/SignalWordJourneyTests.swift`
- `apps/viewer/e2e/viewer.mjs`
- `apps/viewer/src/viewer/ViewerApp.tsx`
- `apps/viewer/src/viewer/api.test.ts`
- `apps/viewer/src/viewer/api.ts`
- `apps/viewer/src/viewer/model.ts`
- `contracts/v2/check-in.response.json`
- `docs/implementation/sequential-slices/CHECK_IN_TIMER.md`
- `docs/implementation/sequential-slices/HANDOFF.md`
- `scripts/check-operations.mjs`
- `scripts/test-check-in-concurrency.mjs`
- `scripts/test-ios-ui.sh`
- `scripts/verify-contracts.mjs`
- `supabase/functions/_shared/check-in.ts`
- `supabase/functions/_shared/delivery.ts`
- `supabase/functions/_shared/outbox.ts`
- `supabase/functions/_shared/public-projection.ts`
- `supabase/functions/_shared/resend.ts`
- `supabase/functions/_shared/response-contracts.ts`
- `supabase/functions/user-api/index.ts`
- `supabase/migrations/20260929020000_check_in_timers.sql`
- `supabase/migrations/20260929021000_timer_projection_and_retention.sql`
- `supabase/migrations/20260929022000_check_in_health.sql`
- `supabase/tests/check_in_timer.test.sql`
- `tests/check-in.test.mjs`
- `tests/operations.test.mjs`
