# Vercel development deployment

This deploys the recipient website and its API proxies. It does not deploy the
Supabase database, Edge Functions, email worker, or iPhone app. It is a development
deployment, not a public-safety release sign-off.

## Configure the Vercel project

Import `HaleyyT/SignalWord`, using `main` after the reviewed changes are pushed.

| Setting | Value |
|---|---|
| Project name | `signalword-dev` |
| Framework | Vite |
| Root directory | `apps/viewer` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | Automatic npm workspace detection |
| Node.js | 22.x |

Set these server-side environment variables to the **development** backend:

```text
SIGNALWORD_PUBLIC_EVENT_ORIGIN=https://YOUR_DEV_PROJECT_REF.supabase.co/functions/v1/public-event
SIGNALWORD_CONTACT_CONFIRM_ORIGIN=https://YOUR_DEV_PROJECT_REF.supabase.co/functions/v1/contact-confirm
```

Do not prefix these names with `VITE_`. The viewer needs neither a Supabase
service-role key nor a Resend API key. Keep the repository root lockfile available
to Vercel's monorepo build. Configure production and preview variables explicitly
if both deployment types will be tested; both should use development resources in
this development-only Vercel project.

## Before testing real links

1. Confirm that the Vercel deployment uses the intended `main` commit. Local files
   and commits that have not been pushed are not included in a GitHub import.
2. Apply the repository's migrations to the identified development Supabase project
   before deploying the functions that use them. Review a migration dry run first.
3. Deploy `user-api`, `public-event`, `contact-confirm`, `deletion-status`,
   `dispatch-deliveries`, and `resend-webhook`, preserving `supabase/config.toml`.
4. Configure backend secrets, the Resend sender and signed callback, and both Vault
   scheduling entries using [the launch guide](LAUNCH_GUIDE.md). These settings do
   not belong in the viewer's environment.
5. Set backend `PUBLIC_VIEWER_BASE_URL` and `PUBLIC_CONFIRMATION_BASE_URL` to the
   deployed viewer's HTTPS origin, then verify generated links use that origin.
6. Run the hosted check with the actual viewer origin:

   ```bash
   SIGNALWORD_VIEWER_ORIGIN=https://YOUR_DEVELOPMENT_VIEWER npm run release:hosted
   ```

   This exercises unavailable-token GET/POST routes and security headers without
   sending an alert. A failed API check can indicate an undeployed or misconfigured
   backend even when Vercel successfully built the website.
7. With a consenting recipient, run a TEST through confirmation, delivery,
   acknowledgement, app relaunch, resolution, and deletion. Do not use a REAL
   emergency to validate the deployment.

## Remaining release gates

A successful Vercel deployment does not close Step 2. Independently durable
deletion/withdrawal records, an enforced restore gate and restore drill, production
crash reporting, complete API specification coverage, and real hosted/provider/
device/operator evidence remain separate requirements. See
[the Step 2 report](STEP2_REPAIR_REPORT.md).

## Local checks before the initial development push

On 27 September 2026, the current viewer passed 91 Node tests, 43 viewer unit
tests, the production build, and browser acknowledgement/retry/unavailable-link
checks at 320 pixels against both the development server and built production
assets. Browser responses were controlled fixtures, not a hosted backend.

All six deployable Edge Functions passed actual Deno type checking. The database
passed 177 pgTAP assertions across eight suites. Local Docker Desktop required
excluding the Edge Runtime container and using the existing test mount fallback;
this does not establish local or hosted Edge Runtime execution. The production
dependency audit reported no known vulnerabilities.

The iOS core passed 16 Swift tests and its verification executable. Review caught
failures in the in-progress hold/confirmation control: competing recognizers and
an inaccessible hold surface. The repair separates the hold action from an
explicit review button, exposes the hold surface as one accessibility element,
and uses a native confirmation alert with Cancel. Regression tests exercise
both early release and completed hold, review cancellation and confirmed sending,
relaunch recovery, resolution, deletion, draft preservation, and withdrawal.

All four application journeys passed together on the iPhone 17e simulator
(iOS 27.0); see [the test summary](evidence/2026-09-27-deployment-ui-summary.json).
The final Release simulator build passed. Simulator service fixtures cannot
establish physical-device authentication, locked Vocal Shortcut behavior, or live
email delivery. Earlier failed test runs and a test-runner interruption are not
counted as successful verification.
