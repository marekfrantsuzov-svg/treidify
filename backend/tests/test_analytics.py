import math

import pytest

from treidify_backend.analytics import bias, indicators, performance
from treidify_backend.analytics.models import Candle, ClosedTrade


def to_candles(rows):
    return [Candle(r["t"], r["o"], r["h"], r["l"], r["c"]) for r in rows]


def test_ema_vector(vectors):
    v = vectors("indicators.json")["ema"]
    assert indicators.ema(v["values"], v["period"]) == v["expected"]


def test_atr_vector(vectors):
    v = vectors("indicators.json")["atr"]
    candles = to_candles(v["candles"])
    assert indicators.true_ranges(candles) == v["expectedTrueRanges"]
    assert indicators.atr(candles, v["period"]) == v["expected"]


@pytest.mark.parametrize("name", ["uptrend", "downtrend", "range_equal_highs", "too_short"])
def test_bias_vectors(vectors, name):
    case = next(c for c in vectors("bias.json")["cases"] if c["name"] == name)
    exp = case["expected"]
    result = bias.evaluate(to_candles(case["candles"]))
    assert result.bias == exp["bias"]
    assert result.structure == exp["structure"]
    for key, attr in [("latestSwingHigh", "latest_swing_high"), ("previousSwingHigh", "previous_swing_high"),
                      ("latestSwingLow", "latest_swing_low"), ("previousSwingLow", "previous_swing_low")]:
        if key in exp:
            assert getattr(result, attr) == pytest.approx(exp[key], abs=1e-9)
    if exp["invalidationLevel"] is None:
        assert result.invalidation_level is None
    else:
        assert result.invalidation_level == pytest.approx(exp["invalidationLevel"], abs=1e-9)


def test_swings_are_confirmed_only(vectors):
    candles = to_candles(vectors("bias.json")["cases"][0]["candles"])
    assert all(s.index <= len(candles) - 3 for s in bias.detect_swings(candles))


def test_performance_vector(vectors):
    v = vectors("performance.json")
    trades = [ClosedTrade(t["id"], t["symbol"], t["side"], t["volume"], t["openTime"], t["closeTime"],
                          t["profit"], t["commission"], t["swap"], t["fees"]) for t in v["trades"]]
    m = performance.metrics(list(reversed(trades)), v["startingEquity"]).to_dict()
    for key, expected in v["expected"].items():
        assert m[key] == pytest.approx(expected, abs=1e-9), key


def test_profit_factor_undefined_without_losses():
    t = ClosedTrade("a", "XAUUSD", "buy", 1, 0, 1, 10)
    m = performance.metrics([t])
    assert m.profitFactor is None and m.winRate == 1


def test_candle_validation():
    assert not Candle(0, 10, 9, 8, 9.5).is_valid()
    assert not Candle(0, math.nan, 11, 9, 10).is_valid()
    assert Candle(0, 10, 11, 9, 10.5).is_valid()
