# SignalWord

SignalWord is a privacy-first personal safety coordination app. A user-trained iOS Vocal Shortcut invokes a narrow App Intent that can alert one confirmed trusted contact and share the latest available location through a secure, expiring viewer link.

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

## Start here

1. Read [the planning index](docs/README.md), then complete the Day-0 gates in the [release checklist](docs/RELEASE_CHECKLIST.md).
2. Install Node.js 22 and run `npm run verify`.
3. Copy `.env.example` to `.env` only for local development; never commit real credentials.
4. Install/configure Xcode and prove the locked-device vertical slice on physical hardware before building nonessential UI.
5. When the iOS/viewer/backend implementations arrive, add their deterministic tests to the existing `npm run verify` entry point.

## Quality gates

GitHub Actions runs the fast repository verification on every push and pull request. It also performs a full-history secret scan. Before public release, the additional physical-device, RLS, delivery, and viewer tests in [the test plan](docs/TEST_PLAN.md) are mandatory.

## Environments

Only **development/test** and **production** are supported. Read [the development workflow](docs/DEVELOPMENT.md) before configuring tools or secrets.

## Documentation

The reviewed product documents take precedence over the master brief. In particular, do not publish any safety claim until its evidence is recorded in [the claims ledger](docs/CLAIMS_LEDGER.md).
