# SignalWord

A private phrase. A trusted response.

Need help to alert your people in difficult cases? SignalWord helps you reach the people you trust when unlocking your phone or navigating an app may not be practical. Trigger a discreet alert with Apple Vocal Shortcuts, notify up to three trusted contacts, share an optional location snapshot, use safety check-ins, and see exactly what has been sent, delivered, acknowledged and resolved.

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
scripts/           dependency-free repository checks
tests/             fast repository automation tests
```

## Current release

Version **1.0 (8)** and the optional **SignalWord Supporter Appearance** purchase were submitted together to Apple on **1 October 2026 at 04:16 Sydney time**. Both were independently verified as **Waiting for Review**. This is submission receipt, not Apple approval or a public App Store release.

The app is configured for free download. All safety features remain free; one non-consumable Supporter purchase unlocks both Ocean and Lavender accent colours. RevenueCat manages the optional purchase and restoration.

The submitted binary was built from commit `0326ece1cd5b99e3aea1844e569ac9bb7e88b7d9`. Later repository updates may improve the website and documentation without changing the binary Apple is reviewing. Release evidence and operational gates are retained privately by the maintainer.

## Implementation and verification

The recovery/acknowledgement slice is implemented. Passing local tests does not mean release-ready; production evidence is maintained privately.

SMS is not part of this release.

## Start here

1. Complete the applicable private release checklist with the maintainer before deploying.
2. Install Node.js 22, run `npm ci`, then `npm run verify`.
3. Copy `.env.example` to `.env` only for local development; never commit real credentials.
4. Configure Xcode and the local environment as described in [the iOS README](apps/ios/README.md). The build validates the backend URL, public key and intended project before producing an app.
5. Run the relevant browser, Swift and database checks documented in the component READMEs. Use controlled contacts for delivery testing; do not send unsolicited real alerts.

## Quality gates

GitHub Actions runs the fast repository verification on every push and pull request. It also performs a full-history secret scan. Before public release, additional physical-device, RLS, delivery, and viewer tests are mandatory.

## Environments

Only **development/test** and **production** are supported. Use the component READMEs and `.env.example` when configuring tools; never commit real secrets.

## Documentation

Internal planning, rules and release documents in `docs/` are private local files and are excluded from Git. Public setup documentation remains in this README and the component READMEs. Safety claims require supporting evidence recorded in the private claims ledger.
