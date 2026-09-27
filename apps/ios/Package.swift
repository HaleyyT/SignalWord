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
                "App", "DesignSystem", "SignalWord.entitlements",
                "Features/AppShell/AppShellModel.swift", "Features/AppShell/CheckInPanel.swift",
                "Features/AppShell/ContactNetworkPanel.swift", "Features/AppShell/HomeScreen.swift",
                "Features/AppShell/PeopleScreen.swift", "Features/AppShell/SettingsScreen.swift",
                "Features/AppShell/SignalWordRootView.swift", "Features/AppShell/SignalWordSetupFlow.swift",
                "Core/Configuration", "Core/Security/DeviceOwnerAuthenticator.swift",
                "Services/AlertAPI", "Services/AppIntents", "Services/Location", "Services/UserAPI",
                "Services/Auth/SignupVerificationView.swift",
            ],
            sources: ["Features/AppShell/CheckInModel.swift", "Features/AppShell/ContactNetworkModel.swift", "Core/Alerts", "Core/Security/DeviceCredentialStore.swift", "Services/Auth/SupabaseSessionManager.swift"]
        ),
        .executableTarget(
            name: "SignalWordCoreVerification",
            dependencies: ["SignalWordCore"],
            path: "Verification"
        ),
    ]
)
