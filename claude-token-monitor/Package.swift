// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ClaudeTokenMonitor",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "ClaudeTokenMonitor", targets: ["ClaudeTokenMonitor"])
    ],
    targets: [
        .executableTarget(
            name: "ClaudeTokenMonitor",
            path: "Sources/ClaudeTokenMonitor",
            resources: [
                .process("../../Resources")
            ],
            swiftSettings: [
                .unsafeFlags(["-parse-as-library"])
            ]
        )
    ]
)
