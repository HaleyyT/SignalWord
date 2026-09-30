# Development service setup and quote — 29 September 2026

No purchase or paid feature activation authorized. Hosted acceptance stays 11/17; no manifest freeze or physical installation.

## Supabase: authenticated quote versus estimates

Inspected the authenticated Pro upgrade review for the existing development organization. It shows **Charge today $25.00** and **Monthly invoice estimate $25.00**, with the organization still Free. No payment method was entered and Confirm upgrade was not pressed. These are Pro-only figures. The review has an incomplete address/payment form; a final tax-inclusive combined PITR/compute quote is not available yet.

Minimum managed PITR configuration: Pro organization, Small source compute, seven-day PITR. A separate isolated restore target is needed for our drill. Budget it as Small; confirm the restore wizard's supported size and price before provisioning. Upgrades affect the organization: verify the complete project inventory before purchase.

Official rates, USD before taxes/overages:
- Pro: $25/month, with $10 organization compute credit.
- Small: $0.0206/hour; Micro: $0.01344/hour.
- Seven-day PITR: $0.137/hour, charged for each started hour enabled.
- PITR can be removed after the drill; future PITR hourly billing then stops. Compute/PITR are not covered by the spend cap.

### Short-window estimates

These are calculations, not a checkout promise or authorization. Assume a 730-hour billing cycle, one source, one Small restore target for the same drill window, the full $10 compute credit available, no other usage/overages, and no PITR on the target.

| Scenario | Estimated cycle total |
|---|---:|
| 24-hour drill; source Small for 24h then Micro for remainder; target stopped after 24h | $28.77 |
| 48-hour drill; source Small for 48h then Micro for remainder; target stopped after 48h | $32.72 |
| 24-hour drill; source remains Small for entire cycle; target stopped after 24h | $33.82 |
| Ongoing Small source + seven-day PITR, no persistent target | about $130/month |
| Same, with a Small target retained all month (without target PITR) | about $145/month |

Formula: $25 + ($0.137 × PITR hours) + max(0, total source/target compute − $10). The first row's compute is 24×0.0206 + 706×0.01344 + 24×0.0206. Monthly hours, partial-hour rounding, credits consumed by other projects, taxes and restore target settings change the result. A lower theoretical cost is possible by stopping both projects after the drill, but that interrupts development and is not the proposed plan. Do not assume Pro is billed only for one day or refunded in cash.

Cheapest practical approach: prepare the whole drill first, then enable source Small + seven-day PITR for one 24–48-hour window. Wait for a real recoverable range; execute the isolated restore, journal replay, consent/deletion denial and provider reconciliation; measure RPO/RTO; preserve evidence; then seek the owner's decision before stopping the target, disabling PITR or resizing the source. No time window is guaranteed to be sufficient. Do not downgrade before passing and saving the evidence.

For a live pilot retaining the 15-minute RPO objective, keep PITR (or a separately proven equivalent) active. Pro daily backups retained seven days do not meet that objective. Disabling PITR preserves historical drill evidence, not ongoing recovery capability. Keep the independent deletion/consent journal protected for at least 90 days regardless. RTO ≤60 minutes still requires measured recovery; buying PITR does not prove it. Supabase database backups do not replace a separate backup plan for any future Storage object bytes.

Sources: [PITR prerequisites](https://supabase.com/docs/guides/platform/backups), [hourly PITR billing](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery), [compute and credits](https://supabase.com/docs/guides/platform/manage-your-usage/compute).

## Sentry: free development setup

1. Create an organization named SignalWord (an available slug is fine), owned by your account. Choose the **free Developer plan**. Do not activate paid Team, Seer, on-demand spend, or other paid add-ons. If onboarding starts a trial, confirm the final subscription is Developer before ingestion.
2. Choose **EU** event-data region if offered. This is available on the free plan; it is not Australian residency. The selection is difficult to change afterward, so record the selected region. Keep access private and enable MFA.
3. Create project **signalword-ios-development**, platform **Apple / iOS** (Swift if the wizard asks). Do not add unrelated integrations.
4. Under organization Settings → Security & Privacy, enable default data scrubbing, require default scrubbers where offered, prevent storing IP addresses, and enhanced privacy for notifications. Verify project overrides cannot disable those protections.
5. Add sensitive field names for email, phone, contact, latitude, longitude, coordinates, location, authorization, cookie, token, phrase, capability, request body, and user identifiers. These field rules are defense in depth: they do not replace the app's allowlisted serializer or a received-event inspection.
6. Leave Replay, screenshots, view hierarchy, tracing, profiling, logs, metrics and automatic network capture disabled. Do not paste Sentry's generic quick-start into the app; the repository already has a tested restricted SDK integration.
7. Confirm **30-day event retention** for Developer in the subscription/settings documentation. This is plan-controlled, not an SDK setting. Do not confuse audit-log retention with event retention.
8. Configure development error email notifications to the consenting operator. Do not connect recipient inboxes as app users or enable public issue sharing.
9. Once created, tell the engineer the organization/project names and region. Keep management/upload tokens private. The project's client DSN belongs in local build configuration; keep `SIGNALWORD_CRASH_REPORTING_ENABLED=NO` until privacy/ingestion checks pass. Upload matching dSYMs only through an operator credential outside the app. A signed-device crash/relaunch remains a later physical test.

The current sanitizer labels events `invited-pilot`; the separate development project prevents mixing them with production. No claim of a development environment label is made. If a free-plan control is missing, report it before enabling telemetry; do not buy a plan automatically.

Sources: [free-plan EU region](https://sentry.io/changelog/data-storage-location-in-germany-is-generally-available/), [privacy controls](https://docs.sentry.io/api/organizations/update-an-organization/), [Developer retention](https://www.sentry.help/en/articles/13964940-how-long-are-my-organization-s-audit-logs-stored).

## Turnstile session status

The owner is available for the human challenge. The browser acceptance harness is **not ready yet**. The hosted page requires a native WebKit bridge; simply opening it does not establish a session. Signup must remain disabled.

Prepare a controlled existing-identity Auth challenge harness with the real site key/approved hostname, no token logging, URL token transport, clipboard or persistent storage. Check fresh-token acceptance, duplicate-token rejection, expiry and missing/invalid proof. This is component acceptance only: it does not prove the app's anonymous enrollment. The anonymous-enrollment gate needs a reviewed closed-enrollment approach or an explicitly approved isolated Auth environment; never temporarily enable public signup to force a passing result. Notify the owner only once the harness and exact scope are ready. Do not ask them to paste tokens.
