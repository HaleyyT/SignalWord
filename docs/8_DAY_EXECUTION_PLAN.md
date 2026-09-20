# SafeWord Eight-Day Execution Plan

**Sprint:** 20–27 September 2026  
**Capacity:** minimum 6 focused founder-hours/day plus Codex-assisted implementation; schedule only 4.5–5 hours of planned work and preserve 60–90 minutes for integration surprises  
**Submission deadline:** 1 October 2026, 06:45 UTC  
**Release strategy:** first App Store candidate submitted by Day 4; Day 7 must already be submission-ready.

## Outcome

Ship a narrow iOS product in which the user trains a custom iOS Vocal Shortcut such as “cat rainbow,” locks the phone, speaks the phrase, and causes a SafeWord App Intent to send exactly one honest alert and best-available location to one confirmed trusted contact. The contact opens a secure mobile web page without installing the app.

V1 does not automatically contact police. It may provide an explicit user/contact action to call the appropriate local emergency number. Direct dispatch requires an authorized regional partner and is not an eight-day feature.

## Build mode

- **Execution:** autonomous within each agreed day, with founder verification at every go/pivot gate.
- **Check-ins:** start of day, midpoint risk check, end-of-day physical-device demo.
- **Git:** initialize later when the founder is ready; before then, do not run staging or commit commands. Once initialized inside this folder, commit at each green vertical slice.
- **Quality rule:** no new feature while the release branch/core build is red.
- **Feature freeze:** end of Day 6; Day 7–8 are evidence, fixes, release, and submission only.
- **Environment rule:** development/test and production only; no third environment during the sprint.
- **90-minute pivot rule:** if an uncertain task has no working proof after 90 focused minutes, record the blocker, choose its documented fallback, and continue the vertical slice.
- **Claims rule:** no store, video, website, or Devpost claim ships without an evidence entry in `docs/CLAIMS_LEDGER.md`.

## Dependency graph

```text
Xcode + signing + physical iPhone
  → locked Vocal Shortcut/App Intent proof
    → authenticated idempotent alert API
      → confirmed contact delivery
        → secure viewer
          → location freshness + resolution
            → polished onboarding/readiness
              → RevenueCat + App Store candidate
                → regression/security/usability evidence
                  → video + Devpost submission
```

If an upstream node fails, downstream polish pauses.

## Day 0 — prerequisites before the eight-day clock starts

Day 0 is not product-development time. The sprint begins only when these external gates are green:

- [ ] final public name, bundle identifier, repository name, and support domain selected;
- [ ] name/domain/trademark collision check completed;
- [ ] full Xcode installed and selected; license accepted; simulator runtime available;
- [ ] signed blank app runs on the target physical iPhone;
- [ ] Apple Developer Program and App Store Connect roles confirmed;
- [ ] Paid Apps Agreement, tax, and banking requirements completed;
- [ ] App Store Connect app record and RevenueCat project created;
- [ ] one development/test backend and one production backend available;
- [ ] one production-capable delivery provider selected and its sender/domain verified;
- [ ] one fake delivery adapter selected for automated tests;
- [ ] hosting and public privacy/support domain access confirmed;
- [ ] dedicated repository will be initialized inside this folder before any staging/commit operation.

If a gate remains blocked, solve it before starting Day 1 or consciously switch to an eligible submission fallback. Do not consume Day 1 pretending account/tooling setup is feature progress.

## Scope lock

### Must finish

- system-owned custom vocal phrase mapped to `TriggerAlertIntent`;
- locked-device proof on a physical iPhone;
- one confirmed contact and one delivery route;
- idempotent alert + cooldown + offline outbox;
- best-available location with honest freshness;
- secure expiring viewer and resolution update;
- test mode and Readiness Check;
- RevenueCat purchase/restore for non-safety Plus features;
- privacy/support/delete data;
- store release and complete Devpost proof.

### Do not start

- direct police dispatch;
- app-owned always-on microphone;
- speaker biometrics;
- multiple contacts/circles;
- Android/watchOS;
- multilingual recognition;
- post-trigger audio recording;
- rich history, chat, or analytics dashboards;
- OneSignal/Stripe/Layers sponsor tracks unless all release gates are already green.

The Readiness Check is the only approved extra product feature during the sprint. Every other new idea goes to the post-Shipaton backlog.

## Day 1 — Sunday 20 September: prove the locked trigger and real alert

### Top goal

Before visual design, prove the exact sentence: “I locked my phone, said my trained phrase, and one trusted contact received a secure real event.”

