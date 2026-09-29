# Sol hosted gates: H11, H16 and H08 preparation

Owner: Sol branch `feat/hosted-provider-load-restore`  
Coordinated base: `987e1978952885e2760db564d74057e816f7f7c3`  
Environment: development only (`voepalyamwgenceawdvl`)  
Started: 2026-09-29T10:42:08Z

This is an owned parallel-branch handoff. It does not change the shared hosted environment, authorize a deployment, purchase backup capability, pass a hosted gate, freeze a candidate, or authorize installation. Astra remains the sole hosted coordinator and consolidates `engineer-progress.md` and the device guide.

## Hosted coordination state

At the safe boundary on 2026-09-29, Astra requested an exclusive H04 hosted window. Sol had no hosted operation in flight and immediately paused all hosted changes. Astra later explicitly handed back a bounded H11-only replay window for one current controlled TEST event. Sol performed exactly one dashboard replay request, made no new send, deployment, Auth/SMTP, schedule, authority, deletion, purchase or H16 traffic, and closed the window after the post-state readback. No further Sol hosted mutation is active. A read-only Supabase billing inspection was stopped when browser control was unavailable during Astra's earlier window; no quote, checkout or plan value was changed or submitted.

## Current gate results

| Gate | Result | Exact remaining dependency |
|---|---|---|
| H11 | BLOCKED on provider freshness evidence | The bounded replay request was acknowledged by the dashboard and storage remained unchanged and safe, but the refreshed provider detail exposed only the original event timestamp, HTTP 202 and the pre-existing attempt count. No new provider attempt identity/timestamp was available, so this is not a PASS. Provider/reviewer confirmation of fresh-attempt evidence remains required. |
| H16 | FAIL retained; local instrumentation prepared | The 2,020 ms duplicate p95 failure remains. Review and deploy development-only timing instrumentation, stage a genuinely consented tenth active sender if required, declare one retest, then capture 10 first submissions, 10 duplicates, 20 reads and every correlated provider acceptance before cleanup. |
| H08 | PREPARING, not PREPARATION READY | Authenticated plan/project and schedule inventory, official current rates, provider clone behavior, and the safe pause/restore procedure are documented. The final provider checkout/restore quote, target isolation/config probes, eligible paid recovery point and bounded approval packet remain. Actual restore requires separate explicit purchase approval. |

## H11 evidence-source matrix

Evidence types are deliberately not interchangeable.

| Scenario | Local fake/provider adapter | Signed synthetic callback | Hosted transactional SQL | Actual Resend | Remaining proof |
|---|---:|---:|---:|---:|---|
| Provider request accepted with stable idempotency key | PASS | n/a | PASS | Existing controlled deliveries | Fresh replay selected from current controlled TEST event |
| 408/429/502/503/504 and network/response loss | PASS: quarantined as `OUTCOME_UNKNOWN`, no blind retry | n/a | Unknown recovery passed | Not induced | No unrelated provider fault will be induced |
| Explicit terminal rejection and conflicting 409 | PASS | n/a | Terminal ordering passed | Not induced | Provider limitation is labelled, not relabelled as actual traffic |
| Valid signature and raw-body integrity | n/a | PASS | Receipt persistence passed | Existing signed callbacks | Fresh signed replay still required |
| Altered, stale, future or oversized callback | n/a | PASS | n/a | Not induced | Local signed fixture is the appropriate source |
| Missing correlation | n/a | PASS by provider-message fallback | PASS | Existing older callbacks may lack correlation | Fresh event should retain the hashed correlation tag |
| Duplicate callback | n/a | Handler accepts; storage dedup tested | PASS | Old dashboard screen is inconclusive | Fresh provider attempt plus unchanged receipt count |
| Delivered followed by late sent | n/a | Parser coverage | PASS | Not yet freshly replayed | Fresh replay must preserve terminal state |
| Worker lease/interruption | PASS for accepted response with lost lease | n/a | Live lease exclusion and expiry recovery covered | Not induced | Rerun affected database suite before integration |
| Withdrawal/resolution races | Local concurrency suites | n/a | Existing race coverage | Existing controlled deliveries | Recheck cleanup state after hosted window |

`scripts/provider-replay-evidence.mjs` accepts a private, pseudonymous before/replay/after input and writes a new mode-0600 redacted report. It requires both a fresh provider-attempt timestamp and a hashed provider-attempt identity; a replay-request toast or old event screen cannot satisfy freshness. It also fails closed for malformed chronology, non-202 callback response, changed receipt/delivery/attempt counts, or changed terminal state. It never performs the replay.

## H16 instrumentation and evidence

The existing request path performs two sequential security checks before the alert RPC: Auth user validation and `assert_current_session`. These checks protect deleted/revoked-session behavior and were not removed or cached. The external safety authority is not a synchronous alert-acceptance hop; it gates dispatch separately.

The branch adds development-only `Server-Timing` for the phases actually in the synchronous v2 alert path:

- `auth_session`: existing Auth user plus current-session checks;
- `preparation`: capability generation and encryption;
- `database`: the alert create/reuse RPC;
- `app`: total edge-handler time.

The load recorder allowlists only these numeric durations and derives client/edge overhead as end-to-end duration minus edge-handler duration. Production does not emit this header. No request ID, account, event, recipient, capability, key, URL or response body is retained in timing samples.

