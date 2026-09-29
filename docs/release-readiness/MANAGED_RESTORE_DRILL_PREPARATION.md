# Managed development restore drill — execution preparation

Status: NOT ready to request purchase. Source is voepalyamwgenceawdvl only. No upgrade, clone or source quarantine is authorized by this document. The existing hosted recipient session must finish before source scheduling is paused. Never disable the independent journal or weaken restore-release.mjs origin pins.

## Before a purchase request

1. Finish and clean up the disposable hosted test identities through the application's durable deletion workflow. Preserve deletion receipts and redacted evidence. Confirm no active incident/timer, pending delivery, unresolved provider outcome or unclaimed network request exists.
2. Inventory all five schedules by name, schedule and active state; do not export cron command text or Vault values into evidence. Expected names: signalword-dispatch-sweep, signalword-hourly-retention, signalword-delivery-lease-recovery, signalword-check-in-expiry, signalword-check-in-retention. Unexpected jobs or outbound triggers/wrappers block the drill.
3. Record source region/compute, current authoritative journal coverage start/end and durable entry digest. Confirm the intended restore point is within verified coverage; 90-day journal retention is a separate requirement from seven-day PITR.
4. Prepare a separately pinned clone configuration and credentials handling procedure. The clone ID does not exist until Supabase creates it, so fill it from authenticated provider output after creation and verify organization/source lineage. Never reuse the source API service key or point clone routing at the public development alias. Never send source authority release requests as a shortcut to open the clone.
5. Prepare a current dashboard quote including paid plan, minimum PITR-supported compute, seven-day PITR, mirrored clone compute/disk and taxes/overages. Do not purchase from a historical estimate. Confirm how hourly PITR billing and downgrade dates affect the short drill cost.
6. Rehearse the existing local restore and safeupdate regression before spending: `node scripts/test-restore-authority.mjs`, `node scripts/test-restore-safeupdate.mjs`. These are prerequisites, not managed-restore evidence.

## Approved execution order

1. Obtain approval for the exact source/clone quote and bounded test duration. Record expected ongoing costs separately from the short development drill.
2. Activate the approved backup configuration. Wait until the provider actually exposes an eligible recovery point; payment alone is not a backup.
3. Enter a controlled maintenance window. Quarantine the independent authority. Pause the five source schedules by exact known job IDs and verify no pending pg_net requests or outbound triggers can execute. Record the disabled state in the selected physical recovery point. Do not restore an older point whose schedules are active.
4. Create a timestamped acknowledged marker and controlled pre-deletion/pre-withdrawal records while scheduling remains disabled. Record their acknowledgements privately. Capture the chosen recoverable point, then perform durable deletion/withdrawal through the application after that point. The independent journal must retain these newer revocations.
5. Record outageStartedAt in UTC immediately before initiating the provider restore. Select the prepared point and Restore to a New Project. Supabase creates the target; do not restore over the source.
6. Record the exact target ID and region, retain the provider restore-operation reference and timestamps. Verify all five copied schedules remain disabled and no copied pg_net work ran. Auth settings and Edge Functions are not assumed to be copied. Keep public signup disabled and all provider delivery disabled on the clone.
7. Replay the independently retained journal into the clone through an explicitly reviewed, pinned clone-only verifier. Verify duplicate replay, matching database receipt, deleted-user denial, withdrawn capability denial, and cancelled historical outbox. Reconcile all provider IDs against outcomes; unknown outcomes keep quarantine closed. This clone-only verifier is not yet implemented/verified, so this remains an engineering prerequisite before approval.
8. Test isolated API/viewer routes and recovery readbacks with controlled identities. The public source alias must remain unchanged. Confirm zero clone provider sends. Record safeServiceReadyAt only when these checks pass, not when the database starts.
9. Produce the redacted measurement report with `node scripts/restore-drill-evidence.mjs PRIVATE_DRILL_RECORD NEW_REPORT`. It requires all twelve safety assertions and fails if RPO >900 seconds or RTO >3600 seconds. Retain failed and slow samples.
10. Restore only the source's recorded intended schedule states, reconcile the source authority using its existing guarded workflow, and verify health/recipient access rules. Keep the uncertain clone closed. Ask separately before deleting the paid target or changing ongoing backup protection.

## Cost and reliability distinction

A successful short drill proves recovery at that measured time. Turning PITR off afterward does not preserve a continuing 15-minute recovery point objective. Daily backups alone do not meet that objective. Keep PITR or an independently proven equivalent active before an invited pilot relies on it. No minimum-cost claim is final until the live quote and availability are checked.

Source: [Supabase restore-to-new-project documentation](https://supabase.com/docs/guides/platform/clone-project). Binary restore copies Vault's encryption root key and database data; external-operation extensions can start immediately. Source snapshot preparation therefore precedes the managed clone.