- [ ] **D1-01 — Freeze identity and eligibility path**
  **Why now:** Three names and two eligibility routes will otherwise leak into bundle IDs, store records, copy, and assets.
  **Files/components:** project decision log, bundle ID plan, product copy.
  **Implementation:** founder chooses SafeWord/SignalWord/WordSignal; confirm standard store path and whether Next Gen is also legitimately available; select one target contact channel and test recipient.
  **Acceptance:** one written public name, one bundle ID, primary award list, one fallback submission path.
  **Verify:** search project docs for the rejected names and record intentional legacy references.
  **Rollback/pivot:** keep `SafeWord` as an internal codename only until availability is checked.
  **Estimate:** 30 min

- [ ] **D1-02 — Recheck the Day-0 gate**
  **Why now:** Day 1 must not begin on top of an unverified toolchain, signing, provider, or store assumption.
  **Files/components:** Xcode, physical iPhone, Apple/App Store/RevenueCat records, selected provider.
  **Implementation:** run the recorded smoke checks and confirm the two-environment/provider configuration without exposing secrets.
  **Acceptance:** `xcodebuild -version` succeeds, a signed blank app runs, and required account records are accessible.
  **Verify:** `xcodebuild -version`; run blank app; send one provider console test to the designated test recipient.
  **Rollback/pivot:** return to Day 0; do not borrow time from the locked-trigger spike.
  **Estimate:** 20 min

- [ ] **D1-03 — Build the smallest locked App Intent spike**
  **Why now:** This is the product’s existential technical assumption.
  **Files/components:** `TriggerAlertIntent`, `AppShortcutsProvider`, minimal shared configuration.
  **Implementation:** expose a background-capable alert intent with locked execution allowed, no foreground UI requirement, no spoken sensitive result, and a local counter/test endpoint.
  **Acceptance:** the action appears in Shortcuts/Vocal Shortcuts and runs while the phone is locked.
  **Verify:** train “cat rainbow,” lock phone, say it three times in separated trials, and capture timestamped results.
  **Rollback/pivot:** test Siri phrase/App Shortcut and Action button. Do not create a hidden audio background service.
  **Estimate:** 90 min

- [ ] **D1-04 — Prove authenticated network event, delivery, and text-only viewer**
  **Why now:** The core product is an alert, so event creation and contact delivery come before location.
  **Files/components:** safe test credential, minimal Edge Function/table, selected provider adapter, text-only viewer.
  **Implementation:** read an after-first-unlock/device-only test credential from the locked intent, create/reuse one event, send one TEST message, and open a minimal secure page.
  **Acceptance:** locked intent → one authenticated event → one TEST message → second-device page.
  **Verify:** inspect event/provider counts; repeat inside cooldown and confirm no second delivery.
  **Rollback/pivot:** use the preselected verified provider; do not implement another real provider on Day 1.
  **Estimate:** 75 min

- [ ] **D1-05 — Add best-effort locked location last**
  **Why now:** Location is valuable, but it must never delay or prevent the contact alert.
  **Files/components:** location adapter, optional alert payload, viewer location state.
  **Implementation:** attach cached/last-known location immediately when available, attempt one fresh sample within a strict timeout, otherwise show unavailable.
  **Acceptance:** alert succeeds with fresh, stale, denied, and unavailable location states.
  **Verify:** test locked, force-quit, Low Power Mode, location denied, and reboot-before-first-unlock; record the capability matrix.
  **Rollback/pivot:** ship the alert with honest `Location unavailable`; never delay the event for GPS.
  **Estimate:** 60 min

- [ ] **D1-06 — Go/pivot review and evidence log**
  **Why now:** Continuing after a failed existential test would waste the sprint.
  **Files/components:** `docs/build-notes.md`, test evidence.
  **Implementation:** document device/OS, state matrix, latency, failures, limitations, chosen provider, and decision.
  **Acceptance:** explicit `GO`, `PIVOT`, or `STOP` with reasons.
  **Verify:** founder personally repeats the working flow once without developer intervention.
  **Rollback/pivot:** use Siri/Action button/manual trigger and rewrite every claim if custom locked phrase does not pass.
  **Estimate:** 15 min

**Planned work:** 290 minutes. **Protected contingency:** 70 minutes.

### End-of-day demo

Locked phone, spoken phrase, one second-device TEST alert, secure viewer.

### Definition of Done

The primary mechanism is empirically proven or the public promise has been narrowed. No unknown “we will solve background voice later” remains.

### Explicitly deferred

Design polish, purchases, multiple contacts, rich maps, production analytics.

## Day 2 — Monday 21 September: production foundation and contact readiness

### Top goal

Replace the spike with a small maintainable system whose authorization and data boundaries are tested.

- [ ] **D2-01 — Scaffold the monorepo and configuration boundary**
  **Why now:** Shared layout and environment separation prevent fast code from becoming unshippable.
  **Files/components:** `apps/ios`, `apps/viewer`, `supabase`, `.env.example`, config types.
  **Implementation:** create targets, dependency injection roots, development/test and production configuration, formatter/lint defaults, and secret-free examples.
  **Acceptance:** iOS and viewer start independently; production secrets are absent from source.
  **Verify:** clean builds plus secret scan/`rg` for known keys.
  **Rollback/pivot:** remove nonessential tooling before compromising build time.
  **Estimate:** 45 min

