"""Indicators. Formulas are identical to TreidifyCore/Analytics/Indicators.swift."""
from __future__ import annotations

from typing import List, Optional, Sequence

from .models import Candle


def ema(values: Sequence[float], period: int) -> List[Optional[float]]:
    """SMA-seeded EMA; k = 2 / (period + 1). Indices before the seed are None."""
    if period <= 0:
        raise ValueError("period must be positive")
    out: List[Optional[float]] = [None] * len(values)
    if len(values) < period:
        return out
    k = 2.0 / (period + 1)
    current = sum(values[:period]) / period
    out[period - 1] = current
    for i in range(period, len(values)):
        current = values[i] * k + current * (1 - k)
        out[i] = current
    return out


def true_ranges(candles: Sequence[Candle]) -> List[float]:
    out = []
    for i, c in enumerate(candles):
        if i == 0:
            out.append(c.h - c.l)
        else:
            prev = candles[i - 1].c
            out.append(max(c.h - c.l, abs(c.h - prev), abs(c.l - prev)))
    return out


def atr(candles: Sequence[Candle], period: int = 14) -> List[Optional[float]]:
    """Wilder ATR seeded with the simple average of the first `period` true ranges."""
    if period <= 0:
        raise ValueError("period must be positive")
    tr = true_ranges(candles)
    out: List[Optional[float]] = [None] * len(tr)
    if len(tr) < period:
        return out
    current = sum(tr[:period]) / period
    out[period - 1] = current
    for i in range(period, len(tr)):
        current = (current * (period - 1) + tr[i]) / period
        out[i] = current
    return out
