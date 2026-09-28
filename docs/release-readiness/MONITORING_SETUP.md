# Development monitoring: free Healthchecks setup

> **Operator evidence received:** screenshots confirm a non-TEST `UP | signalword-dev-operations` recovery email at 2026-09-29 03:18:45 +10:00, after eight minutes down. Operations recovery delivery passes. Separate monitor missed-heartbeat DOWN/UP receipt and duplicate suppression remain pending. Both screenshots show the same recovery event.

Updated 29 September 2026. Better Stack incoming webhooks require an upgrade on this account. They are no longer required for this development monitor.

## Required configuration

Use two distinct Healthchecks checks, both with a simple one-minute period and two-minute grace. Connect your verified email notification integration to both checks.

| Check | Cloudflare runtime Secret | Meaning |
|---|---|---|
| signalword-dev-monitor | HEARTBEAT_URL | The monitor is running and can report operations status |
| signalword-dev-operations | OPERATIONS_PING_URL | The development backend is healthy |

Copy each normal HTTPS UUID Ping URL into the corresponding Secret on `signalword-dev-monitor`. Leave MONITOR_SECRET and BACKEND_ORIGIN unchanged. OPERATOR_WEBHOOK is unnecessary in this mode. Never put Ping URLs in Git, screenshots or chat. Both names and secret types were verified through Cloudflare; their values were not retrieved.

## How the code works

Every tick reports backend health to the operations check: `/fail` for a fault, normal ping for recovery/health. Repeated pings maintain the check; Healthchecks controls state-transition notifications. Then the monitor reports whether it successfully communicated to the heartbeat check. Reporting failure marks that check failed. A stopped Worker causes missing-heartbeat alerts. No personal data or problem payload is sent to Healthchecks.

Backend configuration errors become an unhealthy operations result. Identical check URLs are rejected to prevent a successful heartbeat from clearing a backend failure. The previous JSON webhook mode remains compatible when OPERATIONS_PING_URL is absent.

Both checks depend on Healthchecks and its email delivery. This is not two independent notification providers or a staffed incident response service. Free-plan history is limited; retain redacted acceptance evidence separately.

## Verification before acceptance

1. Confirm email integration is enabled on each check and verify a test email arrives.
2. Engineering verifies this changed Worker is deployed with its cron still disabled during rollout preparation.
3. Record the known backend quarantine/paused-schedule baseline before enabling scheduled monitoring.
4. Run a controlled synthetic failure; receive one operations incident email.
5. Repeat the failure and verify no repeated incident emails (disable optional repeated reminders for the drill).
6. Report healthy operations; verify recovery email.
7. Interrupt reporting and verify the heartbeat warning. Restore reporting and verify recovery.
8. Stop heartbeats and verify independent missing-ping notification after period/grace; restore the intended schedule.

Local tests cover the request behavior, but do not prove hosted notifications or service-side deduplication. Do not mark O1 complete until real operator receipt is recorded. No recipient safety alerts are needed for this drill.

References: [Healthchecks pricing](https://healthchecks.io/pricing/), [Ping API](https://healthchecks.io/docs/http_api/), [notifications](https://healthchecks.io/docs/configuring_notifications/).

## Latest development evidence

The cron is enabled every minute on Worker version `02ccd2f1-39f1-4f98-b278-4a797b7e3830`. Real Cloudflare execution initially rejected `redirect: error`, preventing both pings. Repair `2b4178c` uses manual redirects and rejects non-success responses; it does not follow redirects with secrets. Real local workerd now tests this path (four cases), including redirect refusal. Hosted ticks report both `PING_ACCEPTED` and backend failure/recovery states.

The missed-heartbeat drill paused cron around 17:09 UTC on 28 September and restored it after 17:15 UTC. Authority remained quarantined during the pause. Reopening initially exposed quarantine-era timer/dispatch health results; we requarantined, reconciled again, verified no accounts, then invoked the existing timer sweep/dispatch wakeup. Final aggregate health returned no problems. Operator receipt of automatic DOWN/UP notifications and suppression across repeated failures remain unverified. Manual TEST emails are not this evidence.