- [ ] **D2-02 — Apply minimal schema, RLS, indexes, and retention**
  **Why now:** Authorization must exist before UI depends on unsafe tables.
  **Files/components:** SQL migrations for profiles, contacts, events, locations, deliveries, viewer tokens.
  **Implementation:** deny by default, owner policies, unique idempotency constraint, token hashing, expiry indexes, retention job/function.
  **Acceptance:** user A cannot access user B; public tables are not directly readable.
  **Verify:** `npx supabase test db` or equivalent SQL/RLS test suite.
  **Rollback/pivot:** reduce schema, never relax RLS for speed.
  **Estimate:** 60 min

- [ ] **D2-03 — Implement typed alert domain and persistence**
  **Why now:** Intent, UI, outbox, and recovery need one source of truth.
  **Files/components:** alert state machine, repositories, typed errors, redacting logger.
  **Implementation:** legal transitions, canonical event ID, cooldown, idempotency persistence, redacted outbox, dependency-injected services.
  **Acceptance:** app restart reconstructs pending/active event without duplicate creation.
  **Verify:** unit tests for transitions, concurrency, encoding, and redaction.
  **Rollback/pivot:** use a compact persisted aggregate rather than a general event-sourcing system.
  **Estimate:** 60 min

- [ ] **D2-04 — Build one-contact confirmation flow**
  **Why now:** A safety alert should not surprise or spam an unprepared recipient.
  **Files/components:** contact API, encrypted destination, test/consent message, confirmation page.
  **Implementation:** add/replace one contact, preview message, send TEST link, confirm recipient, expose readiness status.
  **Acceptance:** contact becomes ready only after the confirmation/test succeeds.
  **Verify:** valid, expired, reused, wrong-user, and rate-limit cases.
  **Rollback/pivot:** founder-verified demo contact only, clearly labeled, if full confirmation UI threatens Day 3.
  **Estimate:** 60 min

- [ ] **D2-05 — Build secure viewer baseline**
  **Why now:** This is half of the wow moment and the main external trust surface.
  **Files/components:** public-event function, React viewer, token route, states.
  **Implementation:** mobile layout for test/real, active/resolved/expired, last updated, location unavailable, and generic invalid link.
  **Acceptance:** no install/login; only one event projection; no token in analytics/storage/referrer.
  **Verify:** viewer unit tests and browser network/storage inspection.
  **Rollback/pivot:** use coordinates + external map link before adding an interactive map.
  **Estimate:** 45 min

- [ ] **D2-06 — Freeze contracts and protect them with smoke checks**
  **Why now:** Day 3 integration will otherwise break silent assumptions or churn endpoint/state shapes.
  **Files/components:** API schema, alert states, shared JSON fixtures, one GitHub Actions workflow after the dedicated repo exists.
  **Implementation:** freeze endpoint names, request/response shapes, idempotency, freshness, retention, and state transitions; use the same JSON fixtures in iOS/backend/viewer tests; run web build/tests, backend migration tests, and iOS unit tests.
  **Acceptance:** one command/workflow reports core checks; after this item, contracts change only for a documented P0/P1 reason.
  **Verify:** intentionally fail a shared fixture/contract test, confirm red, restore green.
  **Rollback/pivot:** local `scripts/verify` until remote repo/CI is ready.
  **Estimate:** 30 min

**Planned work:** 300 minutes. **Protected contingency:** 60 minutes.

### End-of-day demo

Configure a contact, receive a TEST consent link, confirm it, and open the secure viewer; show cross-user test rejection.

### Definition of Done

Data/auth boundaries are real, the contact is confirmed, and the viewer is safe enough for Day 3 reliability work.

### Explicitly deferred

Pixel polish, interactive map, history, additional contacts.

## Day 3 — Tuesday 22 September: reliable end-to-end alert

### Top goal

Make the locked phrase loop repeatable, offline-aware, duplicate-proof, and honest.

- [ ] **D3-01 — Replace spike with production `TriggerAlertIntent` coordinator**
  **Why now:** All dependencies now exist behind testable interfaces.
  **Files/components:** App Intent, coordinator, credential/persistence adapters.
  **Implementation:** readiness validation, locked execution, event reuse, silent result, bounded timeouts, structured outcomes.
  **Acceptance:** intent uses production API without opening the app or exposing secrets.
  **Verify:** coordinator unit tests plus three locked physical-device runs.
  **Rollback/pivot:** keep location asynchronous and prioritize event creation.
  **Estimate:** 60 min

