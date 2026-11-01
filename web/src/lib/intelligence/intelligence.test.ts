import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/analytics/types";
import { analyzeStructure } from "./structure";
import { recentSweeps, equalLevels } from "./liquidity";
import { structuralFib, FIB_LEVELS } from "./fibonacci";
import { rsi, correlation } from "./math";
import { analyzeInstrument, overallConditions } from "./engine";
import { computeDxyCandles, dxyValue, DXY_CONSTANT } from "@/server/market/dxy";
import { classifyFreshness } from "@/server/market/freshness";
import { parseSeries, parseUtc, twelveData } from "@/server/market/twelvedata";

/** Builds bars from a close path: each bar opens at the previous close, wicks 0.2 beyond the body. */
function path(closes: number[], step = 3600, start = 1_700_000_000): Candle[] {
  return closes.map((c, i) => {
    const o = i ? closes[i - 1]! : c;
    return { t: start + i * step, o, h: Math.max(o, c) + 0.2, l: Math.min(o, c) - 0.2, c };
  });
}
/** Zig-zag through the given pivots with `n` bars per leg. */
function zigzag(pivots: number[], n = 4): number[] {
  const out: number[] = [pivots[0]!];
  for (let k = 1; k < pivots.length; k++) for (let j = 1; j <= n; j++) out.push(pivots[k - 1]! + ((pivots[k]! - pivots[k - 1]!) * j) / n);
  return out;
}

describe("market structure", () => {
  it("labels a bullish BOS sequence then a bearish CHOCH", () => {
    // Higher highs and higher lows, then a drop through the last higher low.
    const c = path(zigzag([100, 110, 105, 115, 108, 120, 112, 100]));
    const s = analyzeStructure(c);
    const kinds = s.events.map((e) => `${e.kind}:${e.direction}`);
    expect(kinds).toContain("BOS:bullish");
    expect(kinds.at(-1)).toBe("CHOCH:bearish");
    expect(s.trend).toBe("bearish");
  });
  it("needs a close, not a wick, to break", () => {
    const c = path(zigzag([100, 110, 105, 109.9, 104], 4));
    // Push one wick above 110 that closes below it.
    c[13] = { ...c[13]!, h: 110.6 };
    const s = analyzeStructure(c);
    expect(s.events.filter((e) => e.direction === "bullish")).toHaveLength(0);
  });
  it("is deterministic and never repaints earlier events", () => {
    const c = path(zigzag([100, 110, 105, 115, 108, 120, 112, 125]));
    const a = analyzeStructure(c.slice(0, 20)).events;
    const b = analyzeStructure(c).events.filter((e) => e.index < 20);
    expect(b).toEqual(a);
  });
});

describe("liquidity", () => {
  it("detects a sweep of a prior low that closes back above", () => {
    const c = path(zigzag([100, 110, 104, 112, 106], 4));
    const swings = analyzeStructure(c).swings;
    const lastLow = swings.findLast((s) => s.kind === "low")!;
    c.push({ t: c.at(-1)!.t + 3600, o: 106.5, h: 107, l: lastLow.price - 1, c: 106.8 });
    const sw = recentSweeps(c, analyzeStructure(c).swings, 5);
    expect(sw.at(-1)).toMatchObject({ side: "sell", direction: "bullish" });
  });
  it("finds untaken equal highs", () => {
    const c = path(zigzag([100, 110, 104, 110.05, 103, 106], 4));
    const pools = equalLevels(c, analyzeStructure(c).swings, 2);
    expect(pools.some((p) => p.side === "buy" && p.swings >= 2)).toBe(true);
  });
});

describe("structural Fibonacci", () => {
  it("anchors from the origin low to the leg high, with all six ratios", () => {
    const c = path(zigzag([100, 110, 105, 120, 115], 4));
    const s = analyzeStructure(c);
    const f = structuralFib(c, s)!;
    expect(f.direction).toBe("up");
    expect(f.levels.map((l) => l.ratio)).toEqual([...FIB_LEVELS]);
    const range = f.to.price - f.from.price;
    expect(f.levels.find((l) => l.ratio === 0.618)!.price).toBeCloseTo(f.to.price - range * 0.618, 8);
  });
  it("draws nothing without a trend", () => {
    const c = path([100, 100.1, 100, 100.1, 100, 100.1]);
    expect(structuralFib(c, analyzeStructure(c))).toBeNull();
  });
});

describe("math", () => {
  it("RSI is 100 on a monotonic rise and 50 on a flat line", () => {
    expect(rsi(Array.from({ length: 30 }, (_, i) => i + 1))).toBe(100);
    expect(rsi(Array.from({ length: 30 }, () => 5))).toBe(50);
  });
  it("correlation of a series with its negative is -1", () => {
    const a = Array.from({ length: 40 }, (_, i) => Math.sin(i));
    expect(correlation(a, a.map((v) => -v))).toBeCloseTo(-1, 10);
  });
});

