# Treidify

*Your Trading Intelligence.* A native iOS trading-intelligence and performance-analytics app for XAUUSD and DXY. Treidify does not execute trades, hold funds, sell signals or give personalised investment advice.

**Test it without Xcode:** download the Mac DMG or the iPhone IPA from the **Test builds** workflow. See [docs/INSTALL_TEST_BUILDS.md](docs/INSTALL_TEST_BUILDS.md). **With Xcode:** see [docs/RUN_ON_MAC.md](docs/RUN_ON_MAC.md). Open `ios/Treidify.xcodeproj` in Xcode and press ⌘R. A free Apple ID is enough to install it on your own iPhone.

**Status: Milestone 1.** On every push, CI builds the committed Xcode project on macOS with Xcode 26, for the Simulator and for a device, and also checks that it builds with Xcode 16. It runs 37 core tests, 4 app tests and 1 UI test. See [docs/MILESTONE_1_STATUS.md](docs/MILESTONE_1_STATUS.md).

## Repository layout

```
ios/
  Treidify.xcodeproj          open this in Xcode (committed; no XcodeGen needed)
  project.yml                 XcodeGen spec; regenerate the project only after adding or removing files
  Packages/TreidifyCore/      platform-independent domain logic + 37 unit tests
  Treidify/                   SwiftUI app
    App/                      entry point, AppModel, settings, tabs
    DesignSystem/             colour tokens, glass surfaces, components, formatters
    Brand/                    brand mark + wordmark views (load the approved artwork)
    Charts/                   candlestick, sparkline, equity curve (Swift Charts)
    Feedback/                 InteractionFeedbackManager (sounds + haptics)
    Features/                 Home, Markets, News, Performance, Coach, Onboarding, Settings
    Resources/                Assets.xcassets, original sounds, Info.plist, privacy manifest
  TreidifyTests/              app unit tests (view models, settings)
  TreidifyUITests/            onboarding + navigation UI test
backend/                      Python (FastAPI) analytics API + 15 tests
shared/test-vectors/          JSON vectors both the Swift and Python engines must match
tools/                        vector, sound and app-icon generators; Linux check script
docs/                         architecture, analytics, compliance, providers, brand assets
```

## Open and run (macOS)

Requirements: Xcode 16 or later (Xcode 26+ enables the Liquid Glass surfaces), iOS 17+ simulator or device.

```bash
cd ios
brew install xcodegen      # optional; the generated project is committed
xcodegen generate          # regenerate after changing project.yml
open Treidify.xcodeproj
```

Set your team under Signing & Capabilities (`DEVELOPMENT_TEAM` in `project.yml`), then run the **Treidify** scheme. Product > Test runs the core, app and UI tests.

Before release, add the approved logo files as described in [docs/BRAND_ASSETS.md](docs/BRAND_ASSETS.md).

## Checks that run without Xcode

```bash
tools/linux_checks.sh   # core tests, view-model tests, Swift parse of all app files, backend tests
```

## Documentation

- [Milestone 1 status](docs/MILESTONE_1_STATUS.md): what was built, what was verified, and what remains outstanding
- [Architecture](docs/ARCHITECTURE.md): layers, backend plan, security, MT5 feasibility
- [Analytics](docs/ANALYTICS.md): exact bias, level, volatility and performance formulas
- [Design system](docs/DESIGN_SYSTEM.md): tokens, glass, motion, sound and haptics rules
- [Compliance](docs/COMPLIANCE.md): App Store and financial-regulation items that need review
- [Data providers and dependencies](docs/DATA_PROVIDERS.md): licensing findings and every external service, key and account
- [Brand assets](docs/BRAND_ASSETS.md): logo slots and the icon pipeline