- [ ] **D3-02 — Implement idempotent delivery and fallback**
  **Why now:** Duplicate or missing messages destroy trust and can incur cost.
  **Files/components:** delivery worker/adapter, retry state, provider callbacks.
  **Implementation:** send through the one selected production provider after DB commit, enforce provider idempotency and bounded retries, validate callbacks, and use the fake adapter for deterministic tests. Add a second real provider only after every release gate is green.
  **Acceptance:** 20 concurrent same-key requests create one event and at most one recipient message.
  **Verify:** backend concurrency/integration test and provider dashboard receipt.
  **Rollback/pivot:** ship one verified provider rather than two unreliable ones.
  **Estimate:** 60 min

- [ ] **D3-03 — Add best-available location and freshness**
  **Why now:** Location is useful only if timestamps and staleness are trustworthy.
  **Files/components:** iOS location adapter, location endpoint, viewer freshness/map fallback.
  **Implementation:** attach cached sample to initial alert, attempt fresh sample, store captured/received times, classify live/recent/stale/unavailable.
  **Acceptance:** denied, stale, approximate, and fresh states render accurately.
  **Verify:** injected time unit tests and physical permission/network matrix.
  **Rollback/pivot:** omit map tiles; retain timestamped coordinates and map link.
  **Estimate:** 45 min

- [ ] **D3-04 — Implement offline outbox and recovery**
  **Why now:** The trigger must not disappear silently when connectivity is poor.
  **Files/components:** local outbox, retry policy, app recovery UI.
  **Implementation:** persist invocation/idempotency before network; retry only during OS-permitted execution or the next app run; reconcile canonical event on relaunch; never display delivered before evidence.
  **Acceptance:** airplane-mode trigger remains pending and becomes exactly one event/message when an allowed retry occurs; copy states that network is required for immediate delivery.
  **Verify:** physical airplane-mode E2E twice and unit tests for backoff/reconciliation.
  **Rollback/pivot:** clearly state that delivery requires the app to regain network/open if OS background retry cannot be guaranteed.
  **Estimate:** 60 min

- [ ] **D3-05 — Add deliberate resolution and retention**
  **Why now:** Contacts need closure and links/location must not remain live forever.
  **Files/components:** resolve UI/API, authentication, status update, expiry.
  **Implementation:** hold-to-resolve + device authentication, idempotent server transition, contact update, stop locations, scheduled expiry.
  **Acceptance:** viewer changes to resolved; original alert remains visible until expiry; unauthorized locked resolve fails.
  **Verify:** UI/integration tests and second-device observation.
  **Rollback/pivot:** keep resolve in app only; never expose it on public link.
  **Estimate:** 45 min

- [ ] **D3-06 — Mid-sprint ten-run reliability gate**
  **Why now:** UI work is forbidden if the core loop remains flaky.
  **Files/components:** evidence log, blocker log.
  **Implementation:** run locked phrase → message → viewer → resolve repeatedly; measure event and delivery latency.
  **Acceptance:** 10 consecutive controlled successes, zero duplicate messages, no P0/P1.
  **Verify:** database/provider counts and timestamped test sheet.
  **Rollback/pivot:** freeze Day 4 visual work until the root cause is fixed or the claim is narrowed.
  **Estimate:** 30 min

**Planned work:** 300 minutes. **Protected contingency:** 60 minutes.

### End-of-day demo

Locked phrase with real delivery, fresh/stale/unavailable location states, repeated phrase deduplication, and contact-visible resolution.

### Definition of Done

The full product loop is reliable enough to protect with release tests.

### Explicitly deferred

New feature ideas, advanced animation, multiple regions/providers.

## Day 4 — Wednesday 23 September: trust-first product, RevenueCat, first store candidate

### Top goal

Turn the proven loop into a coherent product and submit the first review candidate today.

Day 4 is the latest submission target, not a reason to wait. If the minimum credible build and required metadata are ready on Day 3, submit it immediately and improve a subsequent candidate while review is in progress.

- [ ] **D4-01 — Implement the visual system and three-screen shell**
  **Why now:** The architecture is stable enough for design work.
  **Files/components:** tokens, components, onboarding, home/readiness, alert status.
  **Implementation:** calm high-contrast palette, strong type hierarchy, generous spacing, unique signal motif, dark mode, Reduce Motion, semantic components.
  **Acceptance:** onboarding, ready home, and active alert look like one intentional product at all supported text sizes.
  **Verify:** SwiftUI previews/screenshots plus contrast and XXXL Dynamic Type inspection.
  **Rollback/pivot:** use native controls and one signature motion; remove ornamental animation.
  **Estimate:** 75 min

