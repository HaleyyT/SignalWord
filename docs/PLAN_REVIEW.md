# SafeWord / SignalWord Plan Review

**Reviewed:** 20 September 2026  
**Build window assumed:** 20–27 September 2026  
**Official submission deadline:** 1 October 2026, 06:45 UTC  
**Verdict:** Strong concept and strong safety instincts; not yet executable as written without scope and release corrections.

## Final engineering assessment after hardening

**Final mark: 93/100.**

| Area | Mark |
|---|---:|
| Product concept and differentiation | 9.5/10 |
| Safety, privacy, and ethical boundaries | 9.5/10 |
| Architecture and data flow | 9/10 |
| Backend/security design | 9/10 |
| Testing and regression strategy | 9.5/10 |
| UX and judging narrative | 9/10 |
| Scope realism for eight days | 9/10 |
| Dependency and failure management | 9/10 |
| Release strategy | 9.5/10 |
| **Overall** | **93/100** |

The score is not higher because the defining locked-device path remains an empirical platform risk until it passes on the physical release device, and App Store/provider review are external queues the team cannot control. The plan now contains explicit pivots for both rather than assuming they will work.

The hardening changes that raised the plan from 87 to 93 are:

- Day 0 prerequisites outside the eight-day implementation clock;
- 60–90 minutes of protected contingency every day;
- a strict 90-minute pivot rule for uncertain work;
- a narrower Day-1 order: locked intent, authenticated event, message/viewer, then location;
- one production provider plus a fake test adapter;
- development/test and production environments only;
- API/schema/state freeze at the end of Day 2;
- an explicit locked-trigger capability matrix;
- honest offline semantics rather than guaranteed background retry;
- submission as soon as credible, with Day 4 as the latest target;
- a public claims ledger tied to evidence;
- the Readiness Check as the only approved extra feature.

## Executive verdict

The original brief is better than most hackathon plans. It has a memorable interaction, a credible social-good narrative, a privacy-first stance, a real end-to-end proof, and good instincts around idempotency, stale location, explicit state, regression testing, and honest claims.

Its weakness is not product thinking. Its weakness is that it budgets roughly 48 founder-hours for an iOS app, speech/audio lifecycle work, a backend, transactional messaging, a public live viewer, purchases, App Store release, security hardening, accessibility, testing, design, user research, and a submission campaign. That is too much unless V1 is made much smaller and store/review work starts earlier.

The revised plan optimizes for a submission that is narrow, real, beautiful, and repeatable. It does not promise a prize. It produces credible evidence that the app is worthy of top-prize consideration.

## What is already excellent

- The trigger is user-authorized, not an opaque danger classifier.
- Always-listening phrase recognition is delegated to Apple’s opt-in, on-device Vocal Shortcuts rather than an app-owned recorder.
- Ordinary audio is not stored or uploaded by default.
- Safety essentials remain free even when RevenueCat is unavailable.
- The contact experience works without installing the app.
- Location freshness is explicit instead of falsely labeled “live.”
- Alert creation is idempotent and duplicate-resistant.
- The brief prioritizes a real-device vertical slice before visual polish.
- The demo can be understood in seconds and proved in under two minutes.
- The positioning avoids pretending to replace emergency services.

## Critical findings and fixes

