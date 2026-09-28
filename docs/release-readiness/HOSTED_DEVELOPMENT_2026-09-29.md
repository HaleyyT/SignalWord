# Hosted development verification — 29 September 2026

**Candidate is not frozen and is not ready for iPhone installation.** This report supersedes the earlier append-only rollout notes. No production backend, public enrollment or emergency-service delivery was enabled.

## Scope and identities

- Supabase: `voepalyamwgenceawdvl`; authority: `https://authority-dev.signalword.app`.
- Vercel: `signalword-dev`; public development alias: `https://www.signalword.app`. Vercel's Production label refers to that development-only project.
- Viewer deployment: `dpl_B4mdNxwtHNhJ7e6TnPyiyGJX1rzT` on `www.signalword.app`, containing the withdrawal retry fix. Both proxy origins were explicitly pinned to development at deployment. Other aliases were not promoted in this repair.
- Database: 32 migration versions, through `20261001030000_restore_safeupdate.sql`.
- Edge Functions, all ACTIVE: `user-api` 10; `public-event` 9; `contact-confirm` 9; `deletion-status` 9; `dispatch-deliveries` 9; `resend-webhook` 10; `operational-health` 4.
- Latest local application/tooling code: `421f3c5b4c54bf6d5a13da62e7383a15e9fb8fac`, app 1.0 (2). API/mobile contracts are unchanged. The only shared-function source change since the hosted restore repair is `monitor-client.mjs`, used by the monitor.
- Four Vault names confirmed: `signalword_backend_url`, `signalword_dispatch_secret`, `signalword_control_url`, `signalword_control_reader`.
- Auth: public signup disabled; anonymous authentication configured; Turnstile enabled. No secret values are retained here.

## Acceptance register

PASS means the stated boundary has evidence. PARTIAL and BLOCKED do not count as passed. This register is a verification checklist, not a measured reliability percentage.

| ID | Gate | Status | Evidence / remaining work |
|---|---|---|---|
| H01 | Correct development scope and empty baseline | PASS | Confirmed project, zero users/contacts/timers/queued messages/unknown outcomes at baseline |
| H02 | Deployed migrations/function inventory | PASS | 32 migration versions and seven ACTIVE functions; compatible HTTP contracts |
| H03 | Missing/invalid auth and CAPTCHA rejection | PASS | Missing/invalid CAPTCHA 400 `captcha_failed`; invalid JWT and unsigned callback 401; signup disabled |
| H04 | Human Turnstile success | BLOCKED | Requires an awake human and controlled enrollment; never substitute admin-created identities for CAPTCHA proof |
| H05 | Public alias routing and headers | PASS | Six hosted preflight checks; exact development proxy targets |
| H06 | Independent journal retention | PASS | Prior 90-day retention proof: write accepted; overwrite refused; deletion readback unchanged |
| H07 | Journal replay, duplicate replay, receipt and gate | PASS | Hosted replay/receipt/release/requarantine evidence; latest state recorded below |
| H08 | Managed backup restore and RPO/RTO | BLOCKED | Dashboard explicitly states Free plan has no managed backups. No destructive restore or upgrade performed |
| H09 | Controlled profile ownership and deletion | PASS | Two controlled accounts: own update, cross-user denial, forged owner rejected; durable deletion/receipt and cleanup |
| H10 | Hosted contact consent and recipient capability isolation | PARTIAL | 23 deployed SQL/RLS checks plus real one-inbox HTTP consent/TEST/ack/recovery/resolution/deletion pass; withdrawal 503 recovers on retry and UI repair deployed; full three-recipient journey pending |
| H11 | Signed provider lifecycle, duplicate/out-of-order/ambiguity | PARTIAL | Actual initial/resolution sends each delivered once, with signed sent/delivered receipts; full local fault suite passes. Hosted ambiguity and complete replay acceptance remain pending |
| H12 | Five schedules and empty-state processing | PASS | All five active and successful; empty-state result does not prove live concurrency |
| H13 | Operations incident, suppression and recovery receipt | PASS | Connected operator inbox: one DOWN at 03:35:45 and one UP at 03:58:47; complete scoped query shows no repeated incident mail during sustained failure |
| H14 | Interrupted reporting notification | PASS | Controlled reporting misconfiguration: actual failure DOWN at 04:06:46 and recovery UP at 04:07:48 in the connected operator inbox |
| H15 | Missing-heartbeat DOWN/UP receipt | PASS | Actual missing-ping DOWN at 03:55:47 and UP at 03:57:47 verified in connected operator inbox |
| H16 | Twice-pilot hosted recipient/alert load | PARTIAL | 10 hosted duplicate TEST requests created one incident, p95 1043 ms. First 20-read p95 5008 ms; repeat p95 2311/2506/1848 ms. Full acceptance remains pending |
| H17 | Complete inventory acceptance and frozen manifest | BLOCKED | Must wait for all required hosted gates; no invented verification booleans or dirty manifest |

**Hosted checkpoints: 11/17 passed (65%).** This figure only reports the checklist above; every required gate must pass before installation.

## Monitoring evidence and correction

The free deployment uses `HEARTBEAT_URL` and `OPERATIONS_PING_URL`, stored as distinct Cloudflare Secrets. Better Stack and `OPERATOR_WEBHOOK` are unnecessary in this mode. Two distinct email notification integrations are connected; the earlier apparent duplicate was not present in the current integrations table.

The user's two 03:21 screenshots show the same operations recovery email: 03:18:45 +10, eight-minute downtime. Count it once. Manual TEST DOWN messages prove email configuration, not the automatic state machine.

