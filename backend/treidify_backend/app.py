"""Treidify API (Milestone 1).

Stateless analytics endpoints only. Authentication, user accounts, entitlements
(72-hour trial), licensed data adapters, MT5 bridge and Claude-powered
explanations are later milestones (docs/ARCHITECTURE.md). No endpoint here
fabricates data: every response is computed from the request body.

Run locally:  uvicorn treidify_backend.app:app --reload
"""
from __future__ import annotations

from typing import List, Literal, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .analytics import bias as bias_engine
from .analytics import performance as perf
from .analytics.models import Candle, ClosedTrade

app = FastAPI(title="Treidify API", version="0.1.0")

MAX_CANDLES = 5_000
MAX_TRADES = 50_000


class CandleIn(BaseModel):
    t: float = Field(description="Bar open time, Unix seconds")
    o: float
    h: float
    l: float
    c: float


class BiasRequest(BaseModel):
    timeframe: Literal["5M", "15M", "1H", "4H", "1D"]
    candles: List[CandleIn] = Field(max_length=MAX_CANDLES)


class TradeIn(BaseModel):
    id: str
    symbol: str
    side: Literal["buy", "sell"]
    volume: float = Field(gt=0)
    openTime: float
    closeTime: float
    profit: float
    commission: float = 0
    swap: float = 0
    fees: float = 0


class PerformanceRequest(BaseModel):
    trades: List[TradeIn] = Field(max_length=MAX_TRADES)
    startingEquity: Optional[float] = None


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "analytics": bias_engine.ALGORITHM_VERSION}


@app.post("/v1/analytics/bias")
def analyze_bias(req: BiasRequest) -> dict:
    candles = [Candle(c.t, c.o, c.h, c.l, c.c) for c in req.candles]
    invalid = [i for i, c in enumerate(candles) if not c.is_valid()]
    if invalid:
        raise HTTPException(422, detail=f"Invalid OHLC values at indices {invalid[:10]}")
    if any(b.t <= a.t for a, b in zip(candles, candles[1:])):
        raise HTTPException(422, detail="Candles must be strictly ascending by time")
    result = bias_engine.evaluate(candles)
    return {"timeframe": req.timeframe, **result.__dict__}


@app.post("/v1/analytics/performance")
def analyze_performance(req: PerformanceRequest) -> dict:
    if any(t.closeTime < t.openTime for t in req.trades):
        raise HTTPException(422, detail="closeTime must not precede openTime")
    trades = [ClosedTrade(t.id, t.symbol, t.side, t.volume, t.openTime, t.closeTime, t.profit,
                          t.commission, t.swap, t.fees) for t in req.trades]
    return perf.metrics(trades, req.startingEquity).to_dict()