| Severity | Finding | Required correction |
|---|---|---|
| Blocker | Full Xcode is not installed/configured on this Mac. | Install Xcode, select its developer directory, accept the license, install a simulator runtime, and verify physical-device signing before implementation. |
| Blocker | Git currently resolves to `/Users/haleytran/Desktop/Projects`, not this project folder. | Initialize a dedicated repository inside `SignalWord` before any `git add` or commit. Never stage from the parent repository. |
| Blocker | Three product names appear: SafeWord, SignalWord, and WordSignal. | Freeze the public name, bundle ID, repository name, support domain, and visual identity in the first 30 minutes. Keep `SafeWord` as a working name until the founder decides. |
| P0 | Day 5 is too late for the first store candidate. | Produce a submission-quality core build and submit to App Review by Day 4. Days 5–8 are for review fixes, hardening, evidence, and Devpost. |
| P0 | The clarified requirement is locked-screen custom-phrase activation, which app-owned background speech cannot safely guarantee. | Make Apple Vocal Shortcuts + a SafeWord App Intent the primary architecture. Prove locked-device execution, network access, and location behavior on Day 1. Do not ship a hidden continuous microphone service. |
| P0 | Automated SMS can be blocked by sender verification, geography, anti-spam rules, and vendor review. | Use an alert-provider adapter. Prove one production-capable route on Day 1. Keep verified email as the reliable fallback; SMS ships only if the sender path is genuinely ready. |
| P0 | “Live location” could imply continuous background tracking. | Define it as timestamped updates while the app can obtain them; display `Live`, `Last updated …`, or `Location unavailable` from server timestamps. |
| P1 | The trusted contact can be entered without explicit readiness/consent. | Add a test/consent link. Home cannot show “Ready” until the contact confirms or the user completes a clearly labeled demo-only bypass. |
| P1 | The proposed data model is wider than V1 needs. | Use six primary tables: profiles, trusted contacts, alert events, location samples, alert deliveries, and viewer tokens. Do not build history dashboards or multiple circles. |
| P1 | The plan postpones too much submission work. | Draft icon, privacy/support pages, App Store metadata, review notes, and the Devpost narrative in parallel from Day 2. |
| P1 | The monetization strategy is underspecified. | Ship one `plus` entitlement for non-safety customization/history with a judge-access path. The alert path never calls or waits for RevenueCat. |
| P1 | “Global product” can create misleading coverage claims. | Launch with explicit tested regions/languages and provider coverage. “Built to expand globally” is acceptable; “works worldwide” is not until measured. |

## Official event alignment

The official event record confirms:

- standard entries require a brand-new iOS/iPadOS/macOS/Android app whose first public release is during 1 August–30 September 2026;
- the RevenueCat SDK must power at least one in-app or web purchase;
- the demo video must use YouTube or Vimeo and judges are not required to watch beyond two minutes;
- the submission needs a published store URL, 1024×1024 icon, at least one 1179×2556 frameless screenshot, judge premium access, and a RevenueCat project ID;
- Next Gen is student-only and uses a public repository plus academic/student email instead of a store listing;
- Grand Prize is traction/growth-led, so eight days of polish alone cannot make it the primary strategy.

