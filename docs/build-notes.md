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
