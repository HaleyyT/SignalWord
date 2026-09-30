# Build 5 verification evidence

Candidate source: 1550d09. Version 1.0 (5). Signed archive and normal App Store distribution export passed.

Release preflight, 218 Node tests, 44 viewer tests, 325 database assertions, 47 core Swift tests, one crash-reporting test, nine Supporter tests and 22 simulator UI tests passed. Simulator runtime warnings and skipped tests: zero.

The screenshots are actual simulator captures with deterministic test services and synthetic contacts. The Supporter screenshot demonstrates UI behavior only; it is not an Apple sandbox transaction receipt or an App Review IAP screenshot. Captures were visually inspected for Home, account controls, contact editing, accessibility text, TEST resolution and Supporter appearance.

Backend migration 20261001050000 was deployed and its recorded SQL MD5 matched the repository file: 8220094d75e0ec02e4f89d08bc902484. Authenticated execute remains enabled, anonymous execute denied. Live reviewer diagnosis found an existing confirmed auth identity with no profile and zero contacts. After deployment the owner retried invitation, received it in a controlled mailbox, confirmed consent, and reported People showing Email confirmed. No credentials or recipient links are retained here.

One initial full UI run had 21 passes and one XCTest query-length exception in the new sign-out test. The locator was corrected; both sign-out tests and then the entire 22-test suite passed. One sandboxed preflight could not access Docker/build outputs; the final run with the isolated local fixture passed every gate.

Password/CAPTCHA login on the installed replacement, real sandbox purchase/restore, independent reviewer mailbox access and remaining hosted/public-release gates are not certified by these tests. Upload status is recorded in BUILD5_TESTFLIGHT_HANDOFF.md.
