"""Market bias v1 (structure-ema-v1). Mirrors TreidifyCore MarketBiasEngine.swift;
both are verified against shared/test-vectors/bias.json."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Sequence

from .indicators import ema
from .models import Candle, SwingPoint

ALGORITHM_VERSION = "structure-ema-v1"


def detect_swings(candles: Sequence[Candle], strength: int = 2) -> List[SwingPoint]:
    """Fractal swings: strictly beyond the `strength` bars to the left, at least
    equal to the `strength` bars to the right. Only confirmed swings are returned."""
    if strength <= 0:
        raise ValueError("strength must be positive")
    swings: List[SwingPoint] = []
    if len(candles) < strength * 2 + 1:
        return swings
    for i in range(strength, len(candles) - strength):
        c = candles[i]
        left = candles[i - strength:i]
        right = candles[i + 1:i + 1 + strength]
        if all(c.h > x.h for x in left) and all(c.h >= x.h for x in right):
            swings.append(SwingPoint("high", i, c.t, c.h))
        if all(c.l < x.l for x in left) and all(c.l <= x.l for x in right):
            swings.append(SwingPoint("low", i, c.t, c.l))
    return swings


@dataclass
class BiasResult:
    bias: str
    structure: Optional[str] = None
    previous_swing_high: Optional[float] = None
    latest_swing_high: Optional[float] = None
    previous_swing_low: Optional[float] = None
    latest_swing_low: Optional[float] = None
    ema: Optional[float] = None
    close: Optional[float] = None
    invalidation_level: Optional[float] = None
    rationale: List[str] = field(default_factory=list)
    candle_count: int = 0
    algorithm: str = ALGORITHM_VERSION


def evaluate(candles: Sequence[Candle], swing_strength: int = 2, ema_period: int = 50,
             minimum_candles: int = 60) -> BiasResult:
    required = max(minimum_candles, ema_period)
    if len(candles) < required:
        return BiasResult("insufficientData", rationale=[f"Only {len(candles)} candles; at least {required} required."],
                          candle_count=len(candles))
    swings = detect_swings(candles, swing_strength)
    highs = [s for s in swings if s.kind == "high"]
    lows = [s for s in swings if s.kind == "low"]
    if len(highs) < 2 or len(lows) < 2:
        return BiasResult("insufficientData", rationale=["Fewer than two confirmed swing highs and lows."],
                          candle_count=len(candles))
    h1, h2 = highs[-2], highs[-1]
    l1, l2 = lows[-2], lows[-1]
    if h2.price > h1.price and l2.price > l1.price:
        structure = "higherHighsHigherLows"
    elif h2.price < h1.price and l2.price < l1.price:
        structure = "lowerHighsLowerLows"
    else:
        structure = "mixed"
    e = ema([c.c for c in candles], ema_period)[-1]
    close = candles[-1].c
    if structure == "higherHighsHigherLows" and close > e and close > l2.price:
        bias, invalidation = "bullish", l2.price
    elif structure == "lowerHighsLowerLows" and close < e and close < h2.price:
        bias, invalidation = "bearish", h2.price
    else:
        bias, invalidation = "neutral", None
    return BiasResult(
        bias=bias, structure=structure,
        previous_swing_high=h1.price, latest_swing_high=h2.price,
        previous_swing_low=l1.price, latest_swing_low=l2.price,
        ema=e, close=close, invalidation_level=invalidation,
        rationale=[f"Swing highs {h1.price} then {h2.price}; swing lows {l1.price} then {l2.price}.",
                   f"Structure: {structure}.",
                   f"Close {close} vs EMA({ema_period}) {e:.5f}.",
                   f"Classification: {bias}."],
        candle_count=len(candles))
