# Data providers, licensing and external dependencies

No provider is integrated or contracted yet. Nothing here should be read as a claim that an API offers what is described. Every candidate must be checked against its current terms, especially terms on **redistribution to end users**, **display in a commercial mobile app**, **derived data** and **AI summarisation**.

## Findings on the services named in the spec

**Bloomberg.** Terminal data and Bloomberg News cannot be redistributed in a consumer app without an enterprise agreement (B-PIPE / Data License / content licensing). These are priced for institutions. Scraping or summarising Bloomberg articles commercially without a licence is not permitted. *Recommendation: do not plan V1 around Bloomberg.*

**Forex Factory.** There is no official public API. Scraping its calendar or forum content and redistributing it in an app is not authorised, and Treidify must not do it. *Recommendation: do not use it.*

## Requirements by data type

| Data | Notes | Candidate sources to evaluate |
|---|---|---|
| XAUUSD prices / candles | OTC spot. Feeds are vendor-specific and usually need a display licence for end users. | FX/metals data vendors with mobile display rights (e.g. Twelve Data, Finnhub, Tiingo FX, OANDA exchange-rate data, LSEG, ICE Data Services). Compare latency, history depth and redistribution fees. |
| DXY | **"US Dollar Index" and "DXY" are ICE trademarks.** Real-time index values come from ICE (index licence, or ICE Futures US "DX" futures data). | ICE Data Services licence, or a vendor that holds ICE redistribution rights. Alternatively, show a self-computed basket and give it a different name. |
| LBMA Gold Price | A benchmark administered by IBA and licensed separately. | Only if the benchmark itself is displayed. |
| Economic calendar: schedule and actuals | US releases (BLS, BEA, Census, Federal Reserve) are public. Schedules and actual figures from official sources can be used, with attribution. | Official agency calendars and APIs (BLS, BEA, FRED for history). |
| Economic calendar: consensus forecasts | **Proprietary.** Forecasts require a licensed vendor. | Trading Economics API, Finnhub, FXStreet or LSEG calendars (licence terms vary). |
| News | Commercial display and AI summarisation of articles need a content licence. Headline-plus-link display has its own terms. | LSEG/Reuters, Dow Jones Newswires, Benzinga, Marketaux and similar. Official sources (Fed statements, Treasury releases) are public domain. |
| Treasury yields | US Treasury publishes daily par yield curves (public). Intraday yields need a vendor. | treasury.gov, FRED (daily), vendors for intraday. |

The adapter interfaces are already in place (`MarketDataRepository`, `IntelligenceRepository` in TreidifyCore). Each licensed adapter must fill in `DataSource.attribution` and return accurate `asOf` times so the freshness states are correct.

## MetaTrader 5 connection options

The iOS app **cannot** run the MetaTrader5 Python package. That package needs a Windows MT5 terminal process.

| Option | How it works | Trade-offs |
|---|---|---|
| A. History-file import (fallback, build first) | The user exports a report from MT5 (Toolbox > History > Report, HTML/XLSX) and imports it in Treidify. | Works with every broker and needs no credentials. Not live. |
| B. Hosted connector service (e.g. MetaApi) | A cloud API logs in with the account's **investor (read-only) password**. | Fast to build. Adds a third-party dependency, cost per account and credential custody. Needs due diligence and a data-processing agreement. |
| C. Self-hosted bridge | Windows VMs run MT5 terminals plus the Python `MetaTrader5` package, logged in read-only, and push data to the backend. | Full control. Operationally heavy (one terminal session per account) and we hold the credentials. |
| D. Broker partnership (Manager API) | The broker exposes account data through MetaQuotes' server-side APIs. | The best data and least privilege, but needs a contract with each broker. |

Recommendation: build A first (M4), then B behind the same `TradingAccountRepository` interface, and evaluate D with interested brokers. Never claim universal broker support.

## Every external service, key and account

| Dependency | Needed for | Milestone | Cost | Secret location |
|---|---|---|---|---|
| Apple Developer Program | Signing, TestFlight, App Store, Sign in with Apple, StoreKit | 1 (device builds) | Annual fee | Apple account |
| App Store Connect: app record, IAP products, App Store Server API key | Trial IAP, subscriptions, server verification, notifications v2 | 2, 6 | Free | Backend secret store |
| Sign in with Apple service configuration and key | Server token validation and revocation | 2 | Free | Backend |
| Google Cloud OAuth client (iOS + server) and Google Sign-In SDK | Google login | 2 | Free | Client ID in app (public); server secret on backend |
| PostgreSQL (managed) | Users, entitlements, imports, audit log | 2 | Hosting | Backend |
| Backend hosting, job queue, monitoring | API, ingestion, background jobs, alerts | 2–3 | Hosting | Backend |
| Market-data vendor licence (XAUUSD) | Prices, candles | 3 | Paid | Backend only |
| ICE licence (DXY) or renamed basket | DXY values | 3 | Paid | Backend only |
| Economic-calendar vendor (forecasts) | Calendar consensus figures | 3 | Paid | Backend only |
| News content licence | Stories and AI summaries | 3 | Paid | Backend only |
| MT5 connector (MetaApi or similar) or Windows VM fleet | Live account sync | 4 | Paid | Backend (KMS-encrypted investor passwords) |
| Anthropic API key (Claude) | Grounded explanations of computed results | 3, 5 | Usage-based | Backend only |

No API key of any kind ships in the iOS app.
