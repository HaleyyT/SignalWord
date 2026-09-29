# Sol hosted gates: H11, H16 and H08 preparation

Owner: Sol branch `feat/hosted-provider-load-restore`  
Coordinated base: `987e1978952885e2760db564d74057e816f7f7c3`  
Environment: development only (`voepalyamwgenceawdvl`)  
Started: 2026-09-29T10:42:08Z

This is an owned parallel-branch handoff. It does not change the shared hosted environment, authorize a deployment, purchase backup capability, pass a hosted gate, freeze a candidate, or authorize installation. Astra remains the sole hosted coordinator and consolidates `engineer-progress.md` and the device guide.

## Hosted coordination state

At the safe boundary on 2026-09-29, Astra requested an exclusive H04 hosted window. Sol had no hosted operation in flight and immediately paused all sends, deletions, deployments, replay actions, Auth/schedule/authority changes and restore work. Local and read-only work may continue, but no Sol hosted mutation may resume until Astra explicitly hands the window back. A read-only Supabase billing inspection was stopped when browser control was unavailable during Astra's window; no quote, checkout or plan value was changed or submitted.

## Current gate results

| Gate | Result | Exact remaining dependency |
|---|---|---|
| H11 | BLOCKED on coordinated hosted evidence | Deploy reviewed compatible code if needed, then capture a genuinely fresh Resend dashboard replay around one current controlled TEST event. The replay must show a new provider attempt, signed endpoint 202, receipt deduplication, and unchanged delivery/attempt counts. Finish with zero unknown or queued work. |
| H16 | FAIL retained; local instrumentation prepared | The 2,020 ms duplicate p95 failure remains. Review and deploy development-only timing instrumentation, stage a genuinely consented tenth active sender if required, declare one retest, then capture 10 first submissions, 10 duplicates, 20 reads and every correlated provider acceptance before cleanup. |
| H08 | PREPARING, not PREPARATION READY | Obtain authenticated current quote and organization/project impact, verify provider-supported pre-start clone isolation, rehearse the exact isolated commands, and complete the purchase packet. Actual restore requires separate explicit purchase approval. |

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

`scripts/provider-replay-evidence.mjs` accepts a private, pseudonymous before/replay/after input and writes a new mode-0600 redacted report. It fails closed for malformed chronology, non-202 callback response, no new provider attempt, changed receipt/delivery/attempt counts, or changed terminal state. It never performs the replay.

## H16 instrumentation and evidence

The existing request path performs two sequential security checks before the alert RPC: Auth user validation and `assert_current_session`. These checks protect deleted/revoked-session behavior and were not removed or cached. The external safety authority is not a synchronous alert-acceptance hop; it gates dispatch separately.

The branch adds development-only `Server-Timing` for the phases actually in the synchronous v2 alert path:

- `auth_session`: existing Auth user plus current-session checks;
- `preparation`: capability generation and encryption;
- `database`: the alert create/reuse RPC;
- `app`: total edge-handler time.

The load recorder allowlists only these numeric durations and derives client/edge overhead as end-to-end duration minus edge-handler duration. Production does not emit this header. No request ID, account, event, recipient, capability, key, URL or response body is retained in timing samples.

`scripts/hosted-load-evidence.mjs` requires immutable 10/10/20 JSONL request sets plus private, pseudonymous provider evidence captured before cleanup. It preserves the unchanged p95 budgets, requires ten unique incidents and sender labels, unchanged delivery count across duplicates, one provider attempt and unique provider message per delivery, signed callbacks for every delivery, provider-acceptance p95 at most five seconds, and zero queued/unknown work. Failed runs remain failed and outputs use exclusive creation.

## Proposed coordinated H11 hosted window

This proposal is inactive until Astra explicitly acknowledges it.

- Owner: Sol executes; Astra holds the hosted lock and observes stop conditions.
- Gate: H11 only. No H16 traffic and no H08 maintenance during this window.
- Proposed start/end: 2026-09-29T12:00:00Z to 2026-09-29T12:30:00Z.
- Source: reviewed commit from this branch, to be filled after local verification and Astra review.
- Exact environment: Supabase development `voepalyamwgenceawdvl`, current Resend development integration, no production resources.
- Fixture: one current controlled TEST delivery, pseudonymous label only. Do not use withdrawn B or deleted sender 02.
- Actions: read pre-state; request one dashboard replay of the already-signed event; record the new provider attempt timestamp/status and endpoint result; read post-state; generate the redacted report.
- Expected message: replay of the existing TEST message only; no new alert, invitation, resolution or REAL message.
- Cleanup: no identity or incident deletion is needed for replay evidence; verify zero queued/unknown work and preserve the immutable report.
- Stop immediately for an unexpected identity/delivery, routing outside development, stale or mismatched receipt, non-202 endpoint result, monitor/authority failure, new unknown outcome, or any concurrent hosted owner activity. Preserve evidence before repair and requarantine through the supported control if a stop condition requires it.

## H08 preparation boundary

No purchase or managed restore is authorized. The checked-in clone reconciler remains clone-only: it rejects the source project, validates organization/name, requires inactive cron and an empty network queue, replays the covered journal twice, checks an exact receipt, revokes restored access, cancels unsafe historical work and never releases processing.

Before PREPARATION READY, the handoff still needs:

1. authenticated organization and source-project identity readback plus a current account-specific quote, including Pro scope, source/target compute, seven-day PITR, tax/overage and downgrade/removal billing;
2. provider confirmation that copied cron and Vault credentials can be isolated before any restored target executes;
3. exact source schedule inventory and disable/restore commands, target routing/Auth/function isolation, access-denial probes and independent lineage check;
4. a final source-safe precheck and controlled markers, with H11/H16 traffic excluded;
5. twelve `restore-drill-evidence.mjs` assertions, RPO at most 900 seconds and RTO at most 3600 seconds, where RTO ends only after safe usable-service validation;
6. one bounded approval packet. PREPARATION READY is not H08 PASS.

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