describe("DXY by the ICE formula", () => {
  it("equals the constant when every pair is 1", () => {
    expect(dxyValue({ EURUSD: 1, USDJPY: 1, GBPUSD: 1, USDCAD: 1, USDSEK: 1, USDCHF: 1 })).toBeCloseTo(DXY_CONSTANT, 10);
  });
  it("gives a realistic level for realistic quotes", () => {
    const v = dxyValue({ EURUSD: 1.16, USDJPY: 152, GBPUSD: 1.31, USDCAD: 1.40, USDSEK: 9.45, USDCHF: 0.80 });
    expect(v).toBeGreaterThan(95); expect(v).toBeLessThan(103);
  });
  it("only uses bars present in all six series and never widens the range beyond open/close", () => {
    const mk = (p: number, ts: number[]) => ts.map((t) => ({ t, o: p, h: p * 1.01, l: p * 0.99, c: p * 1.001 }));
    const all = [1, 2, 3];
    const out = computeDxyCandles({ EURUSD: mk(1.16, all), USDJPY: mk(152, [1, 3]), GBPUSD: mk(1.31, all), USDCAD: mk(1.4, all), USDSEK: mk(9.45, all), USDCHF: mk(0.8, all) });
    expect(out.map((c) => c.t)).toEqual([1, 3]);
    for (const c of out) { expect(c.h).toBe(Math.max(c.o, c.c)); expect(c.l).toBe(Math.min(c.o, c.c)); }
  });
});

describe("Twelve Data adapter", () => {
  it("parses UTC datetimes and sorts ascending", () => {
    expect(parseUtc("2026-10-30 14:00:00")).toBe(Date.UTC(2026, 9, 30, 14) / 1000);
    expect(parseUtc("2026-10-30")).toBe(Date.UTC(2026, 9, 30) / 1000);
    const c = parseSeries({ status: "ok", values: [{ datetime: "2026-10-30 15:00:00", open: "2", high: "3", low: "1", close: "2.5" }, { datetime: "2026-10-30 14:00:00", open: "1", high: "2", low: "0.5", close: "2" }] });
    expect(c.map((x) => x.t)).toEqual([Date.UTC(2026, 9, 30, 14) / 1000, Date.UTC(2026, 9, 30, 15) / 1000]);
  });
  it("throws on a vendor error instead of returning empty data", () => {
    expect(() => parseSeries({ status: "error", code: 429, message: "limit" })).toThrow(/limit/);
  });
  it("sends the key in a header, not the URL", async () => {
    let seen: { url: string; auth: string | null } | null = null;
    const fake = (async (url: URL, init: RequestInit) => {
      seen = { url: String(url), auth: new Headers(init.headers).get("authorization") };
      return new Response(JSON.stringify({ status: "ok", values: [] }), { status: 200 });
    }) as unknown as typeof fetch;
    await twelveData("secret-key", fake).candles("XAU/USD", "1H", 10);
    expect(seen!.url).not.toContain("secret-key");
    expect(seen!.auth).toBe("apikey secret-key");
    expect(seen!.url).toContain("interval=1h");
  });
});

describe("freshness", () => {
  const wed = new Date("2026-10-28T14:30:00Z"); // Wednesday, market open
  it("is up to date for the current bar, delayed then stale as it ages", () => {
    expect(classifyFreshness(Date.UTC(2026, 9, 28, 14, 25) / 1000, "5M", wed)).toBe("live");
    expect(classifyFreshness(Date.UTC(2026, 9, 28, 14, 15) / 1000, "5M", wed)).toBe("delayed");
    expect(classifyFreshness(Date.UTC(2026, 9, 28, 13, 0) / 1000, "5M", wed)).toBe("stale");
  });
  it("reports closed at the weekend rather than stale", () => {
    expect(classifyFreshness(Date.UTC(2026, 9, 30, 20, 55) / 1000, "5M", new Date("2026-10-31T12:00:00Z"))).toBe("closed");
  });
});

describe("engine", () => {
  const trendUp = (n: number, base: number, step: number) => path(zigzag(Array.from({ length: n }, (_, i) => base + i * step * (i % 2 ? 1 : 0.6)), 5), step);
  it("returns Insufficient Data rather than a guess when bars are missing", () => {
    const r = analyzeInstrument({ symbol: "XAUUSD", digits: 2, now: new Date(), candles: { "4H": path([1, 2, 3]) } });
    expect(r.bias).toBe("insufficient");
    expect(r.score).toBeNull();
    expect(r.limitations.length).toBeGreaterThan(0);
  });
  it("scores a persistent uptrend bullish with explained components and zones with invalidation", () => {
    const up = trendUp(60, 2000, 10);
    const r = analyzeInstrument({ symbol: "XAUUSD", digits: 2, now: new Date(up.at(-1)!.t * 1000), candles: { "4H": up, "1H": up, "15M": up, "5M": up } });
    expect(r.bias).toBe("bullish");
    expect(r.score!).toBeGreaterThanOrEqual(25);
    expect(r.components.every((c) => c.detail.length > 0)).toBe(true);
    for (const z of r.zones) { expect(z.invalidation.text).toMatch(/1H close/); expect(z.lower).toBeLessThanOrEqual(z.upper); }
  });
  it("overall conditions are insufficient without both readings", () => {
    const r = analyzeInstrument({ symbol: "XAUUSD", digits: 2, now: new Date(), candles: {} });
    expect(overallConditions(r, r).bias).toBe("insufficient");
  });
});
