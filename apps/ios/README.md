# SignalWord iOS app

This directory contains the Swift 6/iOS 18 application and its platform-independent alert core. Keep the app target named `SignalWord`; `SafeWord` remains the legacy planning codename in existing documents.

The source layout is deliberately established before project generation:

```text
SignalWord/
  App/             app entry point and composition root
  Core/            configuration, logging, security
  Domain/          alerts, contacts, readiness, subscriptions
  Services/        API, App Intents, location, persistence, payments
  Features/        user-facing SwiftUI flows
  DesignSystem/    shared semantic UI components
  Tests/           unit and integration tests
```

## Build and verify

```sh
xcodebuild -version
xcode-select -p
swift run --package-path apps/ios SignalWordCoreVerification
xcodebuild -project apps/ios/SignalWord.xcodeproj -scheme SignalWord \
  -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

The package verifier covers durable command/idempotency behavior. The Xcode build covers the real SwiftUI app, Keychain session rotation, lifecycle API, device authentication, and locked App Intent integration.

## Environment configuration

The app fails closed when configuration is absent. Inject these user-defined build settings through the signed build/CI environment; do not commit production values:

```text
SIGNALWORD_SUPABASE_URL=https://<project-ref>.supabase.co
SIGNALWORD_SUPABASE_PUBLISHABLE_KEY=<project publishable key>
SIGNALWORD_USER_API_URL=https://<project-ref>.supabase.co/functions/v1/user-api
```

Release builds require HTTPS. The publishable key is intentionally a client-side key; a Supabase secret/service-role key must never be embedded. The app creates a marked anonymous identity once, stores rotating access/refresh tokens in ThisDeviceOnly Keychain storage, and never replaces an existing identity merely because refresh is temporarily unavailable.

Before shipping, replace the placeholder bundle ID, App Group, and development team with the owned production identifiers, then verify a clean signed install on the release iPhone. The App Group entitlement must match the App Intent host so both processes share the same durable idempotency record.
