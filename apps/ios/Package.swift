// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "SignalWordCore",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "SignalWordCore", targets: ["SignalWordCore"]),
        .executable(name: "SignalWordCoreVerification", targets: ["SignalWordCoreVerification"]),
    ],
    targets: [
        .testTarget(name: "SignalWordCoreTests", dependencies: ["SignalWordCore"], path: "Tests"),
        .target(
            name: "SignalWordCore",
            path: "SignalWord",
            exclude: [
                "App", "DesignSystem", "Features", "SignalWord.entitlements",
                "Core/Configuration", "Core/Security/DeviceOwnerAuthenticator.swift",
                "Services/AlertAPI", "Services/AppIntents", "Services/Location", "Services/UserAPI",
                "Services/Auth/SignupVerificationView.swift",
            ],
            sources: ["Core/Alerts", "Core/Security/DeviceCredentialStore.swift", "Services/Auth/SupabaseSessionManager.swift"]
        ),
        .executableTarget(
            name: "SignalWordCoreVerification",
            dependencies: ["SignalWordCore"],
            path: "Verification"
        ),
    ]
)
