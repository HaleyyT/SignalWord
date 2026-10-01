# Hosted development continuation — 29 September, late evening

Hosted acceptance: **12/17 (71%)**. H10 now passes. H04, H08, H11, H16 and H17 remain open. No frozen manifest or physical installation authorization.

## Completed and retained evidence

- H10: primary A delivered; B withdrew before dispatch and had zero attempts; A acknowledged but C still received delayed escalation. A/C acknowledgement state remained isolated. Sender resolution appeared on both active recipient views. B revoked GET and acknowledgement returned 404. A disposable sender's durable deletion completed, invalidated its session (401), and revoked its recipient link (404).
- H16: ten distinct senders produced ten incidents; ten duplicate requests returned the same incidents. Twelve initial deliveries completed in one attempt each with twelve signed delivered callbacks. All 20 concurrent recipient reads passed, p95 1,692 ms. Initial submission p95 1,151 ms. **Duplicate p95 2,020 ms exceeds the unchanged 2,000 ms budget.** All 40 request samples are retained in [redacted evidence](evidence/2026-09-29-evening-recipient-load.json). Full provider-acceptance latency correlation is incomplete; delivery timestamps are not acceptance timestamps. H16 is not passed.
- H11: four hosted transaction-only rollback checks passed for unknown-outcome recovery, duplicate receipt, late sent receipt and terminal failure ordering. These are database simulations, not signed provider fault injections. Fresh Resend replay was attempted but a new attempt was not conclusively evidenced; the original 202 panel is not new proof. H11 remains open.
- H08: clone-only reconciliation verifier implemented and locally exercised against real PostgreSQL. It rejects the source project, wrong organization/name, active schedules, pending network work, migration mismatch, stale journal, unsafe historical work and receipt mismatch. It never opens processing. Managed restore/RPO/RTO still requires the live quote, safe source checkpoint, approved purchase and actual isolated target.
- H04: unused proof expiry and closed-enrollment modes deployed to www.signalword.app, deployment `dpl_AsQ8nzgF45ah9WbfZr3dYWHvhCeT`. Six hosted routing/header checks passed; deployed harness assets match source. Human expiry result is pending. Existing invited password-login proof does not establish native anonymous enrollment compatibility.

## Local verification and failures

195 Node tests, 44 viewer tests, repository/security/contracts, viewer build and mocked browser journeys passed. Real local restore, 17 safe-update assertions, API/database/viewer integration and clone reconciliation passed using the isolated local fixture. No new native or physical-device acceptance is claimed.

Retained failures: default local database was nonempty/stale; it was not reset. Fixture migration staging initially lacked a directory. Initial clone rehearsal correctly refused five active local jobs; the test harness now pauses and restores only its local fixture jobs. Original logs remain under `/private/tmp/signalword-evening-*`, including failed runs. The hosted 2,020 ms sample remains a failure, not rounded into a pass.

Commands: `npm test`; repository check and viewer build/test commands from package scripts; `SIGNALWORD_LOCAL_WORKDIR=/private/tmp/signalword-safeupdate-fixture node scripts/test-restore-authority.mjs`; same prefix with `scripts/test-restore-safeupdate.mjs`, `scripts/test-restore-clone.mjs` and the integration runner. Detailed logs retain actual tool output; this summary does not claim a fresh full Swift regression.

## Safe ending state and next work

Nine controlled identities remain, zero unexpected users, zero active incidents/timers, zero queued alert deliveries, zero unknown alert outcomes, five active development schedules. Authority allowed with journal version 16 and no health problems at readback. Original B is intentionally withdrawn; load sender 02 is deleted. Do not reuse that deleted identity or assume all original contacts remain confirmed.

Save the human expired-proof result, then reload and run Public enrollment remains closed. Preserve fixture contents privately. Complete actual invited/mobile onboarding compatibility before closing H04. Finish provider fault/replay evidence and investigate/retest the load miss without weakening its budget. H08 purchase is not yet requested. H17 and exact signed-artifact reverification follow all hosted passes. Sentry stays disabled pending remaining symbolication/retention/subscription and device checks.

## 20:04 human expiry result and independent recheck

User screenshot confirms unused-token expiry: 310002.4 ms elapsed, HTTP 400, accepted false, captcha_failed, passed true. The [transcribed screenshot evidence](evidence/2026-09-29-human-turnstile-expiry-screenshot.json) is explicitly distinguished from the original downloaded JSON. Closed-enrollment human result remains pending.

Onboarding code inspection confirms `SupabaseSessionManager.signInAnonymously` posts to `/auth/v1/signup`; there is no invited-session bootstrap in that manager. With global signup disabled, password-login harness success cannot establish a working fresh-device onboarding journey. H04 must remain open until a reviewed invitation-only onboarding path is implemented and verified, without enabling public enrollment. This is an engineering blocker, not a reason to repeat the same human test.

Fresh verification: 195 Node and 44 viewer tests, repository/security/contracts, real local clone rehearsal and mocked browser harness all passed. [Log digests](evidence/2026-09-29-2004-local-recheck.json). These do not close H11, H16 or managed H08. Hosted remains 12/17. No paid operation, new hosted send, installation or manifest freeze performed.

## Saved human result accepted — 20:17 UTC+10

Original downloaded closed-enrollment JSON verified and retained: HTTP 422, signupDisabled true, passed true, recorded 2026-09-29T10:17:43.547Z. The other submitted file is the prior login/reuse result, not the expiry download; expiry screenshot evidence remains retained. No additional human CAPTCHA repetition is required for these component checks. H04 remains open for native invitation-only onboarding compatibility.

H08 verifier repair: null, false, empty or missing count values now fail closed rather than coercing to zero. Nine focused clone/measurement tests pass, including the new regression. Managed purchase is still unauthorized. The isolated clone verifier exists and was locally rehearsed; older pasted instructions saying it is absent are stale. Actual managed target/source-safe checkpoint and live provider drill remain pending.

H10 remains passed; original B withdrawal and disposable sender deletion remain intentional. H11 signed provider fault/replay proof and H16 complete passing envelope still require engineering work. No new hosted gate is declared passed by this update.
