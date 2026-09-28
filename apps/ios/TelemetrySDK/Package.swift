// swift-tools-version: 6.0
import PackageDescription

// Pin the official artifact and checksum without fetching unused platform variants.
let package = Package(
    name: "TelemetrySDK",
    platforms: [.iOS(.v18), .macOS(.v14)],
    products: [.library(name: "SignalWordSentry", targets: ["Sentry", "LinkRuntime"])],
    targets: [
        .binaryTarget(name: "Sentry", url: "https://github.com/getsentry/sentry-cocoa/releases/download/9.29.0/Sentry.xcframework.zip", checksum: "63fe5a7258097fded9ef485bbb1d8e80e1e91d419ee6d8a6ad405454b5b50fef"),
        .target(name: "LinkRuntime", linkerSettings: [.linkedLibrary("c++")])
    ]
)
