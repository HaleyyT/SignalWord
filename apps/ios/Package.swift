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
            path: "SignalWord/Core/Alerts"
        ),
        .executableTarget(
            name: "SignalWordCoreVerification",
            dependencies: ["SignalWordCore"],
            path: "Verification"
        ),
    ]
)
