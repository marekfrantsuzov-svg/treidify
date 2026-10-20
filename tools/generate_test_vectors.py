#!/usr/bin/env python3
"""Writes shared/test-vectors/*.json consumed by BOTH the Swift (TreidifyCore)
and Python (backend) test suites, so the two analytics engines are checked
against the same inputs and the same hand-derived expectations.

Candle series are built from zig-zag waypoints: closes are linearly
interpolated between waypoints (8 bars per leg), open = previous close and
wicks extend 0.1 beyond the body. Swing points therefore sit exactly at the
waypoints (±0.1), which makes the expected results derivable by hand.
"""
import json
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "shared" / "test-vectors"
T0 = 1_767_225_600  # 2026-01-01T00:00:00Z
STEP = 3_600        # 1H bars


def zigzag(waypoints, bars_per_leg=8):
    closes = [waypoints[0]]
    for a, b in zip(waypoints, waypoints[1:]):
        for k in range(1, bars_per_leg + 1):
            closes.append(round(a + (b - a) * k / bars_per_leg, 6))
    candles = []
    prev = closes[0]
    for i, c in enumerate(closes):
        o = prev
        candles.append({"t": T0 + i * STEP, "o": o, "h": round(max(o, c) + 0.1, 6),
                        "l": round(min(o, c) - 0.1, 6), "c": c})
        prev = c
    return candles


up = [100, 110, 104, 116, 109, 122, 114, 128, 120, 134, 126, 138]
down = [200 - w for w in up]
ranging = [105, 110, 100, 110, 100, 110, 100, 110, 100, 110, 100, 110, 105]

bias_vectors = {
    "description": "MarketBiasEngine v1 (structure-ema-v1) with swingStrength=2, emaPeriod=50, minimumCandles=60.",
    "cases": [
        {"name": "uptrend", "candles": zigzag(up),
         "expected": {"bias": "bullish", "structure": "higherHighsHigherLows",
                      "latestSwingHigh": 134.1, "previousSwingHigh": 128.1,
                      "latestSwingLow": 125.9, "previousSwingLow": 119.9,
                      "invalidationLevel": 125.9}},
        {"name": "downtrend", "candles": zigzag(down),
         "expected": {"bias": "bearish", "structure": "lowerHighsLowerLows",
                      "latestSwingHigh": 74.1, "previousSwingHigh": 80.1,
                      "latestSwingLow": 65.9, "previousSwingLow": 71.9,
                      "invalidationLevel": 74.1}},
        {"name": "range_equal_highs", "candles": zigzag(ranging),
         "expected": {"bias": "neutral", "structure": "mixed",
                      "latestSwingHigh": 110.1, "previousSwingHigh": 110.1,
                      "latestSwingLow": 99.9, "previousSwingLow": 99.9,
                      "invalidationLevel": None}},
        {"name": "too_short", "candles": zigzag(up)[:30],
         "expected": {"bias": "insufficientData", "structure": None, "invalidationLevel": None}},
    ],
}

indicator_vectors = {
    "ema": {"values": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "period": 3,
            "expected": [None, None, 2, 3, 4, 5, 6, 7, 8, 9]},
    "atr": {
        "description": "Bars with constant range 2 and no gaps -> TR=2, ATR(3)=2 from index 2.",
        "candles": [{"t": T0 + i * STEP, "o": 10 + i, "h": 11 + i, "l": 9 + i, "c": 10 + i} for i in range(6)],
        "period": 3,
        "expectedTrueRanges": [2, 2, 2, 2, 2, 2],
        "expected": [None, None, 2, 2, 2, 2],
    },
}

day = 86_400
perf_trades = [
    {"id": "t1", "symbol": "XAUUSD", "side": "buy", "volume": 0.5, "profit": 100, "commission": -5, "swap": 0},
    {"id": "t2", "symbol": "XAUUSD", "side": "sell", "volume": 0.5, "profit": -50, "commission": -5, "swap": 0},
    {"id": "t3", "symbol": "EURUSD", "side": "buy", "volume": 0.5, "profit": -30, "commission": -5, "swap": -2},
    {"id": "t4", "symbol": "XAUUSD", "side": "buy", "volume": 0.5, "profit": 200, "commission": -5, "swap": 0},
    {"id": "t5", "symbol": "XAUUSD", "side": "sell", "volume": 0.5, "profit": 0, "commission": 0, "swap": 0},
    {"id": "t6", "symbol": "EURUSD", "side": "sell", "volume": 0.5, "profit": 60, "commission": -5, "swap": -1},
]
for i, t in enumerate(perf_trades):
    t["openTime"] = T0 + 4 * day + i * day + 36_000
    t["closeTime"] = t["openTime"] + 3_600
    t["openPrice"] = 100.0
    t["closePrice"] = 100.0
    t["fees"] = 0

performance_vectors = {
    "description": "Hand-computed metrics. Nets: 95, -55, -37, 195, 0, 54.",
    "startingEquity": 1000,
    "trades": perf_trades,
    "expected": {
        "tradeCount": 6, "wins": 3, "losses": 2, "breakevens": 1,
        "netProfit": 252, "grossProfit": 344, "grossLoss": -92, "totalCosts": 28,
        "winRate": 0.6, "profitFactor": 344 / 92, "expectancy": 42,
        "averageWinner": 344 / 3, "averageLoser": -46, "rewardToRisk": (344 / 3) / 46,
        "maxConsecutiveWins": 1, "maxConsecutiveLosses": 2,
        "maxDrawdown": 92, "maxDrawdownPercent": 92 / 1095 * 100,
    },
}

OUT.mkdir(parents=True, exist_ok=True)
for name, data in [("bias.json", bias_vectors), ("indicators.json", indicator_vectors),
                   ("performance.json", performance_vectors)]:
    (OUT / name).write_text(json.dumps(data, indent=1) + "\n")
    print("wrote", OUT / name)
