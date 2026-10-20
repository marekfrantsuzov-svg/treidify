from fastapi.testclient import TestClient

from treidify_backend.app import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["analytics"] == "structure-ema-v1"


def test_bias_endpoint_matches_vector(vectors):
    case = vectors("bias.json")["cases"][0]
    r = client.post("/v1/analytics/bias", json={"timeframe": "1H", "candles": case["candles"]})
    assert r.status_code == 200
    body = r.json()
    assert body["bias"] == "bullish" and body["invalidation_level"] == 125.9


def test_bias_endpoint_rejects_invalid_ohlc():
    bad = [{"t": 0, "o": 10, "h": 9, "l": 8, "c": 9.5}]
    r = client.post("/v1/analytics/bias", json={"timeframe": "1H", "candles": bad})
    assert r.status_code == 422


def test_bias_endpoint_rejects_unsorted(vectors):
    candles = vectors("bias.json")["cases"][0]["candles"][:5][::-1]
    r = client.post("/v1/analytics/bias", json={"timeframe": "1H", "candles": candles})
    assert r.status_code == 422


def test_performance_endpoint(vectors):
    v = vectors("performance.json")
    r = client.post("/v1/analytics/performance", json={"trades": v["trades"], "startingEquity": v["startingEquity"]})
    assert r.status_code == 200
    assert r.json()["netProfit"] == 252
