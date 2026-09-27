# Step 2 engineering audit — 27 September 2026

Follow-up repairs and explanations: [Step 2 repair report](STEP2_REPAIR_REPORT.md).
The table below records the earlier audit; use the report for subsequent changes.

This is local implementation evidence, not a deployment or release sign-off. The
working tree also contained unrelated in-progress changes before this audit.

| Blocker | Current finding and change | Evidence | Status |
|---|---|---|---|
| Hosted viewer routing | Vercel had no `/v1/public/events/:token` rewrite. Added one to the existing function while preserving the public URL. | GET and POST rewrite/handler regressions pass; viewer browser regression passes with a stub API. | Local pass; hosted GET/POST still untested. |
| Ambiguous delivery recovery | Network, ambiguous HTTP, and malformed success responses could be retried. They now become `OUTCOME_UNKNOWN`; expired in-flight leases cannot be reclaimed and the recovery job quarantines them. | Adapter tests and pgTAP lease tests pass. | Blind resend blocked; provider-record reconciliation and live outage drill remain. |
| Interrupted deletion | A lost DELETE response invalidated the auth identity and left the app unable to prove deletion. A random client receipt is now committed atomically with deletion; an unauthenticated capability check settles the result. The legacy no-receipt RPC is revoked. | HTTP receipt tests, pgTAP deletion tests, and iOS simulator build pass. | Local pass; lost-response trial on a device and restore durability remain. |
| Consent, replacement, resend, withdrawal | Sender replacement existed, but resend could leave a stale invitation queued; recipient withdrawal was absent. Reissuing now cancels old queued invitations. The confirmed link offers an explicit withdrawal action that disables the contact, revokes viewer links, and invalidates unclaimed deliveries. Sender app exposes withdrawal and replace/resend. | HTTP, viewer, and pgTAP tests include repeated withdrawal and an in-flight completion race. | Local pass; real email/recipient device trial remains. In-flight provider sends cannot be retracted. |
| Full iOS journey tests | The repository has command-store XCTest and a core verification executable, but no XCUITest target covering setup, recovery, resolution, and deletion through the app. | Swift tests and simulator build pass; no full-app test exists. | Open. |
| API contracts | Fixture checks existed but client decoders did not consume them. Swift now decodes the shared creation examples; the viewer decodes the public-event example; the server parses the creation example. | Swift, Vitest, and Node tests pass. | Example coverage passes; complete endpoint schemas remain open. |
| Restore protection | Runbook warns to isolate restores and reconcile deleted identities and provider sends. There is no external tombstone journal or enforced restore release gate. | Repository inspection; no restore drill exists. | Open. |
| Deployment and monitoring | Local preflight and an operator-only aggregate delivery-health RPC exist. No deployed configuration validation, operator notification route, crash reporting, or hosted header check exists. | Repository inspection; no live environment connected. | Open. |

Local checks: `npm run verify` (74 Node and 43 viewer tests), `npm run test:db`
(162 pgTAP assertions), `swift test --package-path apps/ios` (6 tests),
`swift run --package-path apps/ios SignalWordCoreVerification`, the unsigned iOS
simulator build, and the viewer browser regression using installed Chrome passed.

Step 2 is **not complete**. Do not proceed to production deployment or pilot
enrollment while the open safety-critical items remain.
