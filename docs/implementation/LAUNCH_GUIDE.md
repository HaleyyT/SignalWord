# SignalWord: step-by-step guide to a dependable release

This guide covers the remaining production deployment, physical-device testing,
SMS, pilot evidence, and engineering hardening. Completing setup alone does not
establish a 97/100 standard: we need recorded evidence that the complete system
works and recovers correctly. Checkboxes below are tasks, not claims of completion.

## 1. Understand the order and responsibilities

Follow this sequence:

**Finish critical engineering → deploy development environment → test real devices
→ prepare production → run invited email pilot → implement and validate SMS
→ assess public release.**

| Responsibility | Owner |
|---|---|
| Code, automated tests, deployment configuration, technical investigation | Engineer / Codex |
| Account ownership, domain, billing, Apple signing, provider registration | You |
| Physical-device trials and usability sessions | You and recruited testers |
| Production monitoring, incidents, release decisions | You, supported by engineering |

Start with one consenting contact and email delivery. Keep public enrollment closed
until the release gates pass. The [quality roadmap](QUALITY_ROADMAP.md) defines
scope and acceptance targets; this guide explains execution. Record results in
[release evidence](../RELEASE_EVIDENCE.md).

## 2. Prepare accounts and finish the engineering prerequisites

### Step 1 — Gather the required accounts

Create or confirm access to:

- [ ] Apple Developer account and App Store Connect.
- [ ] Supabase account.
- [ ] Vercel account for the recipient website.
- [ ] Resend account for email delivery.
- [ ] A domain you own and access to its DNS settings.
- [ ] A working support email address.
- [ ] Your iPhone and a second device for the recipient.
- [ ] Twilio account for the later SMS phase.

Maintain two persistent environments: **development/test** and **production**.
Give each its own Supabase project, configuration, and secrets.

Record these nonsecret identifiers:

```text
Development Supabase project reference:
Production Supabase project reference:
Development viewer URL:
Production viewer URL:
Verified email sender:
Apple Team ID:
Development bundle ID and App Group:
Production bundle ID and App Group:
Support email:
```

Keep API secrets, encryption keys, signing credentials, and database passwords in
a password manager or provider secret storage.

**Done when:** you can access each account and identify development and production
resources without ambiguity.

### Step 2 — Close the engineering blockers

These require code changes or technical verification; account setup will not solve them.

| Work | Required result |
|---|---|
| Hosted viewer routing | Event GET and acknowledgement POST reach the hosting function |
| Ambiguous delivery recovery | Provider records are reconciled before uncertain messages are resent |
| Interrupted deletion | Losing the server response does not leave deletion permanently unresolved |
| Contact consent and withdrawal | Replacement, resend, and withdrawal work; withdrawal prevents unclaimed and future sends |
| Full iOS journey tests | Setup, recovery, resolution, and deletion run through the application |
| API contracts | Swift and TypeScript consume the same validated examples |
| Restore protection | Restoring a backup cannot reopen deleted access or blindly resend old alerts |
| Deployment and monitoring | Configuration is validated and failures reach the operator |

**Specific issue identified when this guide was written:** the viewer calls
`/v1/public/events/:token`, while the hosting function is under
`/api/v1/public/events/:token`. Add a rewrite preserving the existing public URL,
then test both GET and POST against the deployed website.

Withdrawal cannot retract a message already submitted to the provider. Explain
that boundary in recipient-facing copy and test races with in-flight sends.

Use the [quality roadmap](QUALITY_ROADMAP.md) as the remaining engineering checklist.
Read the [Step 2 repair report](STEP2_REPAIR_REPORT.md) for current fixes, verification,
and the gates that still need evidence.
Engineering fixes may be developed and tested in the development environment;
they must pass before production pilot enrollment.

**Done when:** each critical repair has a regression test and no unresolved
safety-critical defect remains.

### Step 3 — Run local verification

Install Node.js 22, a compatible Xcode with Swift 6 and iOS 18+ support, and Docker
Desktop. Open Docker Desktop. In Terminal, run these commands from the repository:

```bash
cd "/Users/haleytran/Desktop/Projects/SignalWord"

npm ci
npm run verify

npx supabase start
npx supabase migration up --local
npm run test:db

swift test --package-path apps/ios
swift run --package-path apps/ios SignalWordCoreVerification

npx playwright install chromium
npm run test:browser --workspace=@signalword/viewer
```

If your checkout is elsewhere, change the first path. Then check the simulator build:

```bash
xcodebuild \
  -project apps/ios/SignalWord.xcodeproj \
  -scheme SignalWord \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO \
  build
```