Native Healthchecks history showed uninterrupted minute-by-minute pings across the earlier 03:09–03:15 cron pause. A later explicit schedule removal returned `schedules: []`, yet fresh pings continued beyond the expected propagation interval. For a genuine stopped-reporting drill, development remained quarantined and a temporary no-reporting handler was deployed. The committed monitor must be restored after the drill, with the final version and state recorded below. No safety recipient delivery was used.

## Restore limitations

The additive safeupdate repair preserves hosted protections. Local restore testing uses a real local dump/restore plus an authority fixture; hosted journal replay verifies receipt and archive consistency. Neither proves a managed backup restoration. The development project's Free plan has no managed backups. Provision a supported recoverable backup environment within journal coverage, review cost, and then execute the authorized isolated drill. RPO/RTO remain **unmeasured**, not passed.

## Deployment and rollback

Retain additive migrations and tightened grants. Promote all seven functions and viewer only from a compatible committed candidate; preserve secret versions. Do not roll back database permissions or remove the independent gate. If compatibility, unknown provider outcomes, receipt or monitor checks fail, quarantine and investigate. The checked-in `scripts/restore-release.mjs --reconcile-and-release-development` is the only release workflow used for the final reopening; it now pins both approved origins before sending credentials.

No iPhone installation is authorized until all required gates pass and one clean manifest identifies the hosted versions. See [device instructions](PHYSICAL_DEVICE_TEST_GUIDE.md) and [engineering progress](engineer-progress.md).

## Final readback — 04:00 Sydney

- Authority open (`/gate` allowed), current journal version **5**, digest `065887e17711ac61db5d9c56c575234ba9b5b390a766263d28fc3f92a6218e84`.
- Checked-in reopening verified duplicate replay and database receipt at version 3. The later two controlled account deletions legitimately advanced the journal to version 5. Their issued sessions remain denied (503, `allowed: false`); current global gate remains allowed.
- Scoped operational health: **no problems**. No controlled accounts, contacts, active timers, queued messages or unknown delivery outcomes remain. No safety emails were sent this session.
- Authority Worker: `183202c5-f1fb-40cb-9388-e419dc422559`.
- Restored committed monitor Worker after the final reporting-failure drill: `ac57442a-4291-43bc-abcf-375975c0ab7f`; cron `* * * * *`. The temporary outage handler is removed.
- Genuine heartbeat history: last ping **03:52**, DOWN **03:55**, UP **03:57** (dashboard minute precision). Inbox receipt and repeated-failure suppression were subsequently verified through the narrowly scoped Gmail connector checks described below.
- Two controlled identities passed own-profile access, cross-user denial, forged-owner rejection, durable deletion and receipt recovery. Twenty concurrent authenticated profile reads all returned 200; **p95 1,142 ms**. This is not the full recipient-read/alert-submission load gate.
- All six public-alias route/header checks passed again after reopening.
- Configuration inventory has all required secret names, Vault names, schedules, functions and migrations. After notification receipt verification, it correctly reports only `UNVERIFIED_CAPTCHA`. No booleans were changed to force acceptance.

The final deleted-subject harness initially expected 403. The documented contract returns 503 for denied subjects; the corrected assertion also supplies the actual JWT issue time to distinguish deletion from a stale-session denial. Both checks pass without changing service behavior.

Durable redacted metadata: [HOSTED_EVIDENCE_2026-09-29.json](HOSTED_EVIDENCE_2026-09-29.json).

## Retry evidence — 04:08 Sydney

Monitoring acceptance now passes for the connected operator inbox. Work-only Gmail queries found real operations DOWN/UP at **03:35:45 / 03:58:47**, with one incident and one recovery across repeated failure. A complete query including spam/trash found no extra incident messages in that interval. Missing-heartbeat DOWN/UP arrived at **03:55:47 / 03:57:47**. No personal or unrelated messages were inspected; addresses, private links and message IDs are excluded from retained evidence.

A separate controlled reporting-failure drill used an invalid operations destination in a temporary Worker while development was quarantined and empty. Stored secrets were preserved. The heartbeat received an explicit failure; real operator DOWN/UP emails arrived at **04:06:46 / 04:07:48**. The original committed Worker and one-minute cron were restored, followed by duplicate replay, matching receipt and checked-in release. At 04:08 the authority was open, health clear and the journal remained version 5. These timestamps are email timestamps; provider status-change time can differ by seconds.

The second configured inbox has not been independently inspected; acceptance proves one complete operator notification path, not delivery to every destination or long-term availability.

The new rollback-only SQL script passed **23 checks** against the deployed development database: pending consent, idempotent invitations, invalid capability denial, separate confirmations, service-only consent creation, three-recipient TEST routing, independent acknowledgement, withdrawal/retry/access revocation and cross-user isolation. No local-fixture exemption was enabled. Background workers cannot see the uncommitted outbox, and the final rollback left zero users, contacts and deliveries. This strengthens H10 without substituting for the real hosted recipient journey.

Reproduce only on the empty approved development project with the authority healthy:

```bash
npx supabase db query --linked --project-ref voepalyamwgenceawdvl \
  --file scripts/hosted-contact-proof.sql
```

Remaining full gates: H04 human CAPTCHA, H08 managed restore, H10 hosted recipient journey, H11 complete provider lifecycle, H16 hosted alert/recipient load and H17 final freeze. No source/API behavior or security protection was weakened to close the monitoring gates.

## Latest live journey and repaired deployment

See [structured evidence](HOSTED_TEST_JOURNEY_2026-09-29.json) and the current engineering report. At 04:58 Sydney the authority was open at journal version 9, no health problems, minute monitor schedule active, and fixture cleanup verified. `dispatch-deliveries` is now version 10; other function versions are unchanged. The new viewer passes six alias checks and its mocked-response browser regression. No manifest was frozen and no iPhone was installed.
