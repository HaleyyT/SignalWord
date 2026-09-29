# Hosted continuation — 29 September 2026, evening

Status: **11/17 hosted gates complete. Not frozen. Do not install.** No paid upgrade, public enrollment or production change was performed.

## Evidence collected

- Independent development authority allowed at journal version 13; health problems empty; two previously deleted subjects denied with 503.
- Fresh disposable sender created through the admin fixture flow (not counted as CAPTCHA acceptance). Three A/B/C confirmation invitations accepted by the application. All contacts were still pending at latest readback; no TEST incident created in this run.
- First A invitation returned 503; contact-network readback showed zero contacts; retry returned 202. B and C returned 202. Preserve this failed first attempt. Preparing the fixture password invalidated its previous session; a controlled admin session refresh restored access. That administrative flow is not CAPTCHA evidence.
- Hosted resend-webhook rejected unsigned and malformed-signature callbacks with 401 (251 ms / 117 ms). Active signed ordering, duplicates and uncertain provider outcomes remain open.
- Browser extension access timed out; native browser interaction was interrupted by user activity. Requested confirmation of the three fresh invitations rather than interfering with unrelated browsing.

## H04 normal-browser replacement — live and human-verified

The Playwright-controlled real challenge failed. Do not retry that harness or count simulated CAPTCHA results as human acceptance. `scripts/run-hosted-turnstile.mjs` now exits with instructions instead of launching Chromium.

Prepared page: `https://www.signalword.app/onboarding/acceptance.html`. Published and verified in signalword-dev. Preview deployment: `https://signalword-h1274aerv-haleyyts-projects.vercel.app`; it is not a permitted real widget hostname and the page intentionally refuses it.

For another session, open the exact www URL manually in normal Chrome/Safari, without a debug-controlled session. Choose the private `h04-private-input.json` fixture supplied by the engineer using the file picker. The file is parsed locally, credentials go only to the pinned development Auth endpoint, and no credentials/token are placed in URLs, DOM evidence or browser storage. The existing identity logs in, immediately logs out, and retries the same token expecting rejection. Save only the redacted result. It proves existing invited-password authentication, not native WebKit or new anonymous enrollment.

Verified directly in Cloudflare: public site key `0x4AAAAAAFFb3ETKlwBxFCNF`, Managed mode, sole allowed hostname `www.signalword.app`. Public root redirects to www; both verification requests end at www with HTTP 200. Existing native verification CSP permits challenges.cloudflare.com for scripts/frames/connections. The separate acceptance-page CSP additionally permits only the exact development Supabase origin. Numeric error-callback codes are shown without exposing tokens.

Public alias promotion was blocked by automatic approval review pending fresh proof of development routing. A broad env export was rejected and not executed. Specific-variable API reads returned metadata but withheld both sensitive values, so they did not prove routing. The user explicitly approved pinning both existing routing values; Vercel acknowledged both updates (existing Production/Preview targets retained). Deployment dpl_BTesYAxVXcuWUGF9NB5468tYXLJJ is READY at www.signalword.app, source 6a78f7d. All six hosted routing/header checks pass; deployed acceptance assets match source, development-only CSP and no-store/no-referrer/nosniff/anti-framing pass. No environment export was performed. Initial header inspection incorrectly used a case-sensitive dictionary; direct case-insensitive header readback confirms the required headers.

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

The user created SignalWord / signalword-ios-development, iOS, EU, Developer/Free. Authenticated UI confirmed the project and EU ingestion, scrubber/default scrubber/IP prevention, and disabled minidumps. Runtime reporting remains disabled.

The real SDK serializer privacy test passed (1 test) and exported its sanitized synthetic event without initializing telemetry. First ingestion returned HTTP 200 but Sentry added city/country geography. This is retained as a failed privacy result: event `17ef4f51e09b4dfd93652b05f663008e`, issue 150105882. Added server sensitive fields city, subdivision, region, country_code, ip_address. After propagation, a second event `e59925ff128c46e0abc3e9e160212f05` returned 200 and the stored geography displayed `[Filtered], [Filtered] ([Filtered])`. The original failure is not overwritten. Fixtures use test release signalword@0.1.0+1, not candidate release 1.0 (2).

