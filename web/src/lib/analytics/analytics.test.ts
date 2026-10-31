import { describe, expect, it } from "vitest";
import biasVectors from "@vectors/bias.json";
import indicatorVectors from "@vectors/indicators.json";
import perfVectors from "@vectors/performance.json";
import {
  analyzeLevels, analyzeVolatility, atr, detectSwings, ema, evaluateBias, isValidCandle,
  latestFibonacci, marketStatus, performanceMetrics, sessionAt, trueRanges, coachObservations, explainZone, type ClosedTrade,
} from ".";

describe("shared test vectors (parity with Swift and Python)", () => {
  it("EMA", () => {
    const v = indicatorVectors.ema;
    expect(ema(v.values, v.period)).toEqual(v.expected);
  });
  it("true range and ATR", () => {
    const v = indicatorVectors.atr;
    expect(trueRanges(v.candles)).toEqual(v.expectedTrueRanges);
    expect(atr(v.candles, v.period)).toEqual(v.expected);
  });
  for (const c of biasVectors.cases) {
    it(`bias: ${c.name}`, () => {
      const r = evaluateBias(c.candles);
      const exp = c.expected as Record<string, unknown>;
      expect(r.bias).toBe(exp.bias);
      expect(r.structure).toBe(exp.structure ?? null);
      for (const key of ["latestSwingHigh", "previousSwingHigh", "latestSwingLow", "previousSwingLow"] as const) {
        if (key in exp) expect(r[key]).toBeCloseTo(exp[key] as number, 9);
      }
      if (exp.invalidationLevel === null) expect(r.invalidationLevel).toBeNull();
      else expect(r.invalidationLevel).toBeCloseTo(exp.invalidationLevel as number, 9);
    });
  }
  it("performance", () => {
    const trades: ClosedTrade[] = perfVectors.trades.map((t) => ({ ...t, side: t.side as "buy" | "sell" }));
    const m = performanceMetrics([...trades].reverse(), perfVectors.startingEquity);
    for (const [k, v] of Object.entries(perfVectors.expected)) {
      expect(m[k as keyof typeof m], k).toBeCloseTo(v, 9);
    }
  });
});

describe("engine behaviour", () => {
  const uptrend = biasVectors.cases[0]!.candles;
  it("swings are confirmed only", () => {
    expect(detectSwings(uptrend).every((s) => s.index <= uptrend.length - 3)).toBe(true);
  });
  it("profit factor undefined without losses", () => {
    const m = performanceMetrics([{ id: "a", symbol: "XAUUSD", side: "buy", volume: 1, openTime: 0, closeTime: 1, profit: 10, commission: 0, swap: 0, fees: 0 }]);
    expect(m.profitFactor).toBeNull();
    expect(m.winRate).toBe(1);
  });
  it("candle validation", () => {
    expect(isValidCandle({ t: 0, o: 10, h: 9, l: 8, c: 9.5 })).toBe(false);
    expect(isValidCandle({ t: 0, o: NaN, h: 11, l: 9, c: 10 })).toBe(false);
    expect(isValidCandle({ t: 0, o: 10, h: 11, l: 9, c: 10.5 })).toBe(true);
  });
  it("levels: unavailable with too few candles, zones split around price otherwise", () => {
    expect(analyzeLevels(uptrend.slice(0, 10)).unavailableReason).toMatch(/50 candles/);
    const r = analyzeLevels(uptrend);
    for (const z of r.zones) {
      if (z.kind === "support") expect((z.lower + z.upper) / 2).toBeLessThanOrEqual(r.referencePrice!);
      if (z.kind === "resistance") expect((z.lower + z.upper) / 2).toBeGreaterThan(r.referencePrice!);
      expect(z.touches).toBeGreaterThanOrEqual(2);
    }
  });
  it("fibonacci levels run from 0 to 100% of the leg", () => {
    const f = latestFibonacci(uptrend);
    expect(f).not.toBeNull();
    expect(f!.levels).toHaveLength(7);
    const prices = f!.levels.map((l) => l.price);
    expect(Math.max(...prices)).toBeCloseTo(f!.swingHigh.price);
    expect(Math.min(...prices)).toBeCloseTo(f!.swingLow.price);
  });
  it("volatility needs a full lookback", () => {
    expect(analyzeVolatility(uptrend).regime).toBe("insufficientData");
  });
  it("market hours", () => {
    expect(marketStatus(new Date("2026-10-24T15:00:00Z"))).toBe("weekendClosed"); // Saturday
    expect(marketStatus(new Date("2026-10-21T21:30:00Z"))).toBe("dailyBreak"); // Wed 17:30 NY
    expect(marketStatus(new Date("2026-10-21T14:00:00Z"))).toBe("open");
    expect(sessionAt(new Date("2026-10-21T14:00:00Z"))).toBe("newYork"); // London/NY overlap
  });
});