- [ ] **D4-02 — Ship guided Vocal Shortcut setup and Readiness Check**
  **Why now:** A new user must configure the unusual system integration without developer help.
  **Files/components:** setup guide, test flow, readiness cards, fallbacks.
  **Implementation:** explain system ownership, guide settings steps, require two locked tests, show contact/location/backend readiness, expose Siri/Action/manual alternatives.
  **Acceptance:** a new tester completes setup using only on-screen guidance.
  **Verify:** one unassisted usability session; screen-record confusion points.
  **Rollback/pivot:** use concise illustrated steps and a checklist; do not use private Settings URL schemes.
  **Estimate:** 45 min

- [ ] **D4-03 — Integrate RevenueCat without touching safety core**
  **Why now:** It is required for eligibility and must be present in the review build.
  **Files/components:** purchase service, Plus screen, offering, restore, entitlement tests.
  **Implementation:** one noncritical `plus` entitlement/offering, clear price/trial/terms, user-initiated restore, offline/error/cancel states; no entitlement call in trigger coordinator.
  **Acceptance:** sandbox/Test Store purchase and restore unlock only non-safety features; trigger works with RevenueCat unreachable.
  **Verify:** RevenueCat testing checklist and network-disabled alert test.
  **Rollback/pivot:** reduce premium to one visual customization/preset; keep the real purchase.
  **Estimate:** 60 min

- [ ] **D4-04 — Complete privacy/support/delete and review copy**
  **Why now:** These are store blockers, not late documentation.
  **Files/components:** hosted privacy/support pages, in-app limitations, delete flow, purpose strings, review notes.
  **Implementation:** disclose system phrase processing, location/contact sharing, retention, third parties, no police dispatch, no guarantees, account deletion.
  **Acceptance:** all URLs public; app and store claims match tested behavior.
  **Verify:** second-browser link check and copy audit against `TEST_PLAN.md`.
  **Rollback/pivot:** static hosted pages are sufficient; no custom CMS.
  **Estimate:** 30 min

- [ ] **D4-05 — Package store assets and submit candidate**
  **Why now:** Review latency is the schedule’s largest external risk.
  **Files/components:** archive, IAP metadata, icon, screenshots, description, age/privacy responses.
  **Implementation:** create release archive, upload, attach IAP, complete metadata, provide precise Vocal Shortcut review steps and manual fallback.
  **Acceptance:** build and IAP show `Waiting for Review`/equivalent today.
  **Verify:** App Store Connect checklist and receipt/screenshot of state.
  **Rollback/pivot:** if blocked, resolve missing agreements/metadata immediately; preserve Next Gen package.
  **Estimate:** 60 min

**Planned work:** 270 minutes. **Protected contingency:** 90 minutes.

### End-of-day demo

Fresh install, unassisted setup, locked trigger, viewer, Plus purchase/restore, and App Store submission state.

### Definition of Done

The product is understandable, accessible, monetized without exploiting safety, and submitted early enough to recover.

### Explicitly deferred

Additional premium features, custom map effects, nonessential onboarding pages.

## Day 5 — Thursday 24 September: security, regression, and external beta

### Top goal

Find product-breaking failures while there is still time to submit a corrected build.

- [ ] **D5-01 — Execute automated release suite**
  **Why now:** Establish a green baseline before exploratory tests.
  **Files/components:** iOS, backend/RLS, viewer, contract tests.
  **Implementation:** complete missing P0/P1 tests; run clean builds, tests, migration validation, and secret scan.
  **Acceptance:** all release checks green and reproducible from documented commands.
  **Verify:** saved CI/local result linked from build notes.
  **Rollback/pivot:** fix flaky tests or remove them from gate only with documented replacement verification.
  **Estimate:** 45 min

- [ ] **D5-02 — Run physical-device failure matrix**
  **Why now:** The highest risks exist outside simulators.
  **Files/components:** release candidate and evidence sheet.
  **Implementation:** locked/unlocked, force-quit, reboot, denied location, cellular/Wi-Fi/offline, Low Power Mode, wrong clock, repeated phrase, near match.
  **Acceptance:** observed behavior matches UI/copy; no duplicate or false success.
  **Verify:** complete `TEST_PLAN.md` matrix.
  **Rollback/pivot:** narrow marketing/capability or correct implementation and upload new candidate.
  **Estimate:** 75 min

- [ ] **D5-03 — Conduct privacy and abuse review**
  **Why now:** A social-good story collapses under one data leak or spam path.
  **Files/components:** RLS, tokens, logs, headers, rate limits, deletion.
  **Implementation:** adversarial user A/B tests, concurrent trigger, expired link, log inspection, browser token leakage, provider signature, delete flow.
  **Acceptance:** threat-model release gate passes; no service secret or sensitive logs.
  **Verify:** attach redacted test output to build notes.
  **Rollback/pivot:** disable the affected feature/provider; never waive a data-isolation issue.
  **Estimate:** 60 min

