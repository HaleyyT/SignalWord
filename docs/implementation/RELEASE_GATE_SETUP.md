# Finish the public-release gates

Updated 28 September 2026. Development only; this is not public-launch approval.

## Current account status

- Development backend: `voepalyamwgenceawdvl.supabase.co`.
- Viewer: `https://www.signalword.app` (Vercel project `signalword-dev`).
- Turnstile public site key: `0x4AAAAAAFFb3ETKlwBxFCNF`.
- Apple membership: payment processing. iPhone 13 Pro: user reports iOS 26.7.
- Incident service: not yet configured.

The Turnstile site key is public. Its secret must never be committed or included in the app, webpage, screenshots or logs.

## 1. Activate protected onboarding

1. In Cloudflare Turnstile, open the widget and allow hostname `www.signalword.app`. Use a Managed widget. The challenge is served by this hostname, even when the app points to development Supabase.
2. Deploy the new viewer assets. Check `https://www.signalword.app/onboarding/verify.html` exists. Opening it in an ordinary browser intentionally shows an unsupported-context message: the page needs the native app bridge.
3. Configure the signed development app with these **public** build settings, alongside its existing Supabase URL, publishable key, API URL and App Group:

   ```text
   SIGNALWORD_VERIFICATION_URL = https://www.signalword.app/onboarding/verify.html
   SIGNALWORD_TURNSTILE_SITE_KEY = 0x4AAAAAAFFb3ETKlwBxFCNF
   ```

   Set both Debug and Release configurations when testing both. These values populate the corresponding generated Info.plist keys. There is deliberately no environment fallback baked into the app.
4. In the **development** Supabase dashboard, open Authentication → Bot and Abuse Protection. Choose Turnstile and enter the matching secret. An Edge Function secret alone does **not** configure Supabase Auth's signup endpoint.
5. Coordinate enforcement with installation of this app build. Enabling CAPTCHA blocks fresh signups from older clients that cannot supply a token. Do not reopen public enrollment to work around a failure.
6. On a fresh test installation, choose **Verify new account**, complete the widget, then complete contact setup. Existing stored sessions and refreshes should not show a new signup challenge.
7. Record: successful signup; cancellation; expired token and retry; offline challenge; invalid/missing/reused token rejection by Auth; app relaunch; existing-account alert sending. Use a consenting test recipient. Do not put challenge tokens or recipient links in evidence.

**Implementation:** an ephemeral WKWebView loads an isolated HTTPS page. Only a message from its trusted main frame may supply the bounded token. Supabase receives it as `gotrue_meta_security.captcha_token`. Ordinary recipient pages retain their restrictive content-security policy. The hosted challenge page permits Cloudflare's challenge resources separately.

**Limit:** mocked browser tests establish bridge and retry behavior, not acceptance by Cloudflare or Supabase. Real device success plus direct signup rejection must pass before this gate closes. Missing credentials on an already configured installation require support; a new anonymous identity cannot recover the old account.