`scripts/hosted-load-evidence.mjs` requires immutable 10/10/20 JSONL request sets plus private, pseudonymous provider evidence captured before cleanup. It preserves the unchanged p95 budgets, requires ten unique incidents and sender labels, unchanged delivery count across duplicates, one provider attempt and unique provider message per delivery, signed callbacks for every delivery, provider-acceptance p95 at most five seconds, and zero queued/unknown work. Failed runs remain failed and outputs use exclusive creation.

## Completed coordinated H11 hosted window

- Owner/coordinator: Sol executed after Astra's explicit bounded handback; Astra retained shared hosted coordination.
- Gate and interval: H11 only, 2026-09-29T11:18:59.627070Z through 2026-09-29T11:23:20.653484Z. No H16 traffic or H08 maintenance occurred.
- Source: `cb3cf0829ac7c8873d3ef4f05209231f9f1c3020`.
- Exact environment: Supabase development `voepalyamwgenceawdvl` and its current Resend development integration; no production resource.
- Fixture: one current controlled TEST resolution event, retained only as a SHA-256 event digest in evidence. Withdrawn B and deleted sender 02 were not used.
- Action: one dashboard replay request. The dashboard acknowledged the request, but after refresh still exposed only the original event timestamp, HTTP 202 and `ATTEMPTS 2`; no fresh attempt identity/timestamp was available.
- Before and after: delivery/attempt/receipt counts stayed `1/1/2`; status stayed `delivered`; event state stayed `resolved`; queued deliveries, unknown outcomes, active incidents and active timers stayed zero. Authority remained allowed, journal version remained 16 and the health check reported no problems.
- Result: BLOCKED, not PASS. A request acknowledgement cannot be relabelled as a provider-observed fresh callback. The redacted retained record is `evidence/2026-09-29-sol-h11-replay-blocked.json`.
- Cleanup/window close: no identity or incident cleanup was needed, no additional replay is permitted under this window, and no hosted Sol operation remains in flight.

## H08 preparation boundary

No purchase or managed restore is authorized. The checked-in clone reconciler remains clone-only: it rejects the source project, validates organization/name, requires inactive cron and an empty network queue, replays the covered journal twice, checks an exact receipt, revokes restored access, cancels unsafe historical work and never releases processing.

Before PREPARATION READY, the handoff still needs:

1. the provider's final checkout/restore quote, including source/target compute and disk, seven-day PITR, tax/overage and bounded-duration total;
2. a paid eligible recovery point captured only after the five schedules are inactive and outbound work is empty; Supabase explicitly says a binary clone cannot pause or exclude copied external-operation jobs before they start;
3. target routing/Auth/function isolation, access-denial probes and independent lineage check; the exact source schedule inventory and supported disable/restore calls are now prepared in `MANAGED_RESTORE_DRILL_PREPARATION.md`;
4. a final source-safe precheck and controlled markers, with H11/H16 traffic excluded;
5. twelve `restore-drill-evidence.mjs` assertions, RPO at most 900 seconds and RTO at most 3600 seconds, where RTO ends only after safe usable-service validation;
6. one bounded approval packet. PREPARATION READY is not H08 PASS.

Read-only authenticated inventory on 2026-09-29 found exactly one project in the selected organization: development project `voepalyamwgenceawdvl`, region `ap-southeast-2`, healthy on PostgreSQL 17.6. No production project was selected or changed. The organization is Free with spend cap enabled, no invoices and no payment method; the authenticated panel showed Pro from USD 25/month but could not produce a final paid checkout/restore total. Official current rates imply about USD 145/month before tax/overages while source Small, clone Small and seven-day PITR all coexist, with compute/PITR billed hourly. This is not a checkout quote. No purchase or billing mutation occurred.

## Local verification commands

```bash
node --test tests/functions.test.mjs tests/provider-delivery.test.mjs \
  tests/acceptance-samples.test.mjs tests/hosted-load-envelope.test.mjs \
  tests/provider-replay-evidence.test.mjs tests/hosted-load-evidence.test.mjs \
  tests/restore-clone-reconcile.test.mjs tests/restore-drill-evidence.test.mjs
npm run check
npm test
```

The real isolated restore rehearsal uses the existing local fixture and must never point at the hosted source or a restored target without the approved maintenance handoff.

## Verification and retained interruptions

Verified against the branch working tree on 2026-09-29:

- focused H11/H16/H08 and user-API tests: 59 passed;
- `npm run check`: repository structure, contracts and security checks passed;
- `npm test`: 204 Node tests and 44 viewer tests passed;
- `npm run build`: viewer TypeScript and production Vite build passed;
- isolated real local PostgreSQL restore-authority rehearsal passed;
- isolated safe-update restore rehearsal passed all 17 assertions;
- isolated clone verifier rehearsal passed isolation, duplicate replay, receipt, revoked-access and inactive-schedule checks and never released processing.

The first full-suite attempt retained two environment interruptions: missing workspace dependencies, then sandbox denial for Vite cache creation in the external managed-worktree path. Locked dependencies were installed with zero audit findings, and the same suite/build passed after granting cache-write access. These were not product-test failures. The first Docker rehearsal attempt was denied access to the local Docker socket; the exact rehearsal passed after narrowly granting local Docker access. None of these actions contacted hosted SignalWord resources.
