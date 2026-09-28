# Crash SDK dependency — verification pending

This local package selects only the official Sentry 9.29.0 static XCFramework and its C++ link dependency. The version and SHA-256 come from Sentry's official `sentry-apple-binaries` 9.29.0 manifest. SDK code is not forked. Swift Package Manager must verify the complete artifact before building.

The artifact download did not complete in this implementation session. The application integration and privacy test therefore remain **uncompiled and unverified**. Do not enable reporting or promote this candidate until `swift test --package-path apps/ios`, the Release simulator build and UI journeys pass. The previous successful Swift test run predates this integration.

Source: https://github.com/getsentry/sentry-apple-binaries/blob/9.29.0/Package.swift

No DSN is configured. To activate later, configure the development Sentry project, privacy/retention and symbol upload first, then set `SIGNALWORD_CRASH_REPORTING_ENABLED=YES` and `SIGNALWORD_SENTRY_DSN` in the signed development build configuration. A signed-device crash/relaunch and an inspection of the actual received event remain required. The app does not contain a crash-test button.

The event filter builds a new event containing only numeric crash addresses, image UUIDs, build identity and fixed error text. Request payloads, capability URLs, locations, contacts, arbitrary exception text, breadcrumbs, registers and frame variables are not copied. Its serializer-level regression is included but has not yet run. This does not independently verify provider-side IP/retention configuration.
