# Pilot hardening — implementation evidence

Status: in progress. Local work only; no deployment, live delivery, or device acceptance.

## Backend trust boundary

Alert and timer creation now use service-only gateway routines. The Edge API authenticates the caller first, supplies that verified identity, and generates provider/capability fields. The wrappers establish transaction-local identity for the existing nested ownership checks. All original and legacy creation overloads deny anonymous and authenticated execution. HTTP v1/v2 shapes remain unchanged.

Database state-machine tests deliberately execute internal routines as the test database owner while preserving subject claims. A separate boundary suite exercises actual untrusted roles and denies both internal and gateway calls. Gateway tests assert server credentials for writes and caller credentials for reads. Existing account and destination invitation budgets are retained. Viewer polling is limited to 120 reads/minute/capability; acknowledgement has an independent 20/minute budget. Unknown tokens do not allocate counters. This does not replace hosted ingress protection against volumetric abuse.

Verified locally: 291 database assertions; repository verification (Node/API, viewer, build); five contact and three timer concurrency scenarios. These results do not establish hosted/provider/device acceptance. Full clean migration replay and final application acceptance remain to run.

Deployment must be coordinated: install the new gateway routines before deploying the API that calls them. The grant-revoking migration temporarily makes old backend processes unable to create alerts; use a controlled development maintenance window. Old mobile clients keep their HTTP contract. Do not roll back by restoring insecure grants; roll forward with a compatible backend.

## Current checkpoint — not release-ready

Engineering candidate: `547142c` on `feat/pilot-hardening`. Base: verified timer branch `2c5b42d`. No merge, push, deployment, purchase or live message occurred. SMS remains outside this branch. The crash-reporting commit is a **draft**, not a completed milestone.

### Commits

- `306fb23`: service-only delivery gateways, legacy access revocation, independent public-link budgets, strict profile/location inputs, gateway and database regressions.
- `9f39b29`: scoped health endpoint, rotating monitor credentials, scheduled Durable Object monitor, incident/recovery deduplication and fault tests.
- `0a435c3`: separate web-native monitor client from its Node CLI.
- `547142c`: opt-in Sentry integration, privacy-filtered event construction and serializer test; **not compiled or executed** because the official SDK artifact download did not complete.

### Fresh verification

| Check | Result | Limit |
|---|---|---|
| `npm run verify` | 117 Node/API tests; 44 viewer tests; contracts/security checks and viewer production build passed | Does not build the native SDK |
| Clean local migration replay + `npm run test:db` | 291 assertions across 14 suites passed | Empty local Docker database; not hosted |
| Contact concurrency script | 5 scenarios passed | Real local database locks; fake provider |
| Timer concurrency script | 3 scenarios passed | Real local database locks; no device |
| Seven Edge Function `deno check` targets | Passed | Includes new operational-health function |
| Viewer/signup/home browser suites | Passed using installed Chrome through `SIGNALWORD_CHROME_PATH` | Mocked network/provider; isolated browser profile |
| `npm audit --omit=dev --audit-level=high` | Zero vulnerabilities reported | Dependency advisory result, not a complete security audit |
| Swift tests + core verification before Sentry changes | 36 tests and core verification passed | Historical within this session; **not current-candidate native acceptance** |
| Current Swift/privacy tests, Release build, simulator UI journeys | **Blocked / not passed** | SDK dependency incomplete; do not reuse older results |
| Hosted/operator/signed-device/provider tests | Not run | Separate authorization and configured resources required |

Failures found: direct client execution could supply backend-only provider/payload fields; external monitoring used a broad database credential; the browser test expected a missing bundled Chromium. The first two were repaired and tested. Browser checks passed using installed Chrome. One new SQL regression initially had an invalid dollar delimiter; it was fixed and the full database suite rerun.

The SDK source and official binary package routes were inspected. Its public artifact is 75,447,092 bytes. A bounded direct request timed out after receiving 21,965,806 bytes; subsequent resumed/ranged requests did not establish a complete checksum-verified artifact. No partial archive was trusted. A minimal package now pins only the required official static artifact and SHA-256; compilation and the privacy regression remain mandatory. Download/build attempts started here were stopped rather than left running.

### Progress against the 30 implementation bullets

A completed bullet below means **local engineering evidence**, not hosted or physical acceptance. Partial work earns no completion credit.

| Milestone | Completed | Partial/open |
|---|---:|---|
| A: trust boundary (5 bullets) | 4/5 | Complete endpoint request/response/error schema coverage still needs a final inventory and shared-fixture audit |
| B: observability (6 bullets) | 3/6 | Webhook-lag/retention coverage inventory, native crash integration, telemetry-failure application acceptance |
| C: deletion and restore (7 bullets) | 0/7 | Independent durable journal, consent generations, resumable completion, quarantine, replay, coverage enforcement and restore drill not implemented |
| D: repeatable release (6 bullets) | 0/6 | Version manifest, deployment preflight, integrated local provider fault harness, complete failure matrix, CI concurrency/artifacts and rollback rehearsal |
| E: usability/recovery (6 bullets) | 0/6 | Workflow consolidation, state consistency, draft/recovery review, semantics review, accessibility acceptance and preservation review |

**Local implementation progress: 7/30 = 23%.** Existing local tests and prepared documentation are not counted as completing the remaining feature work. This is progress against this hardening plan, not total app development.

**Hosted development: 0/5 candidate gates** (compatible deployment, delivery/schedules, operational notices, restore rehearsal, hosted abuse/configuration checks).

**Physical acceptance: 0/20 guide cases** (C1–C8, T1–T7, D1–D2, O1–O3). None were performed in this session.

**Pilot readiness: 0/4 prerequisite groups** (completed local engineering, hosted acceptance, signed-device acceptance, pilot operating/enrollment readiness).

### Quality marks

No category is awarded 95/100. Correctness and recovery lack current native and full-system acceptance; security/privacy lack completed restore and telemetry verification; verification lacks the integrated fault/load suite; usability lacks this milestone's review and device evidence; operability lacks hosted incident and restore drills. Numerical quality marks would overstate the evidence while these critical gates remain open.

### Resume order

1. Complete the checksum-verified SDK download, run the serialized privacy regression, fix all native compile/test issues and run the Release simulator build and UI journeys. Keep crash reporting disabled until signed-device/provider privacy evidence exists.
2. Complete A's endpoint-contract inventory and B's missing health/failure cases before claiming either milestone complete.
3. Implement C next, then D, then E, preserving sequential verification. The external deletion journal must be independent of the restored database; do not substitute a local readiness flag or an unintegrated interface for that guarantee.
4. Re-run the complete candidate suite, record load assumptions and results, then update this guide and matrix. Obtain separate authorization for development deployment/managed-service activation and controlled live drills.

Do not merge or install this candidate for acceptance yet. The backend/monitoring commits are ready for code review; the crash integration is explicitly unverified. The physical guide is ready to read and prepare from, not permission to bypass its engineering prerequisites.

Checkpoint recorded: 2026-09-28T15:47:40+10:00
