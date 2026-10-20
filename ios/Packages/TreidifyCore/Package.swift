// swift-tools-version: 5.10
// TreidifyCore: platform-independent domain logic for Treidify.
// No UIKit/SwiftUI imports are allowed here so the package builds and tests on
// macOS, iOS and Linux (CI) alike.
import PackageDescription

let package = Package(
    name: "TreidifyCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "TreidifyCore", targets: ["TreidifyCore"])
    ],
    targets: [
        .target(
            name: "TreidifyCore",
            swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
        ),
        .testTarget(
            name: "TreidifyCoreTests",
            dependencies: ["TreidifyCore"]
        )
    ]
)
