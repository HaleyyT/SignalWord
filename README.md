# SignalWord

SignalWord is a privacy-first personal safety coordination app for iPhone. Send an alert manually or through an iOS Vocal Shortcut, notify up to three consenting trusted contacts, and optionally share a recent location snapshot through a private, expiring viewer link. Server-backed check-in timers and clearly separated delivery, acknowledgement and resolution states support the same workflow.

It is not an emergency-dispatch service, does not run an app-owned always-on microphone, does not receive the private phrase or ambient audio, and must not claim delivery or live location without evidence.

## Repository layout

```text
apps/
  ios/             SwiftUI iOS app and XCTest suite
  viewer/          React/Vite contact viewer
supabase/
  migrations/      Postgres schema and RLS migrations
  functions/       Edge Functions implementing the alert API
  tests/           database and authorization tests
docs/              product, architecture, test, and release evidence
scripts/           dependency-free repository checks
tests/             fast repository automation tests
```

## Current release

Version **1.0 (8)** and the optional **SignalWord Supporter Appearance** purchase were submitted together to Apple on **1 October 2026 at 04:16 Sydney time**. Both were independently verified as **Waiting for Review**. This is submission receipt, not Apple approval or a public App Store release.

The app is configured for free download. All safety features remain free; one non-consumable Supporter purchase unlocks both Ocean and Lavender accent colours. RevenueCat manages the optional purchase and restoration.

The submitted binary was built from commit `0326ece1cd5b99e3aea1844e569ac9bb7e88b7d9`. Later repository updates may improve the website and documentation without changing the binary Apple is reviewing. See the [Build 8 handoff](docs/release-readiness/submission/BUILD8_TESTFLIGHT_HANDOFF.md) and [redacted submission evidence](docs/release-readiness/evidence/build8-2026-10-01/apple-submission-readback.json) for exact verification and remaining operational gates.

## Implementation and verification

Read the [quality roadmap and evidence matrix](docs/implementation/QUALITY_ROADMAP.md) for the implemented recovery/acknowledgement slice and remaining production blockers. Passing local tests does not mean release-ready.

The [launch guide](docs/implementation/LAUNCH_GUIDE.md) retains the historical implementation sequence. Use the current Build 8 handoff for submission status. SMS is not part of this release.

## Start here

1. Read [the planning index](docs/README.md), then complete the Day-0 gates in the [release checklist](docs/RELEASE_CHECKLIST.md).
2. Install Node.js 22, run `npm ci`, then `npm run verify`.
3. Copy `.env.example` to `.env` only for local development; never commit real credentials.
4. Configure Xcode and the local environment as described in [the iOS README](apps/ios/README.md). The build validates the backend URL, public key and intended project before producing an app.
5. Run the relevant browser, Swift and database checks documented in the component READMEs. Use controlled contacts for delivery testing; do not send unsolicited real alerts.

## Quality gates

GitHub Actions runs the fast repository verification on every push and pull request. It also performs a full-history secret scan. Before public release, the additional physical-device, RLS, delivery, and viewer tests in [the test plan](docs/TEST_PLAN.md) are mandatory.

## Environments

Only **development/test** and **production** are supported. Read [the development workflow](docs/DEVELOPMENT.md) before configuring tools or secrets.

## Documentation

The reviewed product documents take precedence over the master brief. In particular, do not publish any safety claim until its evidence is recorded in [the claims ledger](docs/CLAIMS_LEDGER.md).