Local signed binary and dSYM both report UUID DFBFD3A4-1433-34D1-8D93-A1BF38FEACAE (arm64), but the hosted Debug Files page has no uploaded symbols. Signed artifact still says crash reporting NO and an empty DSN. Symbol upload/symbolication and signed-device crash remain pending. Sentry's official documentation specifies 30-day event retention on Developer/Free; authenticated subscription readback shows Business Plan Trial (14 days left), $0.00, no billing details and no payment method; do not claim Developer retention is already active. No paid Sentry feature was activated.

Sources: https://www.sentry.help/en/articles/13964201-can-i-disable-ip-geolocation-for-gdpr-compliance and https://www.sentry.help/en/articles/13964940-how-long-are-my-organization-s-audit-logs-stored . H17 remains dependent on all hosted evidence and the matching signed artifact. These new operator scripts do not change deployed API/mobile behavior.

## Local verification of this preparation

`node --test tests/*.test.mjs`: **188/188 pass**. The eight added tests cover invited-login destination/redaction/logout, rejection without network, exact load population/sample retention/consent guards, and restore threshold/safety/timestamp validation. `node --check scripts/run-hosted-turnstile.mjs` and `git diff --check` pass. These are operator-tool checks; they do not substitute for hosted results.

## Latest verification and operator limitations

- Node 188/188; viewer 44/44; repository/security/contracts; viewer build: pass.
- Mocked ordinary-browser harness: login/logout/token-reuse rejection, redaction, empty browser storage, erased file input, wrong-environment rejection: pass. This is not real CAPTCHA evidence.
- Last contact-network read: 200, three pending contacts. H10/H11/H16 remain open. No TEST incident sent this round.
- A direct service-role trusted_contacts inspection returned 403/42501 because the table is intentionally protected. No grants were widened; use the authenticated contact-network route.
- Private evidence remains under /private/tmp/signalword-dev-deployment-private; never copy its credentials or fixture files into Git. Sentry failure/retest records are distinct.

## Human H04 evidence — 18:39 Sydney

User completed the normal-browser challenge and saved the redacted report. Verified fresh login 200/accepted, immediate local-session logout 204, reused challenge rejected 400. Separate real Auth requests rejected missing and invalid challenges with 400/captcha_failed and no session. Public signup readback remains disabled. Durable redacted evidence: evidence/2026-09-29-human-turnstile.json and evidence/2026-09-29-turnstile-deployment.json. This closes the human-positive and reuse components, not unused-token expiry or a controlled anonymous-enrollment path. H04 and the overall 11/17 count remain open; native bridge remains a physical test.

## H16 population prepared and invitation expiry

Nine additional disposable load senders were created with public signup still disabled. Each invited one controlled recipient (02–04 → A, 05–07 → B, 08–10 → C); all nine application submissions returned 202, no alert created. Together with the original sender this prepares the required ten distinct identities. At 18:53 Sydney, 04/07/10 were confirmed, six load invitations still pending. These are not ten confirmed senders and H16 has not run. Admin fixture provisioning does not count as CAPTCHA onboarding.

Original A/B/C links expired after the configured 30-minute lifetime. The user requested fresh invitations. The load preparation consumed the current three-invitations-per-destination/hour allowance; a guarded local resend process waits until 19:00 Sydney, checks health and original contact identities, and skips already-confirmed contacts. Do not claim emails resent until its result is recorded. No rate bucket was cleared or permission widened.

Managed restore preparation: MANAGED_RESTORE_DRILL_PREPARATION.md. No purchase requested or performed; isolated-clone verification remains unfinished.
