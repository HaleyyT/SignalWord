# Build Notes

## 20 September 2026 — Master brief review

### Confirmed decisions

- Eight-day sprint is planned for 20–27 September with a Day-4 App Store candidate and Day-7 submission-ready gate.
- Full Xcode is not currently installed/configured on this Mac; this is the first toolchain gate.
- The project folder currently resolves Git operations to the parent `Projects` repository. The founder will initialize a dedicated repository later; no Git mutation should happen before then.
- The product name is not yet frozen: SafeWord, SignalWord, and WordSignal all appear.
- The hero behavior is now explicitly a custom phrase working while the iPhone is locked.
- Preferred implementation: iOS Vocal Shortcuts invokes a narrow SafeWord App Intent. The system owns on-device listening; SafeWord does not run a hidden always-on recorder and does not receive the phrase/audio.
- The app must not claim voice/speaker biometric verification.
- V1 automatically alerts one confirmed trusted contact. It does not automatically send data to police or claim emergency dispatch.
- Guardian Session is optional enhancement/readiness context, not a prerequisite for the locked vocal trigger.
- Primary award strategy: Peace Prize, Design Award, Build in Public; Next Gen only if student eligibility is confirmed; Grand Prize only with genuine traction evidence.

### Official event facts checked

- RevenueCat Shipaton 2026 is open for submissions.
- Devpost deadline: 1 October 2026 at 06:45 UTC.
- Standard path requires a first public store release during 1 August–30 September 2026 and a RevenueCat-powered purchase.
- Next Gen uses a public repository/video path and requires student/academic validation.

### Day-1 questions to answer empirically

1. Does the app’s action appear in Vocal Shortcuts?
2. Does the intent execute while locked, backgrounded, and force-quit?
3. What happens after reboot before/after first unlock?
4. Can the intent access a device-only after-first-unlock credential?
5. Can it create an authenticated network event within the runtime budget?
6. Can it acquire cached or fresh location while locked?
7. Does repeated speech inside cooldown yield one message?
8. Which verified delivery route is production-ready: email, SMS, or both?

### Planning outputs

- `docs/PLAN_REVIEW.md`
- `docs/PRD.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/API_CONTRACTS.md`
- `docs/THREAT_MODEL.md`
- `docs/CLAIMS_LEDGER.md`
- `docs/TEST_PLAN.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/8_DAY_EXECUTION_PLAN.md`

### Deepening rounds

- One major product clarification from the founder: the phrase must work like “Hey Siri” while the phone is locked and should trigger location/information delivery.
- This changed the architecture from an app-owned Guardian Session recognizer to a system-owned Vocal Shortcut/App Intent path.

## 20 September 2026 — execution hardening pass

- Added a Day 0 external-prerequisite gate so Xcode, signing, accounts, product identity, hosting, and the selected provider do not consume implementation time.
- Reduced planned daily load to 4.5–5 hours and protected 60–90 minutes for integration/review surprises.
- Added a 90-minute pivot rule for uncertain tasks.
- Reordered Day 1 so location is attempted only after locked intent, authenticated event, delivery, and viewer work.
- Limited the sprint to development/test and production environments.
- Limited delivery work to one production provider plus one fake adapter.
- Froze API/schema/state contracts at the end of Day 2 with shared fixtures.
- Added a locked-device capability matrix and public claims ledger.
- Clarified that an offline trigger may wait for an OS-permitted/next-launch retry and must never claim immediate delivery.
- Made Day 4 the latest App Store target, with permission to submit a credible Day-3 candidate immediately.
- Final engineering-plan assessment after these corrections: 93/100, with residual risk concentrated in physical-device/App Review/provider behavior.

## 20 September 2026 — Day-1 implementation status

- Confirmed again that this Mac does not have full Xcode selected: `xcodebuild -version` resolves to Command Line Tools and fails.
- The available Swift compiler and Command Line Tools SDK are mismatched, so neither package builds nor XCTest can run. This is an environment blocker, not a source-test pass.
- Added the platform-independent alert trigger core with deterministic cooldown reuse and an honest failure outcome. Full execution of its verification harness is deferred until Xcode is installed and selected.
- Added the narrow iOS 18 App Intent/App Shortcut source, a bearer-token Keychain store using the after-first-unlock device-only accessibility class, and the idempotent alert API client. These sources are parser-validated only until the Xcode toolchain is available.
- No locked-device, Vocal Shortcut, credential, network, contact-delivery, or viewer claim has been marked proven.

## 21 September 2026 — Day-2 backend foundation

- Added the initial Supabase migration for the V1 privacy boundary: profiles, one trusted contact, idempotent events, location samples, delivery diagnostics, and hashed expiring viewer tokens.
- Static schema security checks pass. The migration and real cross-user RLS tests have not run because the Supabase CLI is absent and the local Docker daemon is not running. Apply the migration to development/test and run those tests before treating the backend boundary as proven.
- Frozen create-alert and public-viewer response fixtures and made them part of the local/CI verification gate. Contract changes now require an intentional fixture and documentation update.

## 21 September 2026 — Day-3 reliability foundation

- Added legal alert state transitions, server-time location freshness classification, retry classification, and a redacted pending-alert outbox contract. These are parser-validated only because the local Swift SDK is still unusable without full Xcode.
- Attempted to install the Supabase CLI, but Homebrew rejected it because the installed Command Line Tools are outdated. Update Command Line Tools or install/select full Xcode before retrying. Docker’s daemon is also not running, so database-backed Day-3 integration tests remain blocked.

## 21 September 2026 — Day-4 public information foundation

- Added dedicated privacy and support routes to the viewer with honest safety boundaries, retention language, private security-reporting guidance, and no invented emergency-service claim.
- Hosted deployment, in-app delete data flow, purchase/restore, and physical-device accessibility checks remain pending their backend, RevenueCat, and Xcode prerequisites.

## 21 September 2026 — Day-5 release discipline

- Added a strict release preflight and a redacted evidence log for the ten-run reliability gate, physical-device failure matrix, and privacy/abuse review.
- The preflight is expected to remain blocked until full Xcode and a healthy local Supabase stack are available. It must not be bypassed for a release candidate.
- Added a moderator-ready external usability script and a privacy/abuse review runbook. Both require sandbox/test data and record redacted evidence only; neither represents completed device or backend validation.

## 22 September 2026 — Day-6 quality baseline

- Full Xcode 27 is installed and selected. The Swift core verification executable now builds and passes on this machine after correcting its assertion helper and default clock closure.
- Added small viewer accessibility improvements that can be statically and unit-test verified: complete state wording, polite status announcements, larger actionable-link targets, explicit new-tab labels, and a Reduce Motion fallback.
- Added the controlled reliability-study protocol and redacted results template. The 50 physical phrase trials, delivery reconciliation, and tester-led usability findings remain pending observed evidence.
- Docker Desktop is installed but its daemon socket was unavailable during the Day-6 check, so the local Supabase stack is not yet verified as healthy.