- [ ] **D5-04 — Run five external usability tests**
  **Why now:** Setup and contact comprehension cannot be self-reviewed.
  **Files/components:** test script, observation sheet, issue list.
  **Implementation:** watch users configure readiness and contacts; ask contacts what happened, how fresh location is, and what action they would take.
  **Acceptance:** at least 4/5 complete setup without help and interpret viewer correctly.
  **Verify:** record anonymized task results and top three issues.
  **Rollback/pivot:** fix copy/order, not by adding tutorials everywhere.
  **Estimate:** 90 min

- [ ] **D5-05 — Triage and submit only P0/P1 fixes**
  **Why now:** Fast correction matters; feature churn risks review.
  **Files/components:** release branch/build, regression tests, review notes.
  **Implementation:** reproduce, root-cause, fix, add regression, rerun affected/full flow, upload replacement only if needed.
  **Acceptance:** no open P0/P1; store candidate remains current.
  **Verify:** five consecutive post-fix core runs.
  **Rollback/pivot:** revert risky fix and narrow behavior if safer.
  **Estimate:** 30 min

**Planned work:** 300 minutes. **Protected contingency:** 60 minutes.

### End-of-day demo

A tester—not the developer—configures and triggers the app; a second tester explains the viewer accurately.

### Definition of Done

No known high-severity bug or data leak, and real users can understand the app.

### Explicitly deferred

P3 polish, new award integrations, broad analytics.

## Day 6 — Friday 25 September: measured quality and memorable polish

### Top goal

Turn evidence and feedback into judge-visible craft without destabilizing release.

- [ ] **D6-01 — Fix the three highest-impact usability/accessibility issues**
  **Why now:** Focused fixes outperform generalized polish.
  **Files/components:** onboarding/readiness/viewer/accessibility tests.
  **Implementation:** address observed blockers; refine VoiceOver order, labels, large text, touch targets, contrast, Reduce Motion.
  **Acceptance:** repeat users complete affected tasks and critical screens pass accessibility review.
  **Verify:** rerun the exact failed tasks and accessibility checks.
  **Rollback/pivot:** prefer simpler layout/copy over new custom components.
  **Estimate:** 60 min

- [ ] **D6-02 — Add one signature interaction, not a feature**
  **Why now:** Design Award needs memorable craft, but feature freeze is near.
  **Files/components:** readiness/trigger confirmation visual and haptics.
  **Implementation:** create a restrained “signal halo” that moves from ready → sent → contact reached; use semantic state, subtle haptic where allowed, and reduced-motion alternative.
  **Acceptance:** motion clarifies state, remains discreet, and never fabricates provider delivery.
  **Verify:** slow network/provider failure demo and Reduce Motion recording.
  **Rollback/pivot:** static state transition if animation adds instability.
  **Estimate:** 45 min

- [ ] **D6-03 — Complete controlled reliability study**
  **Why now:** Measured honesty is a Peace Prize/engineering differentiator.
  **Files/components:** test protocol and results report.
  **Implementation:** run 50 phrase trials by condition, capture false activations, event/delivery latency, and location freshness; state limitations.
  **Acceptance:** raw counts and conditions are publishable without overclaiming.
  **Verify:** reconcile trial log with database/provider event counts.
  **Rollback/pivot:** publish smaller valid sample if time runs short; never invent accuracy.
  **Estimate:** 75 min

- [ ] **D6-04 — Finish store/submission visual assets**
  **Why now:** Real product screens now exist and review may request changes.
  **Files/components:** icon, 1179×2556 screenshot, additional screenshots, architecture visual.
  **Implementation:** use fictional data, lead with locked phrase → received alert, maintain calm identity, no device frame on required image.
  **Acceptance:** assets meet size/content requirements and tell the story without explanatory paragraphs.
  **Verify:** pixel-dimension check and second-person five-second comprehension test.
  **Rollback/pivot:** one exceptional required screenshot before a broad mediocre set.
  **Estimate:** 45 min

- [ ] **D6-05 — Build-in-public and judge narrative evidence**
  **Why now:** The award values decisions and learning, not a last-day promotional dump.
  **Files/components:** public posts, submission draft, metrics table.
  **Implementation:** publish genuine decisions: rejecting hidden listening, using system vocal triggers, not claiming police dispatch, privacy boundaries, reliability results, tester-led fixes.
  **Acceptance:** at least three substantive public artifacts and draft Peace/Design/Build in Public answers.
  **Verify:** links open publicly and claims match evidence.
  **Rollback/pivot:** prioritize one strong technical story over volume.
  **Estimate:** 45 min

