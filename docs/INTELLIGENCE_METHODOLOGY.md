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
