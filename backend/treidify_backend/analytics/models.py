from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Candle:
    t: float  # open time, Unix seconds
    o: float
    h: float
    l: float
    c: float

    def is_valid(self) -> bool:
        """Mirror of Candle(validatingTime:) in TreidifyCore."""
        values = (self.o, self.h, self.l, self.c)
        return (all(v == v and v not in (float("inf"), float("-inf")) and v > 0 for v in values)
                and self.h >= max(self.o, self.c) and self.l <= min(self.o, self.c) and self.h >= self.l)


@dataclass(frozen=True)
class SwingPoint:
    kind: str  # "high" | "low"
    index: int
    t: float
    price: float


@dataclass(frozen=True)
class ClosedTrade:
    id: str
    symbol: str
    side: str
    volume: float
    open_time: float
    close_time: float
    profit: float
    commission: float = 0.0
    swap: float = 0.0
    fees: float = 0.0

    @property
    def net_profit(self) -> float:
        return self.profit + self.commission + self.swap + self.fees

    @property
    def costs(self) -> float:
        return -(self.commission + self.swap + self.fees)


