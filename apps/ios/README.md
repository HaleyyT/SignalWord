# SignalWord iOS app

This directory will contain the Xcode project after the Day-0 toolchain and signing gates pass. Keep the app target named `SignalWord`; `SafeWord` remains the legacy planning codename in existing documents.

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

## Toolchain gate

Do not create or commit a generated Xcode project until these commands pass and a signed blank app runs on the target phone:

```sh
xcodebuild -version
xcode-select -p
```

Use Swift 6 with the iOS 18 deployment target. The eventual project must expose the narrow `TriggerAlertIntent` and keep its alert coordinator protocol-driven so it can be unit-tested without system UI.
