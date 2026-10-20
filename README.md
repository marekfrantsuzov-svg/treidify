# Treidify

*Your Trading Intelligence.* A native iOS trading-intelligence and performance-analytics app for XAUUSD and DXY. Treidify does not execute trades, hold funds, sell signals or give personalised investment advice.

**Status: Milestone 1 (native app foundation) is written and partly verified.** The SwiftUI app has **not been compiled or run yet**, because the build environment was Linux with no Xcode or iOS SDK. Everything that could run on Linux was run, and all of it passed. See [docs/MILESTONE_1_STATUS.md](docs/MILESTONE_1_STATUS.md).

## Repository layout

```
ios/
  project.yml                 XcodeGen spec (source of truth for the project)
  Treidify.xcodeproj          generated from project.yml (XcodeGen 2.46.0)
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
