# Hosted continuation — 29 September 2026, evening

Status: **11/17 hosted gates complete. Not frozen. Do not install.** No paid upgrade, public enrollment or production change was performed.

## Evidence collected

- Independent development authority allowed at journal version 13; health problems empty; two previously deleted subjects denied with 503.
- Fresh disposable sender created through the admin fixture flow (not counted as CAPTCHA acceptance). Three A/B/C confirmation invitations accepted by the application. All contacts were still pending at latest readback; no TEST incident created in this run.
- First A invitation returned 503; contact-network readback showed zero contacts; retry returned 202. B and C returned 202. Preserve this failed first attempt. Preparing the fixture password invalidated its previous session; a controlled admin session refresh restored access. That administrative flow is not CAPTCHA evidence.
- Hosted resend-webhook rejected unsigned and malformed-signature callbacks with 401 (251 ms / 117 ms). Active signed ordering, duplicates and uncertain provider outcomes remain open.
- Browser extension access timed out; native browser interaction was interrupted by user activity. Requested confirmation of the three fresh invitations rather than interfering with unrelated browsing.

## H04 prepared human harness

`node scripts/run-hosted-turnstile.mjs PRIVATE_INPUT NEW_REDACTED_OUTPUT`

Private input: environment=development, signupDisabled=true, existing disposable email/password and development publishableKey. Verify the live closed-signup setting before creating this input. Store it outside Git with mode 0600. The harness opens the actual hosted verification page and public site key in headed Chromium. The human completes the challenge. A browser-only bridge shim sends the token in memory to the pinned development password-login flow. A returned session is signed out immediately; the same CAPTCHA token is retried and must fail. Only scalar results are written; no tokens, recipient data or provider error bodies are retained.

This is **existing invited identity evidence only**, not anonymous signup or native WebKit proof. Missing/expired/wrong-context challenge cases and the closed-enrollment product journey still require their own results. Do not call H04 complete from one positive login.

## H10/H11 remaining

Finish each recipient's actual consent and TEST viewer, separate acknowledgements, both routing policies, withdrawal before unclaimed send, resolution and durable deletion. Keep the first 503. Use genuine provider callback replay for real event IDs; label synthetic signed fixtures separately. Unknown-send experiments require a narrowly controlled transport fault and reconciliation evidence; do not fabricate a provider result or blindly retry an accepted message.

## H16 prepared envelope

`runHostedEnvelope` in `scripts/hosted-load-envelope.mjs` requires 10 distinct consenting sender fixtures, 20 reads across at least 10 private capabilities, pinned development origin and closed-signup declaration. It records first submissions, duplicate submissions and reads in exclusive-create JSONL files (40 samples). Budget checks: sender p95 <=2000 ms, reader p95 <=5000 ms. Provider uniqueness and <=5000 ms provider acceptance remain separate checks and are explicitly false in the HTTP report.

The live envelope has **not run**. The current sender has three pending contacts. Invitation limits remain enforced: three invitations per destination/hour. Stage additional identities across the permitted windows; never clear limits or silently reuse one sender to satisfy the count.

## H08 readiness before spending

The supported managed clone is created by the paid restore action itself; it cannot be provisioned as an existing restore target before purchase. Supabase also states copied external-operation extensions can run as soon as the clone starts. Source schedule disablement and empty pending network work must be present in the chosen restore point. The independent authority must remain quarantined until exact reconciliation and receipt checks pass.

Source: https://supabase.com/docs/guides/platform/clone-project

No upgrade approval requested. Preparation is **not complete**: validate the chosen snapshot's disabled jobs/triggers, finish explicitly pinned target reconciliation configuration after the provider assigns its target identity, and verify separate clone authority/credentials. The current restore-release tool must keep refusing arbitrary targets. Do not weaken that guard.

Prepared measurement command:

```sh
node scripts/restore-drill-evidence.mjs PRIVATE_DRILL_RECORD NEW_REDACTED_REPORT
```

Record outage start, latest recovered acknowledged marker and safely usable service time in UTC. This tool requires 12 explicit isolation/reconciliation/access/outcome assertions, rejects source=target, and fails RPO >900 seconds or RTO >3600 seconds. A database that merely started is not safely usable. The tool does not perform or authorize any restore.

## Sentry and final freeze

Await user confirmation of the free development Sentry project. Runtime reporting remains disabled. Verify actual free-plan retention, privacy controls and sanitized ingestion before enabling it. H17 remains dependent on all hosted evidence and the matching signed artifact. These new operator scripts do not change deployed API/mobile behavior.

## Local verification of this preparation

`node --test tests/*.test.mjs`: **188/188 pass**. The eight added tests cover invited-login destination/redaction/logout, rejection without network, exact load population/sample retention/consent guards, and restore threshold/safety/timestamp validation. `node --check scripts/run-hosted-turnstile.mjs` and `git diff --check` pass. These are operator-tool checks; they do not substitute for hosted results.