Source: [RevenueCat Shipaton 2026 on Devpost](https://revenuecat-shipaton-2026.devpost.com/).

## Platform facts that change the plan

- Apple requires a clear visual and/or audible indication when the microphone records user activity. The active Guardian UI must therefore be discreet but not hidden or deceptive.
- Background services must be used only for their intended purposes. Background audio/location cannot be added merely as a keep-alive mechanism.
- On-device speech recognition must be feature-detected; `requiresOnDeviceRecognition` is only honored when the recognizer reports support.
- Apple says location APIs should not be represented as providing emergency services. Position SafeWord as a user-controlled personal safety alert to trusted contacts, not emergency dispatch.
- App privacy responses must include the practices of every third-party SDK and service.
- Restorable purchases need an explicit user-initiated restore path.

Primary references:

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple Support: Use Vocal Shortcuts on iPhone](https://support.apple.com/guide/iphone/use-vocal-shortcuts-iph7f242ea2c/ios)
- [Apple App Intent authentication policy](https://developer.apple.com/documentation/appintents/appintent/authenticationpolicy)
- [Apple App Shortcuts](https://developer.apple.com/documentation/appintents/app-shortcuts)
- [Apple Speech framework](https://developer.apple.com/documentation/speech/)
- [Apple on-device speech capability](https://developer.apple.com/documentation/Speech/SFSpeechRecognizer/supportsOnDeviceRecognition)
- [Apple background location guidance](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background)
- [Apple app privacy guidance](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [RevenueCat iOS installation](https://www.revenuecat.com/docs/getting-started/installation/ios)
- [RevenueCat restore purchases](https://www.revenuecat.com/docs/getting-started/restoring-purchases)

## Clarified trigger architecture

The product should behave as follows:

```text
User says “cat rainbow” while iPhone is locked
  → iOS Vocal Shortcuts recognizes the trained utterance on device
  → iOS invokes SafeWord’s Trigger Alert App Intent
  → intent creates one idempotent backend event
  → last-known/current location is attached when available
  → confirmed trusted contact receives a secure link
  → viewer shows status and timestamped location
```

This is better than the original app-owned recognizer for V1:

- the operating system owns the always-listening microphone lifecycle;
- the user trains a custom word or sound and Apple says processing is on-device;
- App Intents can intentionally run without authentication while locked;
- SafeWord never needs the raw phrase, a transcript, or a voice recording;
- the same action can also be offered through Siri, the Action button, Back Tap, and Shortcuts as fallbacks.

It has important limitations:

- iOS requires the user to configure Vocal Shortcuts in Accessibility settings;
- SafeWord cannot silently configure or read the chosen custom phrase;
- phrase recognition is not biometric speaker verification and must not be marketed as proving who spoke;
- locked-screen location/network execution must be demonstrated on the target device and OS;
- the system shows a microphone-use indicator while Vocal Shortcuts listens;
- devices or locales without Vocal Shortcuts need a manual/Siri fallback, not an invented equivalent.

## Revised V1 contract

### Must ship

1. A short trust-first onboarding.
2. One iOS Vocal Shortcut mapped to SafeWord’s `Trigger Alert` App Intent, with guided training and a real test.
3. One confirmed trusted contact.
4. A readiness check covering speech, microphone, location, contact, backend, and network state.
5. Locked-device trigger support through the system-owned vocal shortcut; Guardian Session becomes an optional enhancement/fallback.
6. Intent invocation validation, cooldown, and duplicate suppression.
7. One idempotent alert event with an offline outbox.
8. Current location when available, with server-derived freshness.
9. One real delivery path and one secure, expiring contact URL.
10. A mobile-first contact page that polls for updates and clearly shows resolution/staleness.
11. A deliberate resolve flow that updates the contact; resolving never erases the fact that an alert occurred.
12. A clearly labeled test-alert mode.
13. One RevenueCat `plus` entitlement, purchase, restore, loading, and error states.
14. Delete-my-data, privacy/support pages, and honest limitations.

### Explicitly deferred

- multiple contacts/circles;
- app-owned background listening or unsupported lock-screen guarantees;
- Android, Apple Watch, widgets, and Live Activities;
- multilingual recognition;
- continuous audio recording or post-trigger recording;
- AI danger classification;
- scheduled check-ins and trip monitoring;
- advanced analytics dashboards;
- automatic police/emergency-service dispatch without an authorized regional partner;
- global coverage claims.

## The five highest-risk blockers

1. **Toolchain/signing:** no full Xcode, no confirmed signing or App Store Connect readiness.
2. **System-trigger feasibility:** Vocal Shortcut discovery, locked-device App Intent execution, credential access, network request, and location acquisition.
3. **Contact delivery:** production-capable message sender, recipient consent, latency, and fallback.
4. **App Review timing:** a safety/location/microphone app plus IAP may need clarification or changes.
5. **Scope pressure:** the temptation to build background mode, multiple contacts, rich history, and growth features before the core loop is stable.

## Award strategy

Primary targets:

1. **Peace Prize:** social benefit, consent, privacy, free safety core, measured reliability, and honest limitations.
2. **Design Award:** calm native experience, exceptional readiness/setup flow, discreet active state, excellent contact viewer, accessibility, and precise motion/haptics.
3. **Build in Public:** daily evidence of hard decisions, tests, rejected ideas, tester feedback, and reliability improvements.

Conditional targets:

- **Next Gen:** only if the founder meets the official student requirement and can publish the repository.
- **Grand Prize:** only if a public store release happens early enough to collect genuine acquisition, activation, retention, and revenue evidence. Never manufacture traction.

## The winning differentiator

The extra functionality worth adding is not another large feature. It is a **Readiness Check** that makes trust visible:

- locked Vocal Shortcut test succeeded twice;
- trusted contact confirmed;
- microphone and speech recognition available;
- location state understood;
- test alert delivered;
- backend reachable;
- limitations explained before marking the product ready.

That feature improves safety, onboarding, demo clarity, App Review comprehension, and visual design at the same time. It is a better use of the sprint than multiple contacts or advanced AI.

## Go/no-go rule

By the end of Day 1, a physical locked iPhone must invoke the SafeWord App Intent from the trained phrase, create a real backend alert, and let the second device open the secure event page. If that is not true, the team stops feature work and chooses one of these pivots:

1. “Siri, trigger SafeWord” App Shortcut + verified email;
2. Action button/Back Tap/manual trigger while clearly documenting the custom-phrase limitation;
3. Next Gen video/repository route if App Store prerequisites cannot be completed in time.

No design polish or stretch feature is allowed to hide a failed vertical slice.