If a command fails, record the failure and fix it before continuing. Browser tests
with mocked responses do not prove live provider delivery.

**Done when:** all checks pass for the exact commit intended for deployment.

## 3. Deploy and test the development environment

### Step 4 — Prepare Supabase and Resend

In the development Supabase project:

1. Enable anonymous sign-ins, which the current app uses.
2. Record the project URL and publishable key.
3. Confirm the database version is compatible with the repository configuration.
4. Keep production resources separate.

In Resend:

1. Add your sending domain.
2. Add the DNS records supplied by Resend.
3. Wait until Resend reports the domain as verified.
4. Choose the sender address.
5. Create an API key.

Follow [Resend’s domain verification instructions](https://resend.com/docs/dashboard/domains/introduction).

### Step 5 — Configure backend secrets

Use Supabase’s Edge Function secret settings. Refer to
[.env.example](../../.env.example) for the complete configuration.

| Setting | Value |
|---|---|
| `APP_ENV` | `development` for development/test; `production` for production |
| `DELIVERY_PROVIDER` | `resend` for live delivery tests and production |
| `RESEND_API_KEY` | Your Resend API key |
| `RESEND_FROM_EMAIL` | Sender on your verified domain |
| `RESEND_WEBHOOK_SECRET` | Signing secret from the webhook created in Step 7 |
| `PUBLIC_VIEWER_BASE_URL` | Environment’s HTTPS viewer root, without `/events` |
| `PUBLIC_CONFIRMATION_BASE_URL` | Environment’s HTTPS viewer root, without `/confirm` |
| `DISPATCH_SECRET` | Independent random secret, at least 32 characters |
| `DELIVERY_PAYLOAD_KEY` | Independent random 32-byte base64url key |
| `DESTINATION_ENCRYPTION_KEY` | Different random 32-byte base64url key |
| `DESTINATION_FINGERPRINT_KEY` | Different random 32-byte base64url key |
| `DELIVERY_PAYLOAD_KEY_VERSION` | `1` for the initial key set |
| `DESTINATION_KEY_VERSION` | `1` for the initial key set |

Have engineering generate the keys securely and store recoverable copies in your
password manager. Do not regenerate encryption keys during routine deployment.
Do not put server secrets into iOS settings or browser environment variables.

Also create these **Supabase Vault** entries:

```text
signalword_backend_url
  = https://YOUR_PROJECT_REF.supabase.co

signalword_dispatch_secret
  = the exact same value as DISPATCH_SECRET
```

The scheduled worker uses Vault, not just Edge Function secrets. Missing Vault
values currently cause scheduled dispatch to do nothing. See
[Supabase’s scheduling documentation](https://supabase.com/docs/guides/functions/schedule-functions).

Finish the webhook secret in Step 7 before sending live tests.

### Step 6 — Deploy the database and backend

Replace `YOUR_DEV_PROJECT_REF` before running:

```bash
npx supabase login
npx supabase link --project-ref YOUR_DEV_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
```

Check the linked project and proposed migrations. Then:

```bash
npx supabase db push

npx supabase functions deploy user-api --project-ref YOUR_DEV_PROJECT_REF
npx supabase functions deploy public-event --project-ref YOUR_DEV_PROJECT_REF
npx supabase functions deploy contact-confirm --project-ref YOUR_DEV_PROJECT_REF
npx supabase functions deploy dispatch-deliveries --project-ref YOUR_DEV_PROJECT_REF
npx supabase functions deploy resend-webhook --project-ref YOUR_DEV_PROJECT_REF
npx supabase functions deploy deletion-status --project-ref YOUR_DEV_PROJECT_REF
```

Preserve endpoint authentication settings in `supabase/config.toml`. Do not disable
authentication globally. Check scheduled dispatch execution after configuration.

Never run a database reset against a deployed environment. These commands follow
the [Supabase deployment workflow](https://supabase.com/docs/guides/functions/deploy).

### Step 7 — Connect delivery callbacks

Create a Resend webhook pointing to:

```text
https://YOUR_DEV_PROJECT_REF.supabase.co/functions/v1/resend-webhook
```

Subscribe to the supported events:

```text
email.sent
email.delivered
email.bounced
email.complained
email.failed
email.delivery_delayed
```

Store its signing secret as `RESEND_WEBHOOK_SECRET`. Verify that a genuine signed
callback succeeds and an invalid signature is rejected. See
[Resend’s webhook documentation](https://resend.com/docs/webhooks/introduction).

### Step 8 — Deploy the recipient website

Create a Vercel project using:

```text
Root directory: apps/viewer
Framework: Vite
Build command: npm run build
Output directory: dist
```

Ensure the monorepo installation uses the repository lockfile. Configure these
server-side environment variables for the matching environment:

```text
SIGNALWORD_PUBLIC_EVENT_ORIGIN
https://YOUR_DEV_PROJECT_REF.supabase.co/functions/v1/public-event

SIGNALWORD_CONTACT_CONFIRM_ORIGIN
https://YOUR_DEV_PROJECT_REF.supabase.co/functions/v1/contact-confirm
```

Deploy after fixing the routing issue in Step 2. Use
[Vercel’s Vite deployment documentation](https://vercel.com/docs/frameworks/frontend/vite).

Check:

- [ ] Confirmation links work on a phone.
- [ ] Event links work when opened directly.
- [ ] Acknowledgement works through the hosted API.
- [ ] Opening or previewing a link does not acknowledge it.
- [ ] Expired links show a useful message.
- [ ] HTTPS security headers are present.
- [ ] Logs and analytics do not retain capability tokens or exact locations.

**Done when:** the hosted website works with the live development backend, without
mocked network responses.

### Step 9 — Install a signed iPhone build

Open `apps/ios/SignalWord.xcodeproj` in Xcode.

1. Select your Apple development team.
2. Configure owned bundle and App Group identifiers.
3. Ensure the App Group matches the entitlements and app configuration.
4. Set these build settings using the development project:

```text
SIGNALWORD_SUPABASE_URL
SIGNALWORD_SUPABASE_PUBLISHABLE_KEY
SIGNALWORD_USER_API_URL
```

The API URL is:

```text
https://YOUR_DEV_PROJECT_REF.supabase.co/functions/v1/user-api
```

5. Connect your iPhone and install the app.
6. Enable Developer Mode if Xcode requires it.
7. Launch the installed app from the Home Screen for background and locked-device testing.

Apple notes that an attached debugger changes suspension behavior, so debugger-only
success is insufficient. See
[testing a release build](https://developer.apple.com/documentation/xcode/testing-a-release-build).

### Step 10 — Complete one live journey

Use a consenting recipient who knows a test is happening.

1. Set your display name.
2. Add the recipient.
3. Have them explicitly confirm consent.
4. Trigger a **TEST** alert.
5. Confirm server acceptance.
6. Check provider acceptance and delivery callback separately.
7. Open the received link on the second device.
8. Press **Acknowledge**.
9. Confirm acknowledgement appears in the sender app.
10. Close and reopen the sender app.
11. Confirm the alert remains available.
12. Resolve it and verify the recipient view updates.

Repeat using the separately named TEST Vocal Shortcut while locked. Use different
phrases for TEST and REAL. Rehearsal evidence must reference two distinct acknowledged
TEST events; a repeated invocation returning the same event counts only once.

**Done when:** the entire journey works, including relaunch and resolution.
Provider acceptance alone is not a pass. Acknowledgement is a link action, not a
promise that help is coming.

## 4. Collect device evidence and run the email pilot

### Step 11 — Test interruptions deliberately

Run these scenarios in development. Arrange any REAL-path tests in advance with
the consenting recipient so that they understand the message is a supervised trial.

| Scenario | Expected behavior |
|---|---|
| Trigger offline, reconnect within ten minutes | Original command recovers at a permitted execution opportunity without duplicate acceptance; open the app to exercise foreground recovery |
| Reconnect after ten minutes | App reconciles possible server acceptance; a genuinely unsent delayed command requires confirmation |
| Close app after server acceptance | Relaunch recovers canonical alert status |
| Trigger TEST while REAL work is pending | REAL work remains intact |
| Deny location access | Manual alert remains available |
| Network fails during acknowledgement | Clear retry state; repeat acknowledgement is safe |
| Session expires | Refresh recovers or the app shows an actionable error |
| Worker/provider times out | Outcome stays honest; uncertain acceptance is reconciled |
| Contact withdraws consent | Unclaimed/future deliveries are invalidated; already submitted sends cannot be retracted |
| Device restarts before first unlock | Behavior and limitations are recorded accurately |

Also test VoiceOver, large text, low power mode, poor connectivity, different
supported iOS versions, and small recipient screens. Background execution is not
guaranteed; record when recovery required opening the app.

For every trial, record:

```markdown
- Trial ID:
- App build / commit:
- Environment:
- Device and iOS version:
- Scenario:
- Expected result:
- Actual result:
- Pass / fail:
- Redacted event or request reference:
- Defect and retest reference:
```

Do not include live recipient links, contact details, or exact coordinates.

Target at least **300 recorded device trials**, including failures and retests.
Record locked execution as user-reported evidence. Report scenario coverage and
sample limitations; a trial count alone does not establish population reliability.

### Step 12 — Prepare production operations

Before enrolling testers:

1. Configure separate production secrets, domain settings, and webhook.
2. Explicitly link the production project and repeat the reviewed deployment steps
   using production references. Promote the tested database, function, and viewer versions.
3. Enable monitoring for acceptance errors, queue age, unknown outcomes, callbacks,
   schedules, and crashes.
4. Route operational alerts to someone responsible for responding.
5. Run a dedicated synthetic TEST with a consenting test recipient.
6. Rehearse rollback while keeping additive database migrations.
7. Restore a backup into an isolated environment with outbound delivery disabled.
8. Reconcile previously sent messages and deleted access before enabling restored
   processing or public access.

Measure recovery against **RPO ≤15 minutes** and **RTO ≤60 minutes**. RPO is tolerated
data loss; RTO is restoration time. Backup availability alone does not prove either
target. Select a backup configuration capable of meeting the targets, then demonstrate it.

Use the [operations runbook](OPERATIONS.md).

### Step 13 — Run the invited email pilot

1. Upload the signed production-configured build to App Store Connect.
2. Distribute through TestFlight, completing Apple’s external-testing review where required.
3. Invite **20–30 consenting adults**.
4. Explain the app’s limitations and support process.
5. Observe **20 unfamiliar users** attempting setup without coaching.
6. Run the pilot for at least **30 days**.
7. Review failures and support requests daily.
8. Fix serious defects before expanding enrollment.

See the [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).

Measure:

- Setup completion: target at least **18/20 unaided**, excluding recipient waiting time.
- Whether users distinguish TEST, REAL, delivery, and acknowledgement.
- Acceptance latency, delivery failures, and acknowledgement.
- Recovery success and crash rate.
- Accessibility problems, support burden, and messaging cost.

Do not ask testers to rely on an unfinished app during actual emergencies.

**Done when:** the observation period is complete, serious defects are resolved,
and results are tied to identifiable builds. Extend observation if the sample is
too small to support the reliability claims being assessed.

## 5. Add SMS and make the release decision

### Step 14 — Implement Australian SMS

**SMS requires additional engineering. Adding Twilio credentials will not enable it.**

Proceed in this order:

1. Complete Twilio account and Australian sender onboarding.
2. Confirm the sender type and current registration requirements.
3. Implement phone verification and explicit recipient consent.
4. Add a working withdrawal mechanism.
5. Implement the Twilio provider adapter.
6. Keep email and SMS delivery records independently retryable.
7. Validate signed callbacks and out-of-order updates.
8. Define recovery for ambiguous sends without assuming email-provider idempotency behavior.
9. Test actual Australian carrier paths and recipient devices.
10. Measure message cost and provider throughput.
11. Enable SMS for a small consenting group before broader rollout.

For branded alphanumeric senders, do not assume replying STOP provides automatic
withdrawal; implement a supported opt-out path. Follow
[Twilio’s Australian guidance](https://www.twilio.com/en-us/guidelines/au/sms) and
[sender-ID documentation](https://www.twilio.com/docs/messaging/services/alphanumeric-sender-ids-in-messaging-services).
Recheck provider requirements when onboarding; they can change.

### Step 15 — Review release evidence

Public launch requires all of the following:

- [ ] No unresolved P0/P1 defects.
- [ ] No unresolved critical/high security findings.
- [ ] Behavioral coverage of all safety-critical transitions.
- [ ] Physical-device evidence and usability results.
- [ ] Measured service availability and latency.
- [ ] Validated SMS consent, delivery, withdrawal, and recovery.
- [ ] Successful rollback and restore exercises.
- [ ] Working monitoring, support, and incident ownership.
- [ ] Load testing at twice the next growth stage’s forecast peak.
- [ ] Evidence tied to the released build and configuration.

Evaluate the [roadmap’s acceptance targets](QUALITY_ROADMAP.md#acceptance-targets-not-current-claims):
99.9% service availability; connected acceptance p95 ≤2 seconds; provider acceptance
p95 ≤5 seconds; viewer usable content p75 ≤2.5 seconds; crash-free sessions ≥99.9%.
Document the measurement window, sample size, test profile, exclusions, and failures.
Provider acceptance is not inbox delivery or human acknowledgement.

Assess each release-critical area independently. Missing evidence remains a
blocker to 97/100, even when automated tests pass.

**Your first practical milestone:** one signed iPhone build sends a TEST through
the development backend, a real recipient acknowledges it, and the sender can
relaunch and resolve it successfully.