describe("coach", () => {
  const base = (i: number, net: number, volume: number, hours = 2): ClosedTrade => ({
    id: `t${i}`, symbol: "XAUUSD", side: "buy", volume, openTime: 1_767_607_200 + i * 86_400, closeTime: 1_767_607_200 + i * 86_400 + hours * 3600,
    profit: net, commission: 0, swap: 0, fees: 0,
  });
  it("needs the minimum sample before behavioural claims", () => {
    const few = Array.from({ length: 10 }, (_, i) => base(i, i % 2 ? 10 : -10, 1));
    expect(coachObservations(few)).toEqual([]);
  });
  it("detects larger size after losses", () => {
    const trades = Array.from({ length: 40 }, (_, i) => {
      const prevLoss = i > 0 && (i - 1) % 2 === 0;
      return base(i, i % 2 === 0 ? -20 : 25, prevLoss ? 2 : 1);
    });
    expect(coachObservations(trades).map((o) => o.kind)).toContain("riskAfterLosses");
  });
  it("detects losers held longer and never names emotions", () => {
    const trades = Array.from({ length: 30 }, (_, i) => (i % 2 ? base(i, 30, 1, 2) : base(i, -20, 1, 6)));
    const obs = coachObservations(trades);
    expect(obs.map((o) => o.kind)).toContain("holdingLosers");
    const text = JSON.stringify(obs).toLowerCase();
    for (const banned of ["revenge", "fear", "greed", "anxious", "tilt", "guaranteed"]) expect(text).not.toContain(banned);
  });
  it("rule violations need no minimum sample", () => {
    const obs = coachObservations([base(0, 10, 5)], { maxVolumePerTrade: 2 });
    expect(obs[0]?.kind).toBe("ruleViolation");
  });
});

describe("zone explainer", () => {
  it("explains support with confirmation and invalidation from computed values", () => {
    const c = biasVectors.cases[0]!.candles;
    const lv = analyzeLevels(c);
    const z = lv.zones.find((x) => x.kind === "support");
    if (!z) return;
    const e = explainZone(z, c, { symbol: "XAUUSD", timeframe: "1H", digits: 2, atr: lv.atr, bias: evaluateBias(c), others: lv.zones });
    expect(e.favours).toBe("buyers");
    expect(e.invalidation).toContain(z.lower.toFixed(2));
    expect(e.disclaimer).toMatch(/not a prediction/);
  });
});

describe("health score", () => {
  it("is withheld below 20 trades and bounded 0-100 otherwise", async () => {
    const { healthScore } = await import("./health");
    const t = (i: number, net: number): ClosedTrade => ({ id: `h${i}`, symbol: "XAUUSD", side: "buy", volume: 1, openTime: i * 100, closeTime: i * 100 + 50, profit: net, commission: 0, swap: 0, fees: 0 });
    expect(healthScore([t(0, 5)], 1000).score).toBeNull();
    const good = healthScore(Array.from({ length: 30 }, (_, i) => t(i, i % 3 ? 20 : -10)), 1000);
    const bad = healthScore(Array.from({ length: 30 }, (_, i) => t(i, i % 3 ? -40 : 10)), 1000);
    expect(good.score!).toBeGreaterThan(bad.score!);
    for (const s of [good, bad]) { expect(s.score!).toBeGreaterThanOrEqual(0); expect(s.score!).toBeLessThanOrEqual(100); }
  });
});
