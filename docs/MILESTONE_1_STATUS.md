# Milestone 1 status: native app foundation

Date: 2026-10-20

## Environment findings

| Check | Result |
|---|---|
| Xcode / `xcodebuild` | **Not available.** The build container runs Linux x86_64 (Ubuntu 24.04). |
| iOS SDK, simulator | **Not available.** |
| Swift toolchain | Swift 6.0.3 for Linux, installed from Ubuntu's archive for this work. Foundation, XCTest and Observation are available. SwiftUI, UIKit, Charts and AVFoundation are not. |
| XcodeGen | Built from source (2.46.0) and used to generate `Treidify.xcodeproj`. |
| Attached logo / dashboard reference image | **Not received.** No uploads arrived with the request. |

**What this means:** the SwiftUI app has been written but never compiled, so no claim is made that it builds, renders or behaves correctly on a device. The first step on a Mac is to open the project, build it, and fix any compile errors. Compile errors are likely to be small, because the code avoids uncommon APIs and every file passes `swiftc -parse`. They are still likely.

## Test results (actually executed)

| Suite | Where | Result |
|---|---|---|
| TreidifyCore (`swift test`) | Linux, Swift 6.0.3 | **37 / 37 passed** |
| HomeViewModel tests (compiled against TreidifyCore without SwiftUI) | Linux | **3 / 3 passed** |
| `swiftc -parse` on every app, unit-test and UI-test file | Linux | **All files parse** (syntax only, no type-checking) |
| Backend (`pytest`) | Linux, Python 3.13 | **15 / 15 passed** |
| App unit tests (`TreidifyTests`, includes the settings-defaults test) | Needs Xcode | Not run |
| UI test (`TreidifyUITests`) | Needs simulator | Not run |
| SwiftUI previews | Needs Xcode | Not rendered |

The Swift and Python analytics engines are both checked against the same JSON vectors (`shared/test-vectors`), and the expected values in those vectors were worked out by hand.

## Milestone 1 checklist

| Item | State |
|---|---|
| Real Xcode project | Done: XcodeGen spec plus generated `.xcodeproj`. App target, unit-test target, UI-test target, local Swift package. |
| Treidify branding | Wordmark and tagline are typeset. **The logo artwork is missing**, so the asset slots stay empty and no substitute is drawn (see BRAND_ASSETS.md). |
| App icon | **Blocked on the logo.** The slots (default, dark, tinted) exist, and `tools/make_app_icon.py` builds all three from the approved symbol. The pipeline was tested on a synthetic shape. |
| Dark and light themes | Done: separate token values per mode, AA-contrast text, and Reduce Transparency fallbacks. Not visually verified. |
| Premium glass design system | Done: `GlassCard` (material with tint, or Liquid Glass on iOS 26 with Xcode 26), inset surfaces, ambient background, buttons, pills, badges. Not visually verified. |
| Main dashboard | Done: greeting, data-driven advisory with an expandable basis, XAUUSD/DXY tiles with sparklines and freshness, session status, 4H/1H/15M/5M bias matrix, macro interpretation shown separately as unavailable, interactive chart with zones, MT5 summary or connect card, news preview, rule-based insight, disclaimer. |
| Navigation | Done: five tabs (Home, Markets, News, Performance, AI Coach). Settings, rulebook and story detail open in context. |
| Interactive chart components | Done: candlesticks with drag-to-inspect OHLC readout, timeframe switching, conditional S/R and liquidity zones, sparkline, equity curve, VoiceOver summaries. |
| Onboarding | Done: welcome, features, a risk disclosure that must be acknowledged (versioned), preferences. |
| Sounds and haptics | Done: `InteractionFeedbackManager` plus a unit-tested `FeedbackPolicy`. Seven original synthesised sounds. Sounds are off by default, use the ambient audio session and are silenced by the silent switch. They are muted under VoiceOver and throttled. Haptics and sounds have separate toggles. |
| Clearly labelled demo fixtures | Done: every demo value carries `DataSource.demoFixture`, and the UI shows a DEMO badge or banner. Turning demo mode off shows honest Unavailable states, which are tested. |
| SwiftUI previews | Written for every screen, light and dark. Not rendered. |

## Beyond Milestone 1 (built early, deterministic only)

Markets analysis (bias rationale, invalidation, levels, Fibonacci, volatility), the economic calendar with forecast-vs-actual explanations, the nine-part story detail, the full performance dashboard, coach observations with sample-size thresholds, and the rulebook. All of these run on demo data only. No licensed provider, MT5 connection or LLM is integrated.

## Not done / outstanding

1. **Compile, run and fix on a Mac**, then render the previews and run the unit and UI tests.
2. **Approved logo files** (symbol PNG/PDF/SVG, wordmark), then generate the icon.
3. **Dashboard reference image**, to compare visually with the benchmark and tune spacing and colour.
4. Real-device testing: performance, haptics feel, sound levels, Dynamic Type at the largest sizes, VoiceOver pass.
5. Everything in Milestones 2 to 7. The trial design needs an App Store decision first (see COMPLIANCE.md §3).
