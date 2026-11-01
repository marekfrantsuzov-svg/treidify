# Market intelligence methodology (engine `mtf-structure-v2`)

The engine lives in `web/src/lib/intelligence/` and is pure TypeScript: the same candles always give the same result. It never invents a price. Every level it shows is a swing, a Fibonacci retracement of a real swing leg, or a cluster of real highs or lows. When inputs are missing it returns **Insufficient data** rather than guessing.

## Inputs
- Candles for XAUUSD, XAGUSD and DXY on 5M, 15M, 1H and 4H from the market-data provider (Twelve Data). Timestamps are UTC.
- DXY is either a vendor symbol (`MARKET_DATA_DXY_SYMBOL`) or computed with the ICE formula: `50.14348112 × EURUSD^-0.576 × USDJPY^0.136 × GBPUSD^-0.119 × USDCAD^0.091 × USDSEK^0.042 × USDCHF^0.036`. Computed bars use exact open and close; high and low are the max and min of open and close, because component highs do not happen at the same moment.
- High-impact economic events from the calendar provider (Finnhub).
- With no provider configured, the engine runs on clearly labelled **sample bars** so the layout can be seen. Sample output is never presented as a reading.

## Rules
| Concept | Rule |
| --- | --- |
| Swing high / low | Fractal of strength 2: a bar whose high (low) is strictly above (below) the two bars on each side. |
| Break of structure (BOS) | A close beyond the most recent swing in the direction of the current trend. |
| Change of character (CHOCH) | The first close beyond the most recent swing against the current trend. |
| Liquidity sweep | A wick beyond a swing high or low with the close back inside it. |
| Equal highs / lows | Two or more swings within 0.15 ATR of each other. |
| Fibonacci | Measured on the latest 1H impulse leg between confirmed swings: 23.6, 38.2, 50, 61.8, 78.6, 88.6 %. |
| Zones | Candidates are 1H support or resistance clusters and the 61.8–78.6 % retracement of the 1H leg. The nearest candidate on the correct side of price is kept and merged with any it overlaps (marked as confluence). Invalidation = zone edge ± 0.25 ATR; a zone is dropped if one of the last three 1H closes is beyond it. Status: watching, in zone, confirmed (price in the zone and a 5M structure break in the zone's direction). |

## Score (−100 to +100)
| Component | Weight |
| --- | --- |
| 4H structure (trend and last break) | 30 |
| 1H structure | 20 |
| Trend (4H close against 4H EMA 50, in ATR units) | 15 |
| Momentum (1H RSI 14) | 10 |
| Liquidity (latest 15M sweep in the last 16 bars) | 10 |
| DXY relationship, only when the 1H return correlation ρ ≤ −0.3 | 15 |

Missing components are dropped and the remaining weights are re-normalised; if structure is missing the result is Insufficient data. **Bullish** ≥ +25, **Bearish** ≤ −25, otherwise **Neutral**. Confidence (high, medium, low) comes from data coverage, agreement between timeframes, volatility and event risk.

**Overall** = average of the Gold score and the inverted DXY score, halved when a high-impact event is due within four hours.

## Where it shows
Dashboard gauges and bubbles, Market Intelligence, Charts overlays, Macro Desk and the virtual analysts. Tap any gauge to see each component, its contribution and the invalidation level. Tests: `web/src/lib/intelligence/intelligence.test.ts`.

This is analysis of market structure, not financial advice or a signal service.

## XAUUSD pip convention and the 50-pip rule

One conversion point, `web/src/lib/trading/pips.ts`, is used everywhere (engine, panels, AI prompts):

- 1 pip = $0.10 of gold price movement; 10 pips = $1.00; 50 pips = $5.00; 100 pips = $10.00.
- The maximum structural stop is 50 pips ($5.00). The stop sits at structural invalidation (the zone's far edge ± 0.1 ATR). If that is 51 pips or more, the result is **WAIT / NO VALID SETUP**. The stop is never tightened to make a trade fit.
- Pips are price movement, not money. Money at risk depends on lot size: $5.00 of movement is $50 on 0.10 lot and $500 on 1 lot (100 oz contract).

## Setup confirmation

A zone touch is never a setup. `tradeSetup` returns BUY or SELL only when the zone's status is `confirmed` (a 5M change of character from inside the zone), the 4H trend agrees, there is room to at least 1R and the structural stop is within 50 pips. Anything else is WAIT, with the missing conditions listed.

## Timeframe overlays (`tf-overlays-v1`)

`web/src/lib/intelligence/overlays.ts` runs on the candles of the timeframe on screen (5M, 15M, 1H, 4H), so every overlay is recomputed when the timeframe changes. It is deterministic: the same bars always give the same output. Thresholds live in `OVERLAY_RULES`.

| Overlay | Method |
|---|---|
| Supply and demand zones | The base candle before a displacement (one candle with body ≥ 1.2 ATR and ≥ 60% of its range, or a 2–3 candle leg moving ≥ 1.8 ATR). Demand spans base low to body top; supply spans body bottom to high. Status walks forward bar by bar: active (untouched), tested (revisited and held, max 3), invalidated (a close through the far edge), historical (older or replaced). |
| Fibonacci | Bullish and bearish scenarios, each anchored on a confirmed swing and the extreme since it; 23.6, 38.2, 50, 61.8, 78.6, 88.6 % with exact prices. A close beyond the anchor voids the leg. |
| Liquidity | Equal highs and lows (within 0.15 ATR) and previous swing highs and lows. Unswept, swept (wick through, close back inside) or taken (close through). Labelled High, Medium or Low **estimated** liquidity. It is never presented as order-book data: spot gold has no central order book. |
| Structure | Confirmed swings (HH, HL, LH, LL), BOS and CHOCH on closes only, and outlined displacement candles. |
| Volume | Gold, silver and DXY feeds carry tick volume (update count), labelled as such with relative volume against a 20-bar average. It cannot show who bought or sold. Sample mode is labelled "Sample volume"; no volume shows "Volume unavailable". |
