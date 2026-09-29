# Hosted development acceptance: remaining setup

Prepared 29 September 2026. No purchase, production change, public enrollment or iPhone installation is authorized by this document. The manifest stays unfrozen until H01–H17 all pass.

## The six open gates

| Gate | Work still needed | Needs a physical iPhone? |
|---|---|---|
| H04 | Real human Turnstile verification and controlled Auth acceptance, including single-use/expiry and closed enrollment | No for browser/Auth proof; native bridge remains a separate device test |
| H08 | Managed restore, journal reconciliation, measured RPO ≤15 minutes and RTO ≤60 minutes | No; needs approved paid backup environment |
| H10 | Three independently consenting recipients, separate access/acknowledgement, withdrawal, retries, cross-user denial and deletion | No; approved inbox access is needed |
| H11 | Active-incident signed lifecycle, duplicates, out-of-order events and safe unknown-outcome handling | No; real provider evidence must be distinguished from signed synthetic fixtures |
| H16 | Full declared multi-sender load, every sample retained, delivery uniqueness and latency budgets | No; fixture enrollment must obey invitation limits |
| H17 | All preceding evidence tied to one compatible candidate, then manifest freeze | No; depends on the other gates |

## Managed backup decision — do not upgrade yet

Minimum managed PITR source: **Supabase Pro, Small compute, seven-day PITR**. A daily backup alone cannot demonstrate a 15-minute recovery-point target.

For one source project and available organization compute credit, the approximate recurring baseline is **US$130/month before tax and overages**: $25 Pro + $15 Small − $10 included compute credit + approximately $100 PITR. A separate Small restored target adds approximately **$15/month while retained**, giving roughly **$145/month** with both projects continuously running. Disk/egress and other organization projects can change this estimate. Confirm the actual quote before activation; there may be only one organization-level credit.

PITR is billed at **$0.137/hour** for seven-day retention, with partial hours rounded up. It is **not covered by the spend cap**. This is not a promise that a short drill costs only the hourly PITR charge: the plan subscription and compute also apply. No upgrade or restore has been performed.

