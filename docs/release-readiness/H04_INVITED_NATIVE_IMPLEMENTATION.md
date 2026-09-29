# H04 native invited email-code repair

Status: implemented and locally verified; updated development harness deployed. SMTP and code-only template saved and read back. H04 is NOT PASS: real OTP acceptance and remaining hosted negatives are pending. H17 has not started.

## What changed

Missing native credentials no longer invoke anonymous signup. The setup flow asks for an invited email, completes the existing isolated Turnstile WebView, calls Supabase `/auth/v1/otp` with `create_user:false`, then verifies the entered code through `/auth/v1/verify` with `type:email`. Only returned session credentials enter the existing Keychain store. Email, OTP and CAPTCHA stay in memory; they are not put in preferences, logs, evidence or URLs. Refresh is unchanged and does not require a challenge. Unreadable Keychain data is never treated as a fresh account. Pending deletion blocks initiating sign-in; generation checks reject late verification/refresh responses after deletion.

The client restricts input, but Supabase is authoritative for account existence, code expiry, rate limits and single use. UI wording does not promise email delivery or identity readiness before acceptance. A failed/unknown request offers an explicit new verification instead of automatic email retries. After app termination before verification, re-enter the invited email and request a fresh code. Existing signed-in sessions survive relaunch through Keychain.

Native artifact contract: no service role/admin credential, no password or pre-created session embedded, no new Bundle ID/App Group or entitlement. Old existing sessions can still refresh. Public signup must remain globally disabled. Do not deploy the app with the anonymous first-launch code as a fallback.

References: https://supabase.com/docs/reference/swift/auth-signinwithotp and https://supabase.com/docs/guides/auth/auth-email-passwordless — existing-user OTP with shouldCreateUser false; template includes Token; verify type email.

## Exclusive hosted window packet

Owner: Astra. Must obtain explicit window confirmation with Sol's hosted mutations paused. Only development project voepalyamwgenceawdvl and Vercel signalword-dev/www.signalword.app. No authority/schedule/production/purchase changes.

1. Recheck development routing, signup disabled, CAPTCHA enabled, SMTP health and one controlled invited identity. Do not recreate deleted fixture sender 02 or withdrawn contact consent. If a real recipient address needs an Auth identity, prepare a separately labelled operator-invited identity; no public registration.
2. Read existing Auth email template and OTP length/expiry privately. Preserve a private rollback copy. The sign-in email must expose `{{ .Token }}` as a code and accurately identify DEVELOPMENT, expiry and support. Do not include session credentials or alert links. Prefer retaining existing secure expiry; explicitly record its value. Do not silently lengthen it. Native accepts 6–10 ASCII digits; unsupported provider configuration blocks deployment.
3. Publish matching acceptance harness assets only after local regression. Confirm public event/contact origins remain pinned to approved development functions and rerun routing/header checks. Preserve prior deployment ID for rollback.
4. Human opens `/onboarding/acceptance.html` in normal browser, selects “Native invited email-code contract”, loads the private fixture for the controlled invited inbox, completes CAPTCHA, then enters the received email code. Harness verifies, locally logs out temporary session, replays code and saves ONLY redacted status/UTC evidence. No automatic real CAPTCHA solve.
5. Separately exercise genuinely expired unused OTP, wrong code, uninvited identity, replayed/expired CAPTCHA, throttling, offline interruption and deleted-user refusal with controlled fixtures. Record genuine provider behavior separately from mocks. Do not claim the earlier password-login CAPTCHA proves this new flow. Keep the auth/code fixture private and clean up via durable application deletion only after evidence capture.
6. Rerun hosted closure/routing/identity isolation and capture clean end state. No email template deployment alone closes H04. Native WebView/Keychain physical behavior remains device acceptance.

Rollback: restore only reviewed private Auth template/settings snapshot if changed; promote the last verified development viewer deployment after routing proof if needed. Never enable anonymous/public signup to restore compatibility. Hold the new app candidate if hosted OTP cannot pass. Do not log template management tokens, OTPs or fixture contents.

## Verification and retained failures

New Swift tests cover request shape/no account creation, invalid inputs, no anonymous network fallback, successful session storage, relaunch reuse, 400/401/403/422/429/500 denials, offline request and late verify-vs-deletion. Existing refresh/deletion concurrency tests now use invited verification. These are mocked responses, not claims of actual hosted expiry/single-use behavior.

Browser contract tests and mocked journey prove request/verify/reuse/logout/redaction/no browser storage. The prior login/closed/expiry modes remain available. A real hosted OTP result is still required.

Initial Swift run was interrupted because old anonymous-signup race tests waited for a removed request; original logs are retained at /private/tmp/h04-swift.log and h04-swift-with-tests.log. Tests were adapted to the intended invited flow, not removed. Final logs: h04-swift-final.log, h04-sentry.log, h04-final-node.log, h04-browser-otp.log, h04-ui.log, h04-release.log, h04-local-integration.log under /private/tmp. Record command exit states and final log digests before claiming completed regression.

