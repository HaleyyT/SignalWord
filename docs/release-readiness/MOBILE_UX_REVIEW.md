# SignalWord mobile UX review — 30 September 2026

Status: integrated build 3 simulator acceptance passed; physical and commercial release acceptance remain open.

## Scope and baseline

This review covers the native iOS redesign, not hosted acceptance or public release authorization. Work started from `c5064f0` on `feat/hosted-restore-compatibility`. Existing release/submission progress changes were preserved. No backend contract, consent rule, authentication path, app identifier or App Group was changed. All new simulator journeys use the existing DEBUG-only offline service boundary; they do not send email.

## Original problems and causes

- Home divided a large title across a narrow horizontal row with decorative controls. Dynamic Type magnified the wrap and pushed the useful action down. The new header has a full-width vertical hierarchy.
- The previous navigation was a native TabView. Its floating glass treatment allowed scrolling content to sit visually behind the bar. Navigation now occupies a sibling row below the content NavigationStack; the page receives the remaining height. Backgrounds alone extend behind system safe areas. The existing small end spacing is breathing room, not an estimate of tab-bar height.
- Several decorative icons combined dynamic fonts with fixed small frames. They now use appropriately sized fixed decorative symbols while meaningful text remains Dynamic Type-aware. Long recipient names use a vertical layout at accessibility sizes.
- The hold gesture intercepted pans beginning on REAL/resolve controls. The replacement UIKit long-press recognizer permits simultaneous scroll recognition, including SwiftUI's private recognizers. Movement beyond 18 points cancels the hold; the stationary 1.5-second threshold and explicit review alternative remain.
- A missing launch-screen declaration was repaired and added to artifact verification. The physical screenshot's black bands were NOT conclusively attributed to this omission: the old app also filled the notched iOS 27 simulator. The user's iOS 26.7 viewport still requires an exact-device recheck.

## Screen and component changes

Home prioritizes current state, primary contact and labelled TEST. The compact “How SignalWord works” action opens a four-step sheet. REAL remains a distinct outlined hold action with review confirmation. Readiness and old alert details use disclosure; active alerts and running/failed check-ins remain explicit.

People gives the confirmed/pending contact a clear hierarchy, wraps long names, separates consent and delivery information, and preserves replacement/withdrawal semantics. The contact editor supports keyboard dismissal and cancellation without losing the existing person.

Settings groups Help, Signal, Privacy/location and Account. The shared guide explains saving a SignalWord action in Apple Shortcuts, connecting it through iOS Vocal Shortcuts, using different TEST/REAL phrases and rehearsing. Its setup switch is explicitly self-reported, not a claimed system integration check.

The guide preserves the important limits: optional point-in-time location, no continuous audio/location monitoring, no automatic danger inference, no emergency-service contact or delivery guarantee, and acknowledgement distinct from verified identity/help arriving. Location and check-in nuance are expandable.

Brand translation uses midnight/indigo surfaces, restrained lilac actions and semantic green/amber/red. Native typography, flexible cards, shared radii and spacing replace oversized dashboard-like copy. The app icon is unchanged. Primary dark text on violet is approximately 4.94:1; supporting text on the main surface is approximately 6.97:1 or greater.

## Walkthroughs

| User goal | Path | Remaining uncertainty |
|---|---|---|
| New user understands the product | Home → How SignalWord works (one tap) | Actual first-time comprehension needs human observation |
| Returning user checks readiness | Home heading/contact; expand readiness for detail | Voice setup is a report, correctly not a guarantee |
| Practice an alert | Home → Send TEST alert | Receipt depends on network/provider; simulator checks UI only |
| Send REAL deliberately | Stationary hold or Review → confirm | Device owner authentication where already required is preserved |
| Troubleshoot voice setup | Home guide or Settings → phrase instructions | OS Shortcuts/Vocal Shortcuts configuration remains a user action |

## Evidence and acceptance

Final matrix, screenshots, limitations and rubric will be filled after the final runs. The v6 reference run passed all 15 tests but exposed two runtime warnings. v7 removed those warnings; its compact run passed six of seven and retained a footer-reachability failure. These results are not represented as final acceptance. The final scroll helper measures overflow near tall labels. Subsequent hierarchy inspection identified the remaining compact failure precisely: the 24-swipe test cap stopped at 98% of a 7,594-point AX5 Settings page. The bounded cap was raised to 60; the full-footer visibility assertion remains unchanged. Serial execution avoids the unrequested orientation changes observed during concurrent simulator runs. Help/editor presentations explicitly inherit the current Dynamic Type size; decorative deletion/recent-activity icons cannot outgrow their slots. Earlier failed results remain in `evidence/mobile-ux-2026-09-30`; full xcresult locations are recorded there. No new physical installation, hosted gate closure or replacement release-manifest freeze is implied by this UI review.

## Integrated candidate result

Source `aa019ab` includes the native UX/Shortcuts repair (`6bf27f0`) and the existing optional RevenueCat supporter implementation. It builds as 1.0 (3). The exact development-signed artifact passed `verify-ios-installation.mjs` with expected team NM65T6PR46, unchanged bundle/App Group, and approved development configuration. It has not been installed on the physical device by this work. This is not an App Store distribution validation or an H17 freeze.

- Integrated reference iOS 27 simulator: 16/16 UI journeys, zero failures/skips/runtime warnings.
- Node/API: 213 tests; viewer: 44 tests passed. Repository/security/contract checks passed.
- Supporter package: 9 tests passed. These use local test doubles and do not prove a store transaction.
- Earlier UX matrix: large 7/7; compact 6/7 followed by the failed AX5 case passing with the corrected bounded scroll helper. Earlier failures are retained. The full integrated suite was run on the reference device; do not describe compact/large results as a full integrated build-3 matrix.
- Manual Apple Shortcuts search on the integrated simulator shows both Trigger Alert and Send TEST Alert, with the preserved purple icon. No alert was invoked during this discovery check.
- Physical iPhone 13 Pro/iOS 26.7 locked invocation, post-reboot behavior, original viewport complaint, real location snapshot and VoiceOver remain unverified.

### Acceptance judgement

The simulator UI meets the implemented layout assertions, but a whole-product 95/100 acceptance is withheld. A numerical score cannot replace missing locked-device, store purchase/restore or public-release operational evidence. The visual redesign can proceed to controlled physical evaluation; the product is not declared error-free or guaranteed App Store approval.

### Remaining integration and submission work

The authenticated RevenueCat SignalWord project exists (`e0c77650`), but its overview reports Test Store only. The App Store configuration requires an Apple in-app-purchase P8 key, key ID and issuer ID. No credential was generated, uploaded, or exposed. The current signed build does not prove a live/sandbox purchase. Product/offering/entitlement mapping, real sandbox purchase/restore, aggregate privacy review, reviewer access, final store metadata/screenshots/demo video and distribution validation remain required before submission.

Evidence: `evidence/mobile-ux-2026-09-30/integrated-build3-verification.json`, `integrated-build3-ui-summary.json`, `apple-shortcuts-discovery.png`. Full result bundle: `/private/tmp/signalword-integrated-reference.xcresult`.
