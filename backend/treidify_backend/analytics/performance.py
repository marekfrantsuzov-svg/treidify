"""Deterministic performance metrics. Mirrors TreidifyCore PerformanceCalculator.swift;
both are verified against shared/test-vectors/performance.json."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Optional, Sequence

from .models import ClosedTrade


@dataclass
class PerformanceMetrics:
    tradeCount: int
    wins: int
    losses: int
    breakevens: int
    netProfit: float
    grossProfit: float
    grossLoss: float
    totalCosts: float
    winRate: Optional[float]
    profitFactor: Optional[float]
    expectancy: Optional[float]
    averageWinner: Optional[float]
    averageLoser: Optional[float]
    rewardToRisk: Optional[float]
    maxConsecutiveWins: int
    maxConsecutiveLosses: int
    maxDrawdown: float
    maxDrawdownPercent: Optional[float]

    def to_dict(self) -> dict:
        return asdict(self)


def metrics(trades: Sequence[ClosedTrade], starting_equity: Optional[float] = None) -> PerformanceMetrics:
    if not trades:
        return PerformanceMetrics(0, 0, 0, 0, 0.0, 0.0, 0.0, 0.0, None, None, None, None, None, None, 0, 0, 0.0, None)
    ordered = sorted(trades, key=lambda t: (t.close_time, t.id))
    nets = [t.net_profit for t in ordered]
    winners = [n for n in nets if n > 0]
    losers = [n for n in nets if n < 0]
    gross_profit, gross_loss = sum(winners), sum(losers)
    decided = len(winners) + len(losers)

    max_w = max_l = w = l = 0
    for n in nets:
        if n > 0:
            w, l = w + 1, 0
        elif n < 0:
            l, w = l + 1, 0
        else:
            w = l = 0
        max_w, max_l = max(max_w, w), max(max_l, l)

    base = starting_equity or 0.0
    equity = peak = base
    max_dd, max_dd_pct = 0.0, None
    for n in nets:
        equity += n
        peak = max(peak, equity)
        dd = peak - equity
        if dd > max_dd:
            max_dd = dd
            max_dd_pct = dd / peak * 100 if peak > 0 else None

    avg_win = gross_profit / len(winners) if winners else None
    avg_loss = gross_loss / len(losers) if losers else None
    return PerformanceMetrics(
        tradeCount=len(ordered), wins=len(winners), losses=len(losers), breakevens=len(ordered) - decided,
        netProfit=sum(nets), grossProfit=gross_profit, grossLoss=gross_loss,
        totalCosts=sum(t.costs for t in ordered),
        winRate=len(winners) / decided if decided else None,
        profitFactor=gross_profit / abs(gross_loss) if gross_loss else None,
        expectancy=sum(nets) / len(nets),
        averageWinner=avg_win, averageLoser=avg_loss,
        rewardToRisk=avg_win / abs(avg_loss) if avg_win is not None and avg_loss else None,
        maxConsecutiveWins=max_w, maxConsecutiveLosses=max_l,
        maxDrawdown=max_dd,
        maxDrawdownPercent=None if starting_equity is None else (0.0 if max_dd == 0 else max_dd_pct),
    )