## Hosted readback and current prerequisite

Exclusive H04 window approved by the user; Sol confirmed no hosted operations in flight and paused shared mutations. Readback: global signup false; anonymous flag true but global closure retained; OTP length 8, expiry 3600 seconds. Current Auth sender is default, custom SMTP absent, and the dashboard's default magic-link template exposes a link rather than the code. Template edit controls are disabled until SMTP setup. Additional scoped approval requested to connect the existing Resend sender; no SMTP change performed yet. No new paid service is required by this request.

Local results: 199 Node, 44 viewer, 42 Swift core, actual Sentry-linked privacy suite, eight simulator UI journeys, Release simulator build, mocked OTP/browser journeys, repository/security/contracts and real isolated local API/database lifecycle integration passed. These are local checks, not hosted OTP acceptance. See evidence/2026-09-29-h04-native-local.json.

## Approved SMTP setup and harness deployment

The user approved connecting the existing Resend sender to development Auth. The private SMTP password entry/save is handed to the user under the computer-use credential-entry rule; no password or key is requested in chat. Expected settings: smtp.resend.com, TLS port 465, username resend, sending-only key restricted to mail.signalword.app, sender alerts@mail.signalword.app, display name SignalWord Development, 60-second per-user interval. Saved SMTP configuration and actual delivery are not yet verified. A code-only template is staged privately, not deployed. Existing OTP configuration remains eight digits / 3600 seconds until verified readback.

Viewer deployment dpl_Dz47ogxhVDGL9aWcFtvHK7GAdq31 is published to the approved www.signalword.app development alias from source 9b03a7d. Both runtime proxy origins were explicitly pinned to project voepalyamwgenceawdvl during deployment. All six hosted routing/header checks passed; all three acceptance assets match the tested source by SHA-256. See evidence/2026-09-29-h04-otp-harness-deployment.json. This proves deployment compatibility, not hosted OTP acceptance. No backend function, migration, authority, schedule or enrollment setting was changed.

The older private H04 fixture is not a consenting inbox and must not be reused for the email-code test. Prepare a fresh controlled invited fixture once SMTP is verified; never distribute embedded administrator credentials. Sol remains paused for hosted mutations until explicit handback.

## Current SMTP/OTP checkpoint — 29 September, 23:00 Sydney

User saved custom SMTP and corrected its username to lowercase resend. Dashboard readback confirms smtp.resend.com:465 with the password still hidden; no credential was extracted. Code-only magic-link/OTP subject and body were saved and survived reload. Existing eight-digit / 3600-second expiry is retained. Actual SMTP delivery remains unverified.

A separately labelled, operator-provisioned H04 invited Auth identity was created for the consenting A inbox with email confirmation false and no password. It sends no invitation during provisioning, does not grant a session and does not enable public signup. The human OTP verification must establish inbox ownership. Private fixture contains only the invited email, development marker and public client key; no administrator key, password or session.

Updated harness deployment dpl_7zPRfrM6qkF86dNkP7xU4CEd6Uva at www.signalword.app uses explicitly pinned development origins. All three assets match local hashes and all six routing/header checks pass. Live missing/invalid CAPTCHA requests both reject with HTTP 400 captcha_failed. Human OTP instructions were issued; no success is assumed. See evidence/2026-09-29-h04-smtp-otp-ready.json. Sol hosted changes remain paused; H08 read-only preparation continues.

## Submission-first scope — 30 September

The owner now permits a separately identified private-test/submission candidate before formal H08/H11/H16/H17 closure. Managed PITR purchase/drill and exhaustive load/provider evidence are deferred, not passed. Real invited sign-in, code delivery, wrong-code/reuse denial, recipient consent/isolation, safe provider handling and exact artifact/configuration remain submission blockers. Physical behavior must be observed before submission readiness is claimed.

The original human OTP failure (422, no email) is retained at evidence/2026-09-29-h04-otp-422-original.json. Inspection found an unconfirmed, non-invited operator-created identity. Upstream Auth MagicLink routes an unconfirmed account through Signup, which is correctly disabled. The supported repair is an operator invitation and real inbox verification, followed by normal create_user:false OTP sign-in. No administrator email-confirmation bypass is used. The invitation template was saved and read back with a one-time Token and no capability link. Custom SMTP remains enabled with the existing server-side credential.

The harness separates first invitation acceptance from CAPTCHA-protected normal sign-in. Wrong code, successful verification/logout and reuse denial are checked automatically. Optional unused-code expiry runs independently and is no longer on the private-testing critical path. Its mocked browser test is not hosted expiry evidence.