Sources checked 29 September 2026: [Supabase pricing](https://supabase.com/pricing), [backup prerequisites and PITR](https://supabase.com/docs/guides/platform/backups), [PITR billing](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery).

### Exact approval and drill boundary

1. Inspect the organization's project inventory and quote. Stop if upgrading would affect an unapproved production organization/project. Request approval for the quoted source and isolated target costs before buying anything.
2. Enable Small compute and seven-day PITR only for the approved development source. Wait until an actual recoverable range is present. Provisioning is not backup proof.
3. Establish a controlled synthetic baseline and independent journal coverage. Record UTC timestamps for acknowledged writes, withdrawal and deletion, without contact details or tokens.
4. Quarantine the independent development authority before producing the drill restore point. Disable source schedules for the snapshot used by this drill and verify no pending network requests. Retain the exact original schedules for recovery. The point selected for restoration must contain the disabled schedule state.
5. Restore into a separately approved isolated target. **Supabase copies database roles, Auth users and Vault's encryption root key. Copied Vault credentials can remain readable.** Do not assume a new project is isolated just because Edge Functions were not copied. Verify copied cron jobs are disabled before allowing any execution; replace copied routing/credentials with isolated drill configuration and keep provider delivery blocked. If pre-start isolation cannot be established for the supported restore method, stop and resolve that with the provider before restoring.
6. The checked-in restore CLI intentionally rejects any project except `voepalyamwgenceawdvl`. Do not remove this check to operate a clone. Before running on a target, implement and test an explicitly pinned drill-target configuration, with equivalent origin validation and separate authority credentials. This work depends on the approved target identity.
7. Replay the independent journal twice, verify identical receipts, deny deleted identities and withdrawn links, cancel historical unsent work and reconcile provider outcomes. Never infer non-delivery from a missing callback.
8. Measure RPO from the newest acknowledged pre-failure marker recovered, and RTO from declared unavailability to a safely reconciled usable service. Record provisioning, restore, reconciliation and validation durations separately. Do not stop the RTO clock at database startup.
9. Verify no real delivery occurred from the clone. Reopen only after exact receipt/digest checks; restore intended source schedules and verify health. Keep an uncertain target quarantined. Target deletion and ending paid services require the user's decision.

[Supabase's clone documentation](https://supabase.com/docs/guides/platform/clone-project) explains which database data/secrets are copied and which functions/Auth settings require reconfiguration. RTO is measured, not guaranteed by purchasing PITR. Seven-day database recovery retention and the independent journal's ≥90-day protection serve different purposes.

## Development Sentry requirements

Prepare a dedicated **`signalword-ios-development`** project, platform **Apple / iOS**, in an organization owned by the user. Start with the **free Developer plan** if available; do not select a trial or paid plan automatically. Verify its current quota and terms in the dashboard before activation. One operator account is sufficient for this development check.

Use these settings before enabling any telemetry:

| Setting | Required value/evidence |
|---|---|
| Event retention | Free Developer: **30 days**; verify the dashboard plan. This is plan-controlled, not an invented SDK retention setting |
| Data region | User-approved region; record the actual region. Do not claim Australian data residency |
| Default PII | Off in the SDK (`sendDefaultPii=false`) |
| Server scrubbing | Enable default sensitive-data scrubbing and IP-address removal; inspect an ingested event to verify IP is absent |
| Additional sensitive fields | Scrub contact/email/phone, latitude/longitude/location, token/authorization/cookie, capability URL, phrase, request body and user identifiers as defense in depth |
| Replay, screenshots, view hierarchy | Disabled |
| Breadcrumbs, network/body capture, tracing, profiling, logs, metrics | Disabled; no secondary telemetry pipeline |
| AI analysis/source-code integrations | Not enabled for this development project |
| Attachments | None; symbol files are separately controlled engineering artifacts |
| Access | Named operator only, MFA, no public issue sharing |
| Notifications | Development error notifications to the consenting operator; verify actual receipt |
| DSN | Development project only; configure outside committed source. No management/upload token in the app |
| Symbol upload credential | Least-privilege CI/operator secret; upload only matching dSYMs, record UUID match, never package credential in app |

[Official Sentry retention guidance](https://sentry.zendesk.com/hc/en-us/articles/44907049805979-What-is-the-retention-period-of-my-org-s-audit-log) states 30-day event retention on Developer; audit-log retention is separate. [Sentry data scrubbing guidance](https://sentry.zendesk.com/hc/en-us/articles/29577845250843-What-are-Sentry-s-data-scrubbing-options) describes server-side controls.

The checked-in SDK is **9.29.0**. Its actual serialization test already passes; crash reporting remains **disabled**. The filter reconstructs a minimal event containing build information and native crash addresses, excluding request/user/context/message data. The current sanitized environment label is `invited-pilot`; a distinct development project is therefore mandatory until a reviewed environment-label change is made. Do not silently assert that events are labelled `development`.

Hosted preparation can verify project settings, a sanitized non-device event, notification receipt and symbol availability. A real signed-iPhone crash/relaunch remains physical acceptance and must not be claimed from an SDK serialization test. If the free dashboard lacks a listed control, keep telemetry disabled and record the limitation rather than claiming it was configured.

## Human Turnstile session

The currently hosted verification page intentionally requires the native WebKit bridge. Opening it in a normal browser displays **“Open verification from the SignalWord app”**. That is expected; a green widget alone would not prove Supabase accepted its token.

Prepare an engineer-assisted browser harness before the session, with the real public site key `0x4AAAAAAFFb3ETKlwBxFCNF`, approved hostname, and no token logging, URL parameters, clipboard transfer or persistent storage. The human completes the challenge. The harness must send its fresh token to the real development Auth endpoint and retain only status, timestamp and redacted result. Do not use a test Turnstile key or admin-created session as CAPTCHA evidence.

**Enrollment constraint:** public signup must remain disabled. First prove real CAPTCHA acceptance on an existing controlled identity through a supported Auth flow. A successful existing-user login does not prove anonymous enrollment. If an anonymous creation proof requires enabling signup, use a separately approved isolated Auth test project or a reviewed allowlisted enrollment design. Do not temporarily open this project's public signup. H04 remains open until its exact enrollment requirement is met; record component-level CAPTCHA evidence separately.

Session order:

1. Confirm development origins, challenge hostname, closed signup and fixture identity.
2. Human completes the real challenge; never paste its token into chat.
3. Verify server acceptance, then reuse the token and verify rejection. Test an expired token and missing/invalid tokens separately.
4. Verify wrong-host/action proofs cannot establish the intended session where those claims are enforced.
5. Confirm signup remains closed. Delete the disposable identity through the durable application flow; verify its receipt and revoked access.
6. Retain no CAPTCHA token, session JWT or email in the evidence. Keep native bridge/locked-iPhone tests in the physical checklist.

## A/B/C and load evidence rules

Use only the three privately configured consenting inboxes. Report them as A/B/C. Each must receive its own invitation and alert link; one recipient's acknowledgement must not appear as another's. After withdrawal, its links and unclaimed sends must stop while other consenting recipients remain usable. Acknowledgement must not cancel escalation, and sender resolution must stop future sends.

The declared pilot forecast is ten concurrent recipient reads and five retrying senders. Twice that means **20 reads and 10 distinct concurrent senders**, with duplicate submissions per sender verified independently. One sender issuing ten duplicate requests is useful idempotency evidence but is not the full envelope. Use multiple capabilities and retain every request's round, pseudonymous sender/recipient, status, duration and assertion result, including failed/slow samples. Preserve the ≤2-second acceptance and ≤5-second provider-acceptance targets; report reader latency separately. Never replace a failed cold run with only successful warm runs.

Invitation protection currently permits three invitations per destination per hour. Ten senders across three approved inboxes require staging across more than one window. Do not reset rate buckets, remove the trigger, use unapproved aliases or bypass consent to shorten the test. This scheduling constraint is not a reason to lower the load gate.
