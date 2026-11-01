# Multi-asset markets

Treidify analyses any instrument in the registry with the same engine (structure, Fibonacci, supply/demand,
liquidity, volume, multi-timeframe bias, DXY link, event risk). Nothing in the engine is Gold-specific except the
Gold stop rule.

## Registry (`web/src/lib/markets/registry.ts`)

One entry per instrument (36 today: 4 metals, 16 FX, 6 indices, 8 crypto, 4 commodities, DXY and VIX):

| Field | Meaning |
| --- | --- |
| `digits`, `tickSize` | display precision and smallest quoted increment |
| `move` | the unit stops are quoted in: `pip` (FX, metals, DXY) or `point` (indices, crypto, energy), and its size |
| `maxStop` | maximum structural stop in `move` units. **Only XAUUSD has one: 50 pips = $5.00 (1 pip = $0.10).** |
| `contract` | typical MT5 contract size per lot. An account's own symbol specification always overrides it |
| `quote` | currency P&L per lot is in before conversion (USDJPY in JPY, DAX40 in EUR) |
| `session` | `fx` (Sun to Fri), `crypto` (24/7), or an exchange cash session (`us-cash`, `de-cash`, `uk-cash`, `jp-cash`) |
| `volume` | `tick`, `exchange` (crypto) or `none` (cash indices) |
| `dxyLink` | `inverse` (USD quote), `direct` (USD base) or none. Only counted when the measured 1H correlation confirms it |
| `providers.twelvedata.candidates` | vendor symbols that may carry it, best first. DXY is computed (ICE formula) |
| `aliases` | broker spellings (`NAS100.cash`, `GER40`, `GOLD`) resolved by `resolveSymbol()` |
| `keywords`, `calendar` | headline tagging, and which countries' events count as event risk |

Adding an instrument is one entry; no other file changes.

## Coverage is verified, never assumed (`web/src/server/market/coverage.ts`)

- Every bar request records which candidate symbol the provider actually served (`verified`), or that the provider
  refused all of them as unknown or not in the plan (`unavailable`). Rate limits and outages are errors, not verdicts.
- `/api/cron/coverage` (GitHub Actions, twice an hour) probes six unchecked or day-old instruments with one daily-bar
  request each, so a free plan's per-minute limit is respected.
- Results live in `instrument_coverage`. The instrument picker hides `unavailable` instruments and labels `unchecked`
  ones "Not yet verified". An index is never replaced by an ETF or another proxy.
- Twelve Data's index coverage depends on the plan; until the probe confirms one, US100, US30, SPX500, DAX40, UK100
  and JP225 show as unverified.
- Licensing: showing provider data to many users needs the vendor's commercial/display licence. Check the plan before launch.

## Per-user Macro Desk (`user_market_prefs`)

Three slots, default XAUUSD / DXY / XAGUSD, plus favourites. `setDeskInstrument` swaps when the instrument is already
on the desk, so the desk always shows three different markets. Markets uses the same three as its tabs, and any other
instrument opens as a fourth tab from "All markets". Key zones and scenarios follow the card chosen under "Key zones".

## Data integrity

- No provider: every instrument runs on labelled sample bars ("Sample"), never presented as live.
- Provider connected but the instrument is not served: the card says so and no analysis is generated.
- Freshness uses the instrument's own session, so a closed index reads "Market closed", not stale or live.