- [ ] **D6-06 — Feature freeze and release audit**
  **Why now:** Remaining time belongs to submission reliability.
  **Files/components:** backlog, release checklist, build notes.
  **Implementation:** move every unbuilt idea to post-Shipaton; verify candidate/review status and blocker ownership.
  **Acceptance:** no planned feature code after this task.
  **Verify:** founder signs the freeze in build notes.
  **Rollback/pivot:** only App Review, P0/P1, or submission-validity work can break freeze.
  **Estimate:** 15 min

**Planned work:** 285 minutes. **Protected contingency:** 75 minutes.

### End-of-day demo

Polished locked-trigger story plus the measured test results and the exact privacy boundary.

### Definition of Done

The product is memorable because it is clear and trustworthy, not because it accumulated features.

### Explicitly deferred

All feature development.

## Day 7 — Saturday 26 September: film and complete the submission

### Top goal

Create a complete submission that could be sent today if Day 8 vanished.

- [ ] **D7-01 — Run final release regression before filming**
  **Why now:** Never film a build that is not the candidate.
  **Files/components:** release build, test suite, production services.
  **Implementation:** clean install, setup, locked trigger, delivery, viewer, resolve, RevenueCat, delete, URL checks.
  **Acceptance:** all release gates green and build number recorded.
  **Verify:** five consecutive filmed-flow rehearsals.
  **Rollback/pivot:** film only after the release behavior is stable.
  **Estimate:** 45 min

- [ ] **D7-02 — Film the real two-device hero sequence**
  **Why now:** The demo is the judge’s strongest proof.
  **Files/components:** iPhone, contact device, script, clean fictional account.
  **Implementation:** show locked phone, spoken phrase, received message, viewer/location, readiness/privacy, RevenueCat, measured result.
  **Acceptance:** essential footage is understandable without narration and contains no private data.
  **Verify:** a new viewer explains the app after one viewing.
  **Rollback/pivot:** use clear cuts/timestamp overlays, never staged/fake delivery.
  **Estimate:** 75 min

- [ ] **D7-03 — Edit and publish 90–115 second video**
  **Why now:** Upload/transcoding/link errors need buffer.
  **Files/components:** final MP4, captions, YouTube/Vimeo listing.
  **Implementation:** tight hook, large readable captions, permitted audio/assets, architecture only after product proof.
  **Acceptance:** public playback works signed out; essential content ends before two minutes.
  **Verify:** watch on phone with sound off and desktop signed out.
  **Rollback/pivot:** remove secondary content before speeding up essential proof.
  **Estimate:** 60 min

- [ ] **D7-04 — Complete Devpost draft and award responses**
  **Why now:** Judge framing should match the actual build and official fields.
  **Files/components:** title/tagline, description, built-with, links, category responses, project ID.
  **Implementation:** lead with problem/insight/proof; write separate Peace, Design, Build in Public, and conditional Next Gen/Grand Prize evidence.
  **Acceptance:** every required field/asset/link is present; no unsupported claim.
  **Verify:** compare against official live submission requirements and `RELEASE_CHECKLIST.md`.
  **Rollback/pivot:** omit a category rather than submit weak/ineligible claims.
  **Estimate:** 60 min

- [ ] **D7-05 — Independent submission preflight**
  **Why now:** Familiarity hides broken links and confusing copy.
  **Files/components:** store page, video, viewer, support/privacy, repository if applicable.
  **Implementation:** second browser/device reviews the whole submission as a judge; verify fictional data and public access.
  **Acceptance:** signed-off issue list is empty of blockers.
  **Verify:** complete checklist with timestamp/evidence.
  **Rollback/pivot:** fix submission materials only; feature freeze remains.
  **Estimate:** 30 min

**Planned work:** 270 minutes. **Protected contingency:** 90 minutes.

### End-of-day demo

Open the complete Devpost draft in a clean browser and play the final public video.

### Definition of Done

The project can be submitted immediately even if Day 8 becomes unavailable.

### Explicitly deferred

Everything not required for validity or a P0/P1 correction.

## Day 8 — Sunday 27 September: release verification, submit early, preserve buffer

### Top goal

Submit and independently verify without introducing last-minute risk.

- [ ] **D8-01 — Check App Review/public release and respond immediately**
  **Why now:** Public release is mandatory for the standard route and external state can change overnight.
  **Files/components:** App Store Connect, review communication, production build.
  **Implementation:** release approved build, or answer review questions/fix only the cited issue; update Devpost store URL.
  **Acceptance:** public store URL works, or a documented eligible Next Gen fallback is ready.
  **Verify:** open store URL signed out/on a second device and install where possible.
  **Rollback/pivot:** do not misrepresent TestFlight as a public release.
  **Estimate:** 45 min plus review-response time

