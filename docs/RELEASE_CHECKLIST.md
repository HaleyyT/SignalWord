# SafeWord Release and Shipaton Checklist

## Deadline and path

- Standard path: first public store release between 1 August and 30 September 2026.
- Devpost closes 1 October 2026 at 06:45 UTC.
- Sprint target: submit as soon as the minimum credible build is ready, no later than Day 4, and have a complete Devpost package by Day 7.
- Next Gen fallback is valid only after confirming student eligibility, academic/student email, and public-repository requirements.

## Day-0 account/tooling gate

- [ ] Final public name selected; SafeWord/SignalWord/WordSignal inconsistency resolved.
- [ ] Name/domain/trademark collision check completed.
- [ ] Full Xcode installed, selected, licensed, and simulator runtime available.
- [ ] Physical iPhone connected and a signed blank app runs on it.
- [ ] Apple Developer Program membership active.
- [ ] App Store Connect role permits app/IAP creation and submission.
- [ ] Paid Apps Agreement, banking, and tax setup complete.
- [ ] Bundle identifier and App Store Connect app record created.
- [ ] RevenueCat project created and connected to App Store Connect.
- [ ] Supabase, hosting, domain/DNS, and alert-provider accounts ready.
- [ ] Alert sender/domain verified for the chosen delivery channel.
- [ ] Exactly one production delivery provider and one fake test adapter selected.
- [ ] Development/test and production environments configured; no extra sprint environment.
- [ ] Dedicated project repository ready before any Git operation. Do not use the parent `Projects` repository.

## Product gate

- [ ] Vocal Shortcut maps to `Trigger Alert` and passes locked-device tests.
- [ ] Force-quit and reboot behavior are documented.
- [ ] Two locked test alerts required during setup.
- [ ] Trusted contact confirmation/test flow works.
- [ ] TEST alerts cannot be mistaken for real alerts.
- [ ] One real alert creates one event and one delivery.
- [ ] Offline/location-denied/provider-failure states are honest.
- [ ] Viewer token expires/revokes and reveals one event only.
- [ ] Resolve status reaches the contact.
- [ ] Delete-data path works end to end.
- [ ] RevenueCat purchase and restore work; safety core works offline/free.
- [ ] No direct police-dispatch claim or unverified recipient.
- [ ] Every public claim is approved with evidence in `docs/CLAIMS_LEDGER.md`.

## App Review readiness

- [ ] App is a complete release, not labeled beta/demo.
- [ ] Privacy policy URL and support URL are public and stable.
- [ ] App privacy answers cover location, contact data, identifiers, purchases, diagnostics, and every third-party SDK.
- [ ] Microphone/Vocal Shortcuts explanation is accurate; the app does not claim it owns system listening.
- [ ] Location purpose strings and in-app consent explain collection/sharing.
- [ ] The message preview shows content, recipient, and sender identity.
- [ ] Review notes explain Vocal Shortcut setup and provide a fallback way to invoke the intent.
- [ ] Review notes state that trusted contacts—not police—receive alerts.
- [ ] Review notes include test contact/demo configuration without real personal data.
- [ ] Backend and viewer remain live during review.
- [ ] All URLs work without developer network/VPN.
- [ ] IAP is visible, functional, and submitted with the app.
- [ ] Subscription price, period, trial, terms, privacy, manage, and restore are visible.
- [ ] No placeholder copy, empty screens, dead controls, or debug menus.
- [ ] Age rating, category, export compliance, content rights, and encryption questions completed accurately.
- [ ] 1024×1024 icon and required App Store screenshots uploaded.
- [ ] Screenshots use fictional data.

## Build verification

- [ ] Release configuration builds from a clean checkout.
- [ ] iOS unit tests pass.
- [ ] Backend/RLS tests pass.
- [ ] Viewer unit/accessibility/E2E tests pass.
- [ ] Secret scan passes.
- [ ] Production migrations applied exactly once.
- [ ] Production environment contains no sandbox provider keys.
- [ ] Crash reporting symbol upload verified.
- [ ] Clean TestFlight install passes full E2E.
- [ ] Five consecutive demo rehearsals pass.
- [ ] Release tag/build/archive recorded.

## Shipaton required materials

- [ ] Text description of features/functionality.
- [ ] Public YouTube or Vimeo demo; essential footage ≤ 2 minutes.
- [ ] Public store URL for standard path.
- [ ] 1024×1024 uncropped app icon.
- [ ] At least one 1179×2556 screenshot without device frame.
- [ ] Free trial or promo-code/judge-access path for premium features.
- [ ] RevenueCat project ID.
- [ ] Peace Prize response.
- [ ] Design Award response.
- [ ] Build in Public response and public links.
- [ ] Grand Prize growth response only if real post-launch evidence exists.
- [ ] Next Gen repository/student email only if eligible.
- [ ] All facts, numbers, links, and recipient claims independently checked.

## Demo video shot list (90–115 seconds)

- [ ] 0–8s: locked phone and the problem statement.
- [ ] 8–20s: readiness screen showing phrase configured privately and contact confirmed.
- [ ] 20–40s: say phrase while phone remains locked; second phone receives real alert.
- [ ] 40–58s: open secure viewer; show timestamped location and status.
- [ ] 58–75s: show on-device/system phrase privacy and test mode.
- [ ] 75–90s: concise architecture and duplicate/offline reliability proof.
- [ ] 90–105s: RevenueCat Plus without paywalling safety.
- [ ] 105–115s: measured result and closing line.
- [ ] No copyrighted music, third-party private data, or unsupported claim.

## Final production smoke test

- [ ] Install the public/release build on a clean device.
- [ ] Configure a new profile/contact.
- [ ] Train the Vocal Shortcut using released action metadata.
- [ ] Lock device and trigger.
- [ ] Verify exactly one second-device message.
- [ ] Verify viewer from private browsing.
- [ ] Verify location freshness and resolved update.
- [ ] Verify purchase/restore/judge access.
- [ ] Verify privacy/support/delete-data links.
- [ ] Open the store URL outside the developer account.
- [ ] Open and review the Devpost submission from another browser/device.

## No-ship conditions

- Any known cross-user or public token data leak.
- Locked trigger does not work as described in store/submission copy.
- Duplicate invocations send multiple real messages.
- Contact/police delivery is shown as successful without provider evidence.
- Safety core depends on RevenueCat entitlement/network state.
- Privacy/support URLs or backend are unavailable.
- Release cannot be reproduced from source.
- P0/P1 issue remains open.