References: [Supabase CAPTCHA configuration](https://supabase.com/docs/guides/auth/auth-captcha), [Cloudflare native WebView requirements](https://developers.cloudflare.com/turnstile/get-started/mobile-implementation/).

## 2. Configure independent operational alerts

The repository supports a Healthchecks.io heartbeat, including failure signals and missing-heartbeat detection. An account and a reachable notification destination are still required.

1. Create a Healthchecks.io check for **SignalWord development operational health**, with a five-minute period and a fifteen-minute grace period. GitHub scheduled workflows can be delayed; this is a coarse operational alarm, not proof of five-second delivery or service availability.
2. Connect an email/incident integration owned by the person responding to incidents. Confirm the destination receives the service's test notification.
3. In GitHub repository Actions settings, configure:

   | Kind | Name | Value |
   | --- | --- | --- |
   | Variable | `SIGNALWORD_BACKEND_ORIGIN` | `https://voepalyamwgenceawdvl.supabase.co` |
   | Secret | `SIGNALWORD_MONITOR_SERVICE_ROLE_KEY` | Development backend service credential |
   | Secret | `SIGNALWORD_MONITOR_HEARTBEAT_URL` | Private `https://hc-ping.com/<check-uuid>` URL |
   | Variable | `SIGNALWORD_MONITORING_ENABLED` | `true` after the preceding values are configured |

   The service credential is privileged: restrict repository write access, require MFA and reviewed workflow changes. Keep it out of Vercel and mobile configuration. A dedicated restricted monitoring credential is a future hardening improvement.
4. Run the **Operational health** workflow manually and confirm a heartbeat appears. The command must exit successfully and report `heartbeatRecorded: true` with no problems.
5. In an isolated test configuration, inject an unhealthy health response and confirm a failure notification reaches the operator. Also suspend heartbeat execution long enough to verify a missed-run notification. Restore monitoring and record recovery. Do not disrupt live alert processing to perform this drill.
6. Record the responder, escalation contact, acknowledgment procedure and incident log location in OPERATIONS.md.

The monitor checks queue age, unknown outcomes, leases, schedules, dispatch HTTP responses, and recent signup/invitation counts. Counts are warning signals, **not rate enforcement**; deletion can reduce them. Default thresholds are 100 signups and 200 invitations/hour and require tuning. The optional `SIGNALWORD_OPERATOR_WEBHOOK` accepts the existing redacted JSON notification contract. The heartbeat receives no diagnostic body, event IDs or user data.

Privacy-filtered mobile crash reporting, provider budget alarms and live notification drills remain open. Reference: [Healthchecks HTTP API](https://healthchecks.io/docs/http_api/).

## 3. Implement restore protection before public enrollment

This gate is **not implemented**. A deletion receipt in the same database cannot protect against restoring an older backup.

Required engineering sequence:

1. Provision an independently administered durable journal outside the restored database, with separate credentials, retention and backup policy. Decide who owns it and how the restore operator accesses it.
2. Journal account deletion and recipient withdrawal durably before reporting completion; make retries idempotent. Test journal outage and partial failure without exposing recipient identifiers.
3. Add a restore quarantine enforced by APIs and workers. A restored environment must not serve capability links or dispatch queued messages until explicitly reconciled.
4. Apply journal tombstones and invalidate affected access. Reconcile provider receipts and uncertain sends; do not blindly replay the restored outbox.
5. Release quarantine only after machine-checked reconciliation, then perform an isolated restore drill and measure RPO ≤15 minutes and RTO ≤60 minutes.

A manual checklist or database-only flag is insufficient evidence of this requirement. Keep public launch blocked until the implementation and drill pass.

## 4. Complete signed-device proof

1. Wait for Apple Developer membership activation; record Team ID and owned bundle/App Group identifiers.
2. Install a signed build with the development settings above on the iPhone. Launch from the Home Screen with the debugger detached.
3. Record the entire TEST → recipient acknowledgment → sender relaunch → resolution → deletion journey against the deployed backend.
4. Test locked TEST shortcut, reboot/first unlock, offline recovery before/after ten minutes, expired session, denied location and interrupted deletion. Confirm TEST never replaces pending REAL work.
5. Record device, OS, build, expected/actual result and redacted references. Simulator fixture tests are complementary evidence, not substitutes.

## 5. Release decision and progress

These estimates assess demonstrated readiness, not defect probabilities or a guarantee against attacks. Scores use the original behavior/recovery/verification/maintainability rubric; missing live evidence limits scores. Progress is a planning estimate, not a measured percentage of finished code.

| Area | Estimated progress | Provisional quality /100 | Main missing evidence |
| --- | ---: | ---: | --- |
| Product usefulness | 65% | 70 | Unfamiliar-user research, sustained pilot |
| Architecture/contracts | 80% | 78 | Complete endpoint specifications, restore design |
| Backend delivery | 85% | 82 | Outage/load drills, sustained live observation |
| Database integrity/privacy | 80% | 78 | Independent restore protection, key rotation drill |
| iOS lifecycle | 75% | 72 | Signed-device recovery and real CAPTCHA |
| Frontend/accessibility | 75% | 74 | Device accessibility and unfamiliar-user testing |
| Security/abuse prevention | 65% | 68 | Auth enforcement proof, budgets, external review |
| Automated/regression testing | 80% | 78 | Real provider/device fault scenarios |
| Operations/deployment | 50% | 50 | External alerts, crashes, restore drill |
| Scale/cost/growth | 30% | 40 | Load/cost evidence and adoption |
| Documentation | 85% | 82 | Record live configuration and drill outcomes |

Overall estimated public-release readiness: **about 72%**, using a rough unweighted average of the progress estimates. No area earns 97/100 yet. Of the four annotated gates, **0/4 are fully closed**: CAPTCHA and monitoring have implementations awaiting external verification; restore protection and signed-device evidence remain open. These are different measures and must not be conflated.

Also retain the original release requirements: Australian SMS before broad launch, 20–30-person/30-day pilot, 300 recorded device trials, measured availability/latency, no open P0/P1 defects and security findings, and load testing at twice the next stage's forecast peak. This pass does not waive them.

## Verification recorded for this change

- `npm run verify`: 102 Node tests, 43 viewer tests and production viewer build passed.
- Swift package: 18 tests passed. Simulator application journeys: 4/4 passed, zero runtime warnings in the result bundle. These use controlled service fixtures.
- Database integration: 194 assertions passed locally.
- Hosted development monitoring migration: applied after dry run; scheduled dispatch returned HTTP 200, with zero overdue requests and no timeout.
- Signup browser test: simulated provider verifies token bridge, retry and 320-pixel layout. It does not establish real CAPTCHA enforcement.
- Homepage browser tests: six viewport/theme combinations, keyboard entry, FAQ interaction, image loading, privacy navigation and no private API requests.

The homepage now gives product and recipient guidance instead of treating `/` as an unknown route. Unknown URLs still show the unavailable page. Its illustrative coastal photograph was generated for this page; it is not a customer photograph or testimonial. The page does not advertise public availability or guaranteed rescue/delivery.
- Homepage local Lighthouse: accessibility 100/100 and best practices 100/100 after correcting the missing favicon. These automated scores do not establish complete accessibility, usability, performance or public-launch readiness.
