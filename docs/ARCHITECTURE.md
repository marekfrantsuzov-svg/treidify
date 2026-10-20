# Architecture

## iOS app

```
SwiftUI features (Home, Markets, News, Performance, Coach, Onboarding, Settings)
   │  @Observable view models (@MainActor), Loadable<T> states
   ▼
AppModel ── AppSettings (UserDefaults) ── InteractionFeedbackManager
   │  picks repositories for the current mode
   ▼
TreidifyCore (Swift package, no UI imports, tested on Linux and macOS)
   ├─ Market        Instrument, Quote, Candle, Timeframe, SessionClock
   ├─ Data          DataSource, DataFreshness, FreshnessPolicy, Sourced<T>, repository protocols
   ├─ Analytics     Indicators, SwingDetector, MarketBiasEngine, LevelDetector, Fibonacci, Volatility
   ├─ Intelligence  NewsStory, EconomicEvent, MarketAdvisoryComposer, Greeting
   ├─ Performance   trades, PerformanceCalculator, CoachAnalyzer, TradingRulebook
   ├─ Feedback      FeedbackPolicy (pure decision logic)
   └─ Demo          seeded fixtures, all tagged DataSource.demoFixture
```

- **Presentation, domain and data are separated.** Views never compute analytics. View models call repositories and Core engines. Core never imports SwiftUI or UIKit.
- **Concurrency:** repositories are `Sendable` and async. View models are `@MainActor` and load in parallel with `async let`. Screens reload through `.task(id: app.dataContext)` when demo mode or the account changes.
- **Data integrity:** every value is `Sourced` (value, source, asOf). `FreshnessPolicy` maps age to Live, Delayed, Stale or Market closed, and errors map to Unavailable or Error. Without a configured provider, the `Unconfigured*` repositories throw, so the UI shows Unavailable. This behaviour is tested.
- **Swift language mode:** the app target uses Swift 5 mode with targeted concurrency checking, to keep the first compile on Xcode practical. Move to Swift 6 mode once it builds cleanly.

## Backend (planned shape; Milestone 1 ships the analytics service only)

| Component | Responsibility | Milestone |
|---|---|---|
| API (FastAPI) | Versioned REST, auth middleware, per-account authorization | 1 (analytics), 2+ |
| Auth | Verify Sign in with Apple / Google identity tokens, issue short-lived access tokens plus a rotating refresh token, account deletion and export | 2 |
| Entitlements | Free / trial / premium. Trial start comes from a verified $0 IAP transaction, with expiry enforced server-side (COMPLIANCE.md §3). StoreKit 2 JWS verification and App Store Server Notifications v2 | 2, 6 |
| Market data adapters | One adapter per licensed vendor, normalised candles, source and asOf. Provider-outage detection that feeds the freshness states | 3 |
| Intelligence ingestion | Licensed news and calendar ingestion, deduplication, classification. Event time is stored separately from publication time | 3 |
| Analytics engine | Deterministic bias, levels and performance. Parity with Swift is enforced by `shared/test-vectors` | 1 |
| Explanation service | Calls the Claude API **only with computed results and licensed text as context**. Output is checked against that context; no free-form market claims | 3, 5 |
| MT5 sync workers | History import parser first, then a connector (DATA_PROVIDERS.md) | 4 |
| Postgres | Users, identities, entitlements, accounts, trades, imports, audit_log. Row-level ownership checks on every query | 2 |
| Jobs and monitoring | Queue for ingestion and sync, structured logs, metrics, alerting, audit log of sensitive actions | 2–3 |

Security baseline: TLS only, secrets in a managed secret store, KMS encryption for MT5 investor passwords, no secrets on the device, Keychain for tokens, least-privilege service accounts, and per-account data isolation tested in M7.
