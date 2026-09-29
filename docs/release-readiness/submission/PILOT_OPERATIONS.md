# Invited email pilot: operator runbook

Status: prepared, not activated. Public enrollment stays disabled. Initial three recipient inboxes are already consented for controlled TESTs; this is not blanket consent for REAL timer-expiry drills. No public release until hosted, signed-device and pilot gates pass.

## Ownership and coverage

The owner must name a primary operator and backup, their coverage hours and notification destinations before enrollment. The current owner is the proposed primary; no backup or continuous coverage has been verified. Never advertise 24/7 monitoring. The Healthchecks heartbeat monitors the monitor itself; the operations check reports application health. Verify real DOWN and UP receipt after any destination/config change, not just a dashboard test button. Sentry is disabled until its development project/privacy/symbol acceptance is complete; Apple/TestFlight diagnostics are supplementary, not a substitute for a tested alert path.

## Daily operation

1. Read aggregate health: authority, oldest pending delivery, unknown outcomes, schedule freshness, webhook lag, timer/retention failures. Check independent heartbeat and unresolved incidents.
2. Confirm expected controlled enrollment count and no unapproved destination. Review only redacted references; do not copy payloads/links into incident tools.
3. Review crashes, support queue, provider quota and billed usage. Assign every failure a severity and owner. Preserve candidate/configuration and exact UTC timeline.
4. At end of a drill, resolve test incidents, cancel timers and confirm no unexplained pending/unknown work. Keep receipts and redacted evidence; delete disposable fixtures through application deletion.

## Incident response and pilot stop conditions

- **P0:** cross-account exposure, revoked/deleted access reopened, secret disclosure, wrong-recipient/REAL send, duplicate unsafe delivery. Stop enrollment immediately, quarantine affected development processing through the supported authority workflow, preserve evidence and notify owner. Do not delete logs or weaken controls. Assess recipient communication with owner approval; do not send incident messages automatically.
- **P1:** alert acceptance/recovery failure, unknown send outcome, overdue scheduling, authority mismatch, missing operational alerts, incorrect TEST/REAL labeling. Pause testing/enrollment; retain pending commands; investigate before retrying. Never blindly resend an unknown provider outcome.
- **P2:** recoverable usability/accessibility or noncritical reporting defect. Track with build/evidence; assess affected acceptance cases before continuing.
- **P3:** cosmetic or documentation issue without misleading behavior. Fix only if it does not disrupt the frozen candidate.

Any P0/P1, stale reconciliation, mismatched receipt, unexpected users/deliveries, wrong routing, failed monitoring, expired signing/configuration or exhausted provider quota stops the pilot. The operator must acknowledge operational incidents within the agreed coverage window; if no operator is available, do not schedule new pilot drills. Receipt of an alert is not proof of assistance.

## Restore, deletion and rollout

Use the existing `RELEASE_RUNBOOK.md` and `HOSTED_ACCEPTANCE_SETUP.md` commands, pinned to approved development identities. Additive migrations stay applied during rollback. Roll back only to a proven compatible function/viewer/app set; do not restore old grants or bypass authority to make an old build work. Prefer the smallest roll-forward repair when schema compatibility is uncertain. Quarantine before restoring; isolate the clone, replay independent deletion/consent journal, reconcile provider outcomes and cancel unsafe historical work. Reopen only after exact receipt/digest checks. No restore beyond verified journal coverage.

Deletion remains pending until durable journal and deletion completion succeed. A lost response uses the private deletion receipt; invalid credentials do not justify recreating the account or erasing the receipt. Capture pre-deletion evidence before data is removed. Never publish the receipt.

## Enrollment and costs

Proposed initial cap: **5 sender participants**, then **20 maximum** only after review; at most three consenting contacts each. Keep public links/signup off. No enrollment expansion without operator coverage and successful first-session evidence. The existing closed-enrollment/new-account mismatch must be resolved by an approved controlled path, not a CAPTCHA bypass.

Proposed usage policy, requiring owner sign-off: warning at **50%** of each provider/free-plan allowance, suspend new enrollment at **80%**, and stop new drills before limits are exhausted. Monitor daily usage, errors and invoice estimates for Supabase, Cloudflare/R2, Resend, Healthchecks and Sentry. These are operating rules, not claimed configured billing alerts. No automatic paid upgrade. For paid backup, review the exact quote and daily spend; PITR is not protected by the Supabase spend cap. Do not impose a new send cap that silently drops an already accepted alert; stop admission and make the incident visible instead.

## Support and known limitations

Support: the configured support mailbox. Request case label, app/build, iOS, UTC time, visible state and a redacted screenshot. Never request secret phrases, recipient links, access tokens or exact coordinates by email. Acknowledge within the published coverage hours, which the owner must define. Direct actual emergencies to the user's local emergency services; support is not dispatch.

Known limitations: internet/provider availability, iOS execution restrictions, no guaranteed delivery or response, acknowledgement does not verify identity/help or cancel escalation, no SMS/police/monitoring, no continuous listening/tracking, optional snapshot location may be stale, timer expiry produces REAL-labelled incidents. Locked behavior is unverified until L2 passes on the named build/device.