- [ ] **D8-02 — Production smoke test from clean state**
  **Why now:** Staging success does not prove production credentials, provider, or URLs.
  **Files/components:** public build, production backend/provider/viewer/RevenueCat.
  **Implementation:** configure fictional profile, confirm contact, train phrase, lock, trigger, view, resolve, purchase/restore, delete.
  **Acceptance:** one clean production pass with exact build/store version.
  **Verify:** database/provider/RevenueCat dashboards and second-device page.
  **Rollback/pivot:** stop submission and fix only a release blocker.
  **Estimate:** 60 min

- [ ] **D8-03 — Submit Devpost and verify receipt**
  **Why now:** Early submission leaves several days of deadline buffer.
  **Files/components:** live Devpost project.
  **Implementation:** submit official form, opt into only eligible awards, then reopen public page and verify media/links/text.
  **Acceptance:** Devpost shows Submitted and public project page works.
  **Verify:** second browser/device plus submission receipt/status.
  **Rollback/pivot:** correct and resubmit before deadline if the platform permits; preserve screenshots of state.
  **Estimate:** 45 min

- [ ] **D8-04 — Archive reproducible release evidence**
  **Why now:** Judges, review, and future development need a stable artifact trail.
  **Files/components:** source tag once Git is ready, build/archive, migrations, test report, screenshots, video links, architecture docs.
  **Implementation:** capture versions/checksums, production config names without secrets, rollback notes, known limitations.
  **Acceptance:** another engineer can identify and rebuild the submitted version.
  **Verify:** follow README setup in a clean environment as far as credentials allow.
  **Rollback/pivot:** at minimum archive exact source snapshot and build number securely.
  **Estimate:** 45 min

- [ ] **D8-05 — Use remaining time only for monitored fixes and launch learning**
  **Why now:** The deadline buffer is an asset, not an invitation for new scope.
  **Files/components:** crash/provider logs, support inbox, real metrics, backlog.
  **Implementation:** monitor meaningful failures, respond to review, invite genuine testers, capture opt-in activation/latency/retention data, plan post-Shipaton work.
  **Acceptance:** no regression; any public metric has provenance.
  **Verify:** daily core smoke check through the deadline.
  **Rollback/pivot:** roll back or disable nonessential faulty behavior; never add a rushed feature.
  **Estimate:** 165 min available buffer

**Planned core work:** 195 minutes. **Protected review/fix buffer:** 165 minutes.

### End-of-day demo

Public store/repository path, production trigger, public Devpost page, and submission receipt.

### Definition of Done

SafeWord is submitted, independently verifiable, and has three calendar days of buffer for review/submission corrections.

### Explicitly deferred

The entire post-Shipaton backlog.

## Daily operating rhythm

1. **10 min:** read blocker log and choose one measurable day outcome.
2. **70 min:** highest-risk implementation.
3. **10 min:** founder checkpoint on actual device.
4. **70 min:** second dependency/vertical feature.
5. **40 min:** automated and physical regression.
6. **50 min:** product/release/submission work.
7. **20 min:** documentation, evidence, and issue triage.
8. **20 min:** full real-device demo and next-day scope correction.
9. **70 min protected contingency:** integration surprises, App Review/provider delays, or recovery. Unused contingency ends the day early or improves test evidence; it does not authorize new scope.

Stop after 50 minutes for a short break. “Six focused hours” should not mean six hours without food, water, or rest; fatigue is a release risk.

## Decision rules

- If an uncertain task has no working proof after 90 focused minutes, log it and take its predeclared pivot instead of silently consuming the day.
- If locked Vocal Shortcut execution fails by end Day 1, use Siri/Action button/manual fallback and change the promise.
- If SMS production readiness fails, use verified email and describe SMS as post-launch.
- If ten consecutive runs fail by mid Day 3, freeze UI and repair the core.
- If App Store candidate is not submitted by end Day 4, cut all optional polish and resolve release blockers.
- If users cannot configure without help on Day 5, simplify setup before adding animation.
- If App Review rejects background/emergency claims, narrow copy/behavior rather than arguing from intention.
- If standard public release will miss the event, use Next Gen only when truly eligible; otherwise report the blocker honestly.
- No feature may weaken idempotency, data isolation, delivery truth, or free safety access.

## Prize-worthy proof package

By submission, the repository and Devpost page should show:

- a real locked-device phrase trigger owned by iOS, not a simulated demo;
- a real second-device alert and secure viewer;
- a threat model explaining why police dispatch and hidden listening were rejected;
- 50 controlled phrase trials and 10 consecutive E2E runs;
- cross-user, token, idempotency, offline, and RevenueCat regression evidence;
- tester-driven onboarding changes;
- accessibility evidence;
- calm, distinctive interaction design;
- an ethical monetization boundary;
- an honest post-launch roadmap for licensed emergency-response integrations and global coverage.

That combination—not a claim that the app “deserves” a prize—is what gives judges evidence to reach that conclusion themselves.
