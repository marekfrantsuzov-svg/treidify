#!/usr/bin/env bash
# Checks that can run without Xcode (Linux CI or a container):
#  1. TreidifyCore unit tests (swift test)
#  2. App view-model tests compiled against TreidifyCore without SwiftUI
#  3. Syntax parse of every app Swift file (no type-checking: SwiftUI is Apple-only)
#  4. Python backend tests
# Requires a Swift 6 toolchain on PATH and python3 with backend/requirements-dev.txt.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-$(mktemp -d)}"

echo "== 1. TreidifyCore tests"
(cd "$ROOT/ios/Packages/TreidifyCore" && swift test --scratch-path "$WORK/core")

echo "== 2. View-model tests (SwiftUI-free files)"
H="$WORK/harness"; rm -rf "$H"; mkdir -p "$H/Sources/Treidify" "$H/Tests/TreidifyTests"
cp "$ROOT/ios/Treidify/Features/Home/HomeViewModel.swift" "$ROOT/ios/Treidify/App/Loadable.swift" \
   "$ROOT/ios/Treidify/DesignSystem/Formatters.swift" "$H/Sources/Treidify/"
python3 - "$ROOT/ios/TreidifyTests/HomeViewModelTests.swift" "$H/Tests/TreidifyTests/HomeViewModelTests.swift" <<'PY'
import sys
src = open(sys.argv[1]).read()
src = src[:src.index("    func testSettingsDefaultsAreRestrained")].rstrip() + "\n}\n"  # AppSettings needs SwiftUI
open(sys.argv[2], "w").write(src)
PY
cat > "$H/Package.swift" <<PKG
// swift-tools-version: 5.10
import PackageDescription
let package = Package(name: "Harness", platforms: [.macOS(.v14)],
    dependencies: [.package(path: "$ROOT/ios/Packages/TreidifyCore")],
    targets: [.target(name: "Treidify", dependencies: ["TreidifyCore"]),
              .testTarget(name: "TreidifyTests", dependencies: ["Treidify", "TreidifyCore"])])
PKG
(cd "$H" && swift test)

echo "== 3. Parse app sources"
find "$ROOT/ios/Treidify" "$ROOT/ios/TreidifyTests" "$ROOT/ios/TreidifyUITests" -name '*.swift' -print0 \
  | xargs -0 -n1 swiftc -parse

echo "== 4. Backend tests"
(cd "$ROOT/backend" && python3 -m pytest -q)
echo "All Linux checks passed."
