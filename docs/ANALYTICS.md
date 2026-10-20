# Analytics definitions

Every number the app shows is computed by one of these deterministic functions, implemented in Swift (`TreidifyCore`) and Python (`backend/treidify_backend/analytics`) and checked against `shared/test-vectors`. Any change to a formula must bump its version and update the vectors.

## Indicators
- **EMA(n):** seeded with the SMA of the first n values, then `ema = x·k + ema_prev·(1−k)` with `k = 2/(n+1)`.
- **True range:** `max(H−L, |H−C_prev|, |L−C_prev|)`. The first bar uses `H−L`.
- **ATR(n):** Wilder smoothing, seeded with the SMA of the first n true ranges.

## Swings
A fractal swing high at bar i has a high strictly greater than the previous `s` highs and at least equal to the next `s` highs (s = 2). Swing lows mirror this. Only confirmed swings count, so results never repaint.

## Market bias `structure-ema-v1`
1. Fewer than 60 candles gives **Insufficient data**.
2. Fewer than two swing highs and two swing lows gives **Insufficient data**.
3. Compare H1→H2 and L1→L2 (the latest two of each): both rising means higher highs and higher lows; both falling means lower highs and lower lows; anything else is mixed.
4. **Bullish** requires rising structure, close > EMA(50) and close > L2. **Bearish** requires falling structure, close < EMA(50) and close < H2. Anything else is **Neutral**.
5. Invalidation: bullish is invalidated by a close below L2; bearish by a close above H2.

Bias is computed separately for 4H, 1H, 15M and 5M. It describes technical structure only. News-based macro interpretation is a separate, labelled output (Milestone 3).

## Levels (conditional zones)
- Swing prices are clustered when they fall within 0.5×ATR(14) of the cluster's first price. A cluster needs at least 2 touches. Zones at or below the close are support; zones above are resistance. The nearest 3 on each side are kept.
- **Liquidity:** swing highs (or lows) within 0.15×ATR, with at least 2 touches, above (or below) price, and not traded through since the last touch.
- **Fibonacci:** levels 0, 23.6, 38.2, 50, 61.8, 78.6 and 100% of the latest leg between the most recent swing high and swing low.
- **Volatility regime:** the percentile of the current ATR(14) among the last 100 ATR values. Below 25 is Low, above 75 is Elevated, otherwise Normal.

## Advisory priority
Market closed (weekend) → market data not usable → high-impact USD release scheduled within 12 h → conflicts (gold 1H and DXY 1H pointing the same direction, or gold 4H versus 1H opposite) → elevated volatility → calm → insufficient data. Every advisory lists the facts it is based on. Tests forbid phrases such as "safe to trade" or "guaranteed".

## Performance
- Net P&L per trade = profit + commission + swap + fees (MT5 signs costs negative). Trades are attributed to the period of their **close** time.
- Win rate = wins / (wins + losses). Breakevens are counted separately.
- Profit factor = gross profit / |gross loss|. It is undefined (shown as —) when there are no losses.
- Expectancy = mean net P&L per trade. Reward : risk = average winner / |average loser|.
- Drawdown is measured on **trading-only equity**: capital base plus cumulative realized P&L. Deposits and withdrawals are excluded and reported separately. Floating P&L is shown separately as unrealized.
- Session attribution uses the session active at open time. Overlaps go to the later-opening session.

## Coach observations
Behavioural observations require at least 20 trades (sessions need at least 10). Each observation states its sample size and evidence. Rulebook violations are always reported. No observation names an emotion; tests check for this.
