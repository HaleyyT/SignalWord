# Public website refinement

The submitted iOS candidate remains 1.0 (8). This change updates the public website and repository presentation while Apple reviews that candidate. It does not replace or rebuild the submitted binary.

Repository CI also exposed an Xcode 16.4 type-check timeout in the existing hold-confirm control. The repository source now separates its unchanged label, progress indicator and contents into smaller SwiftUI expressions. Alert actions, timing, confirmation, accessibility and styling remain the same. The existing unsigned simulator build passes locally; the source cleanup is for future builds and does not alter the already uploaded Build 8 archive.

## Design decision

Preserve the existing dark theme, lavender/mint brand, photograph, section order and example alert illustration. Refine this design rather than replace it. Design dials: variance 4/10, motion 3/10, density 4/10. The existing dark-only palette, secondary mint accent and clearly labelled illustrative overlay are intentional preservation decisions under the owner's brief.

Remove stale development/invitation-only copy, explain that safety features stay free and one optional purchase unlocks both themes, and describe the actual status as awaiting App Store review. Do not display an App Store download badge before public release. Product and security support now use the reachable support email instead of a private GitHub issue page.

Shorten the hero copy, remove the negative offset that overlapped navigation, improve text sizes/contrast, reduce excess section gaps and decorative glow, remove the looping waveform animation, and keep keyboard focus visible. Retain reduced-motion support and provide an opaque fallback for reduced transparency or missing backdrop-filter support. Add a valid robots file for public indexing; its exclusions are crawler guidance, not authorization controls.

## Verification and assessment

- Repository checks, 223 Node tests and 44 viewer tests passed. TypeScript and the production build passed.
- Production-bundle browser journeys passed at 320, 390, 768, 1024, 1440 and 1920 pixels under both light and dark browser preferences. The page intentionally retains its established dark palette. A follow-up also removed the shared 320px document minimum and passed fourteen cases including 305px, covering the usable width beside a desktop scrollbar. Overflow failures now report actual layout dimensions for diagnosis.
- Navigation, hash focus/reload, skip link, FAQ expansion, pricing explanation, support email and privacy navigation passed. No page errors or private API requests occurred.
- Text enlarged to 200% produced no horizontal overflow at 320, 390, 768 and 1440 pixels.
- Axe found no WCAG 2 A/AA or 2.1 AA violations on Home, Support and Privacy, including expanded homepage FAQs.
- Lighthouse mobile: performance 99, accessibility 100, best practices 100, SEO 100. Desktop: 100 in all four categories. Both runs measured zero layout shift and zero blocking time. These are local lab results, not field performance guarantees.
- Mobile and desktop screenshots were visually inspected. No new dependencies were added to the application; audit tools ran from a temporary directory.

Engineering review: **95/100 for this public-website refinement**, approved to publish. Rubric: content accuracy 25/25, responsive layout and visual hierarchy 24/25, accessibility and interaction 24/25, delivery/performance verification 22/25. Deductions reflect the remaining lack of Safari/device-specific browser verification and real-world field measurements. This scoped judgement does not promise Apple approval or close the separate hosted operational gates.

Machine-readable results: [web audit](../evidence/2026-10-01-website-refinement/web-audit.json).

## Owner preview

Open the public homepage on a phone and desktop. Check How it works and Why SignalWord, expand the pricing/download FAQs, and open Support and Privacy. Confirm that the old development banner is gone and that the site explains the free app and optional one-time theme purchase. After Apple releases the app, update the download FAQ and add only the verified public App Store link.
