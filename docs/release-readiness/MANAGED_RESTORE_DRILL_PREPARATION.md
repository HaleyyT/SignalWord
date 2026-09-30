# Managed development restore drill — execution preparation

Status: NOT ready to request purchase. Source is voepalyamwgenceawdvl only. No upgrade, clone or source quarantine is authorized by this document. The existing hosted recipient session must finish before source scheduling is paused. Never disable the independent journal or weaken restore-release.mjs origin pins.

## Read-only preparation readback — 2026-09-29

Authenticated organization/project inventory found exactly one project, `signalword-dev` (`voepalyamwgenceawdvl`) in `ap-southeast-2`, healthy on PostgreSQL 17.6.1.166. The organization is on Free, spend cap is enabled, there are no prior invoices or payment methods, and the authenticated upgrade panel shows Pro from USD 25/month with the first project included and additional projects from USD 10/month. `Confirm upgrade` remained disabled and no billing value was submitted.

Current official pricing requires at least Small compute for PITR. The published monthly-rate illustration for the bounded configuration is approximately USD 145 before tax/usage overages while both source and clone exist: Pro 25 + source Small 15 + clone Small 15 + seven-day PITR 100 - one organization compute credit 10. PITR and compute accrue hourly; disabling PITR stops future PITR hours, deleting the clone stops its future compute hours, and a Pro-to-Free downgrade is immediate with unused prepaid plan time returned as organization credit rather than a payment-method refund. Tax is calculated from the billing address. This is an engineering estimate, not the mandatory provider checkout quote; the restore screen's source/clone/disk total, tax and expected bounded-duration cost must still be captured immediately before approval.

Official provider behavior resolves the pre-start-isolation question but makes it a hard maintenance prerequisite. A binary restore copies the database and encryption root key, so Vault data remains readable; copied `pg_cron`, `pg_net`, webhook and wrapper work starts as soon as the target restore completes, and Supabase provides no way to exclude or pause it first. Therefore the selected recovery point itself must already contain inactive outbound jobs and an empty network queue. A manual logical restore can permit inspection first, but it does not automatically carry the encryption root key and is not a silent substitute for this managed H08 drill.

Sources:

- [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project)
- [Database backups and PITR](https://supabase.com/docs/guides/platform/backups)
- [PITR usage and pricing](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery)
- [Compute usage and pricing](https://supabase.com/docs/guides/platform/manage-your-usage/compute)
- [Subscription upgrades/downgrades](https://supabase.com/docs/guides/platform/manage-your-subscription)
- [Vault key portability](https://supabase.com/docs/guides/database/vault)

## Exact source schedule inventory and prepared controls

The read-only inventory returned exactly these five active jobs and no unexpected job:

| Job ID | Name | Schedule | Readback |
|---:|---|---|---|
| 4 | `signalword-check-in-expiry` | `* * * * *` | active |
| 5 | `signalword-check-in-retention` | `23 * * * *` | active |
| 2 | `signalword-delivery-lease-recovery` | `* * * * *` | active |
| 3 | `signalword-dispatch-sweep` | `* * * * *` | active |
| 1 | `signalword-hourly-retention` | `5 * * * *` | active |

The same transaction returned zero active events, active timers, pending network requests, queued deliveries and unknown outcomes. Re-read IDs/names/schedules/states immediately before maintenance; drift or any extra job blocks the drill. Do not export cron command text or Vault values.

After the coordinated source authority is quarantined, use the provider-supported function rather than updating `cron.job` directly:

```sql
select cron.alter_job(job_id := 1, active := false);
select cron.alter_job(job_id := 2, active := false);
select cron.alter_job(job_id := 3, active := false);
select cron.alter_job(job_id := 4, active := false);
select cron.alter_job(job_id := 5, active := false);
```

Before selecting the recovery point, require the exact five names to be inactive, zero extra jobs, an empty `net.http_request_queue`, and the normal zero active/queued/unknown safety state. After the target is proven isolated, restore only the source's captured intended states with the same calls using `active := true`; do not run those calls on the target. Any partial pause/restore is a stop condition. Supabase documents `cron.alter_job` as the supported edit operation: [pg_cron debugging guide](https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz).

## Before a purchase request

1. Finish and clean up the disposable hosted test identities through the application's durable deletion workflow. Preserve deletion receipts and redacted evidence. Confirm no active incident/timer, pending delivery, unresolved provider outcome or unclaimed network request exists.
2. Inventory all five schedules by name, schedule and active state; do not export cron command text or Vault values into evidence. Expected names: signalword-dispatch-sweep, signalword-hourly-retention, signalword-delivery-lease-recovery, signalword-check-in-expiry, signalword-check-in-retention. Unexpected jobs or outbound triggers/wrappers block the drill.
3. Record source region/compute, current authoritative journal coverage start/end and durable entry digest. Confirm the intended restore point is within verified coverage; 90-day journal retention is a separate requirement from seven-day PITR.
4. Prepare a separately pinned clone configuration and credentials handling procedure. The clone ID does not exist until Supabase creates it, so fill it from authenticated provider output after creation and verify organization/source lineage. Never reuse the source API service key or point clone routing at the public development alias. Never send source authority release requests as a shortcut to open the clone.
5. Capture the final provider checkout/restore quote including paid plan, minimum PITR-supported compute, seven-day PITR, mirrored clone compute/disk and taxes/overages. Do not purchase from the documented estimate. Confirm the exact bounded-duration amount and any disk attributes immediately before approval.
6. Rehearse the existing local restore and safeupdate regression before spending: `node scripts/test-restore-authority.mjs`, `node scripts/test-restore-safeupdate.mjs`. These are prerequisites, not managed-restore evidence.

## Approved execution order

1. Obtain approval for the exact source/clone quote and bounded test duration. Record expected ongoing costs separately from the short development drill.
2. Activate the approved backup configuration. Wait until the provider actually exposes an eligible recovery point; payment alone is not a backup.
3. Enter a controlled maintenance window. Quarantine the independent authority. Pause the five source schedules by exact known job IDs and verify no pending pg_net requests or outbound triggers can execute. Record the disabled state in the selected physical recovery point. Do not restore an older point whose schedules are active.
4. Create a timestamped acknowledged marker and controlled pre-deletion/pre-withdrawal records while scheduling remains disabled. Record their acknowledgements privately. Capture the chosen recoverable point, then perform durable deletion/withdrawal through the application after that point. The independent journal must retain these newer revocations.
5. Record outageStartedAt in UTC immediately before initiating the provider restore. Select the prepared point and Restore to a New Project. Supabase creates the target; do not restore over the source.
6. Record the exact target ID and region, retain the provider restore-operation reference and timestamps. Verify all five copied schedules remain disabled and no copied pg_net work ran. Auth settings and Edge Functions are not assumed to be copied. Keep public signup disabled and all provider delivery disabled on the clone.
7. Replay the independently retained journal into the clone through an explicitly reviewed, pinned clone-only verifier. Verify duplicate replay, matching database receipt, deleted-user denial, withdrawn capability denial, and cancelled historical outbox. Reconcile all provider IDs against outcomes; unknown outcomes keep quarantine closed. `scripts/restore-clone-reconcile.mjs` now implements the clone-only checks and passed unit and real local PostgreSQL rehearsal. Actual managed clone execution remains pending; local proof does not close H08.
8. Test isolated API/viewer routes and recovery readbacks with controlled identities. The public source alias must remain unchanged. Confirm zero clone provider sends. Record safeServiceReadyAt only when these checks pass, not when the database starts.
9. Produce the redacted measurement report with `node scripts/restore-drill-evidence.mjs PRIVATE_DRILL_RECORD NEW_REPORT`. It requires all twelve safety assertions and fails if RPO >900 seconds or RTO >3600 seconds. Retain failed and slow samples.
10. Restore only the source's recorded intended schedule states, reconcile the source authority using its existing guarded workflow, and verify health/recipient access rules. Keep the uncertain clone closed. Ask separately before deleting the paid target or changing ongoing backup protection.

## Cost and reliability distinction

A successful short drill proves recovery at that measured time. Turning PITR off afterward does not preserve a continuing 15-minute recovery point objective. Daily backups alone do not meet that objective. Keep PITR or an independently proven equivalent active before an invited pilot relies on it. No minimum-cost claim is final until the live quote and availability are checked.

Source: [Supabase restore-to-new-project documentation](https://supabase.com/docs/guides/platform/clone-project). Binary restore copies Vault's encryption root key and database data; external-operation extensions can start immediately. Source snapshot preparation therefore precedes the managed clone.

## Implemented clone rehearsal

Run `SIGNALWORD_LOCAL_WORKDIR=/private/tmp/signalword-safeupdate-fixture node scripts/test-restore-clone.mjs` against the dedicated empty local fixture. The harness temporarily pauses only that fixture’s schedules and restores their recorded states in finally cleanup.

The managed CLI accepts a private configuration path and a new evidence output path; inspect its required configuration before use. It verifies target identity from authenticated project inventory, rejects the source, and performs duplicate reconciliation without release. Supply the existing authority credential only through the local environment, never command text or committed configuration. The target must be an independently verified `signalword-dev-restore-*` project in the source organization. Do not request purchase until source checkpoint and live quote are ready.
