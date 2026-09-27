# Controlled email-pilot operations

This is an execution runbook, not evidence that production has been deployed.
Production remains blocked until the project/domain/signing identifiers and live
provider configuration are supplied and verified.

## Deploy in order

1. Verify the target project reference and environment. Never reset a deployed DB.
2. Run npm ci, npm run verify, swift test --package-path apps/ios, the simulator
   build and npm run test:db against an isolated local database.
3. Apply committed additive migrations to development/test with `supabase db push`
   only after explicitly linking the intended development/test project. Run RLS,
   callback, recovery, deletion and capability tests there.
4. Configure Resend, its verified sender and signed webhook; set the encrypted
   destination/payload/fingerprint keys and version numbers through secret storage.
   Configure DISPATCH_SECRET independently from the Supabase service key.
5. In each project's Vault, provision signalword_backend_url and
   signalword_dispatch_secret. The scheduled worker uses only these entries.
   Missing values intentionally do nothing: the readiness check must inspect them.
6. Deploy user-api, public-event, contact-confirm, dispatch-deliveries,
   resend-webhook and deletion-status. Verify JWT settings match committed
   supabase/config.toml and test lost-response deletion receipt recovery.
7. Deploy the viewer with SIGNALWORD_PUBLIC_EVENT_ORIGIN and the existing
   confirmation origin. Verify actual HTTPS response headers and token-path log
   redaction on both hosting layers; a meta tag is not sufficient.
8. Confirm cron execution and a TEST event progressing through provider acceptance,
   delivered callback, second-device acknowledgement and resolution. Verify the
   lookup by the original command key before enabling the new mobile build.
9. Promote the same migration/function/viewer versions to the explicitly verified
   production project. Distribute a signed build only to invited testers.

Do not commit secret files or capture full provider/API payloads in evidence.
Evidence includes build/commit, environment, timestamp, device/OS, pass/fail and
redacted request IDs. Public capabilities, destinations and exact location are
excluded.

## Operational signals and response

- Monitor accepted-event latency, provider acceptance latency, oldest queued job,
  pending/failing delivery counts, unknown outcomes, webhook lag, cron last success,
  location-retention job last success, API availability and mobile crash rate.
- Page the operator for sustained queue age >60 seconds, repeated synthetic TEST
  failures, stopped schedules, or missing webhook activity when sends are active.
- A health probe must not create REAL alerts. Dedicated TEST recipients must consent.
- Pause new enrollment during incidents; preserve the existing alert and recovery
  paths whenever safe. Do not silently turn a configured provider into a fake.
- Retry unknown outcomes only using the original provider key within its supported
  deduplication period. Reconcile receipts/provider records first. Do not mint a
  fresh key just to clear a backlog.
- After an outage, check both send and callback paths. An HTTP 200 from dispatch is
  not evidence of inbox delivery or human acknowledgement.

## Rollback and restore

Roll back function/viewer/mobile versions while retaining additive schema. Do not
reverse already-observed event or delivery transitions. Keep old-version smoke
coverage before promotion. Disable a broken new feature at enrollment/UI level
rather than deleting accepted outbox work.

Restore testing must use an isolated project. Reconcile provider messages before
releasing restored queued work; backups can otherwise resend old messages. Restore
must also apply deletion/withdrawal tombstones before public access is reopened.
Tombstone recovery infrastructure and measured RPO/RTO are still release blockers.

## Remaining external gates

Owned HTTPS origins, Apple team/signing, physical intent tests, verified Resend
sender, live callbacks, operational alert routing, incident ownership, crash
reporting consent/configuration, external security review, accessibility trials,
and a 30-day invited pilot. SMS remains blocked on its separate consent/provider/
carrier implementation and Australian onboarding.


## Executable follow-up checks

See [Step 2 repair report](STEP2_REPAIR_REPORT.md) for the new correlated callback
migration, operational-health RPC, simulator journeys, and remaining restore gates.
Run `npm run release:hosted` with `SIGNALWORD_VIEWER_ORIGIN` set to the intended
HTTPS viewer origin. Run `npm run monitor:operations` only after configuring the
operator endpoint and backend secrets described in that report. Neither command
replaces a live consenting TEST, a restore drill, or physical-device evidence.
