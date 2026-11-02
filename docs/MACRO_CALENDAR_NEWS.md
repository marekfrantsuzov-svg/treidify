# Macro Desk, economic calendar and news: data sources

| Section | Provider | Key | What is live | Limits |
|---|---|---|---|---|
| Macro Desk: Rates | Federal Reserve target range (FRED `DFEDTARL`/`DFEDTARU`); FOMC schedule from FRED release 101, fallback list from federalreserve.gov | `FRED_API_KEY` optional | Range, last decision and outcome, next meeting, 3-year history | Without the key the static FOMC list (2025–2027) is used |
| Macro Desk: Inflation | BLS CPI via FRED (`CPIAUCNS`, `CPILFENS`) | optional | CPI y/y, previous month, core CPI y/y, history | Release date and next release need the key |
| Macro Desk: GDP | BEA real GDP via FRED (`A191RL1Q225SBEA`) | optional | Latest quarter, previous, history | Release date, estimate type (advance/second/third, derived from BEA's schedule) and next release need the key |
| Treasury yields | Fed H.15 via FRED (`DGS10`, `DFII10`) | optional | 10-year nominal and real yields, daily | One business day behind |
| Economic calendar | Finnhub if the plan includes it; otherwise the official US release schedule from FRED (CPI, PPI, PCE, payrolls, unemployment, earnings, claims, JOLTS, GDP, retail sales, FOMC) | `FRED_API_KEY` required for the official calendar | Dates, agency release times converted with DST, actual, previous, revisions (from ALFRED vintages), measured XAUUSD reaction from saved 15M bars | No consensus forecasts (no official source publishes them); US only |
| Market news | Finnhub (forex, general, crypto feeds) | `FINNHUB_API_KEY` | Headlines, publisher images, summaries (sanitized to plain text), article view, original link | Summaries only, never full articles |
| News Impact on Gold | Gold/DXY structure (Twelve Data) + FRED facts + releases + headlines | — | Read with evidence, timestamps and missing inputs | No read on sample or stale bars |

Caching: macro values 1 hour, 10 minutes around scheduled release times; schedules 6 hours; the calendar page re-reads itself 2 minutes after the next release.
Verification: `.github/workflows/macro-verify.yml` (real FRED/Fed responses on a GitHub runner) and `service-verify.yml` with `set=macro` or `set=news` against production.
