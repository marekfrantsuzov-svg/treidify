import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/analytics/types";
import { sampleMtf } from "@/lib/demo/markets";
import { computeOverlays, fibScenarios, liquidityBands, volumeInfo, zoneReadiness, type SDZone, type TfOverlays } from "./overlays";
import { FIB_LEVELS } from "./fibonacci";

/** Gentle oscillation around `mid` with small bodies, so ATR is ~1 and no candle is a displacement. */
function chop(n: number, mid: number, t0 = 1_700_000_000, step = 300): Candle[] {
  return Array.from({ length: n }, (_, i) => {
    const o = mid + Math.sin(i / 2) * 0.6, c = mid + Math.sin((i + 1) / 2) * 0.6;
    return { t: t0 + i * step, o, c, h: Math.max(o, c) + 0.3, l: Math.min(o, c) - 0.3 };
  });
}
const bar = (t: number, o: number, c: number, wick = 0.2): Candle => ({ t, o, c, h: Math.max(o, c) + wick, l: Math.min(o, c) - wick });

describe("supply and demand zones come from structure, per timeframe", () => {
  // 60 bars of chop around 4000, a bearish base candle, then a strong bullish displacement and drift higher.
  function demandSeries(extra: (t: number) => Candle[] = () => []): Candle[] {
    const c = chop(60, 4000);
    let t = c.at(-1)!.t + 300;
    c.push(bar(t, 4000.4, 3999.6)); t += 300; // base: bearish candle 3999.4 – 4000.4
    c.push(bar(t, 3999.6, 4004.5, 0.1)); t += 300; // displacement: body 4.9 ≈ 4–5 × ATR
    for (let i = 0; i < 12; i++) { c.push(bar(t, 4004.5 + i * 0.2, 4004.7 + i * 0.2)); t += 300; }
    return [...c, ...extra(t)];
  }

  it("draws a demand zone at the base candle before a bullish displacement, with exact boundaries", () => {
    const o = computeOverlays({ symbol: "XAUUSD", tf: "15M", digits: 2, candles: demandSeries() });
    const z = o.zones.find((x) => x.kind === "demand" && x.status === "active")!;
    expect(z).toBeDefined();
    expect(z.tf).toBe("15M");
    expect(z.lower).toBeCloseTo(3999.4, 6); // base low
    expect(z.upper).toBeCloseTo(4000.4, 6); // base body top
    expect(z.originIndex).toBe(60);
    expect(z.side).toBe("buy");
    expect(z.invalidation).toBeLessThan(z.lower);
    expect(z.proximal).toBe(z.upper);
  });

  it("marks a zone tested after price returns into it, and invalidated after a close through the far edge", () => {
    const tested = demandSeries((t) => [bar(t, 4002, 4000.1), bar(t + 300, 4000.1, 4003)]);
    expect(computeOverlays({ symbol: "XAUUSD", tf: "15M", digits: 2, candles: tested }).zones.find((z) => z.originIndex === 60)?.status).toBe("tested");
    const broken = demandSeries((t) => [bar(t, 4002, 3999), bar(t + 300, 3999, 3998.5)]);
    const z = computeOverlays({ symbol: "XAUUSD", tf: "15M", digits: 2, candles: broken }).zones.find((x) => x.originIndex === 60);
    expect(z?.status).toBe("invalidated");
    expect(z?.invalidatedIndex).toBe(74);
  });

  it("recomputes for each timeframe: different candles give different, timeframe-tagged zones", () => {
    const m = sampleMtf("XAUUSD");
    const a = computeOverlays({ symbol: "XAUUSD", tf: "15M", digits: 2, candles: m["15M"] });
    const b = computeOverlays({ symbol: "XAUUSD", tf: "4H", digits: 2, candles: m["4H"] });
    expect(a.zones.length).toBeGreaterThan(0);
    expect(b.zones.length).toBeGreaterThan(0);
    expect(a.zones.every((z) => z.tf === "15M")).toBe(true);
    expect(b.zones.every((z) => z.tf === "4H")).toBe(true);
    expect(a.zones.map((z) => z.id)).not.toEqual(b.zones.map((z) => z.id));
  });

  it("is deterministic and draws nothing without enough bars", () => {
    const m = sampleMtf("XAUUSD")["1H"];
    expect(computeOverlays({ symbol: "XAUUSD", tf: "1H", digits: 2, candles: m })).toEqual(computeOverlays({ symbol: "XAUUSD", tf: "1H", digits: 2, candles: m }));
    const few = computeOverlays({ symbol: "XAUUSD", tf: "1H", digits: 2, candles: m.slice(0, 20) });
    expect(few.zones).toEqual([]);
    expect(few.fib.active).toBeNull();
    expect(few.limitations[0]).toMatch(/at least 40/);
  });

  it("measures every zone's stop with the gold pip rule (1 pip = $0.10)", () => {
    const o = computeOverlays({ symbol: "XAUUSD", tf: "1H", digits: 2, candles: sampleMtf("XAUUSD")["1H"] });
    for (const z of o.zones) {
      expect(z.stop.pips).toBeCloseTo(Math.abs(z.proximal - z.invalidation) / 0.1, 0);
      expect(z.stop.eligible).toBe(z.stop.pips <= 50);
    }
  });
});

describe("zone readiness never fires on a touch alone", () => {
  const base = (z: Partial<SDZone>, o: Partial<TfOverlays> = {}): [TfOverlays, SDZone] => {
    const zone = { id: "z", side: "buy", kind: "demand", tf: "15M", lower: 3995, upper: 3998, originIndex: 10, originT: 0, displacementIndex: 11, displacementATR: 2, brokeStructure: null, status: "tested", tests: 1, firstTestIndex: 50, invalidatedIndex: null, strength: "moderate", invalidation: 3994.5, proximal: 3998, stop: { pips: 35, priceDistance: 3.5, max: 50, maxPrice: 5, eligible: true }, fib: [], liquidity: null, reasons: [], ...z } as SDZone;
    const ov = { version: "tf-overlays-v1", symbol: "XAUUSD", tf: "15M", digits: 2, bars: 100, atr: 2, last: 3997, trend: "bullish", zones: [zone], fib: { bullish: null, bearish: null, active: null }, liquidity: [], structure: { events: [], swings: [], displacement: [] }, volume: { kind: "none", label: "", note: "", rel: [], highIndices: [] }, limitations: [], ...o } as TfOverlays;
    return [ov, zone];
  };
  it("price inside the zone without a confirming break is WAIT", () => {
    const [o, z] = base({});
    const r = zoneReadiness(o, z, "bullish");
    expect(r.status).toBe("wait");
    expect(r.checks.find((c) => c.id === "confirm")?.done).toBe(false);
    expect(r.headline).toMatch(/Still missing/);
  });
  it("with alignment, a confirming break and a stop inside 50 pips it is valid", () => {
    const [o, z] = base({}, { structure: { events: [{ kind: "CHOCH", direction: "bullish", index: 60, t: 0, level: 3999, swing: { kind: "high", index: 55, t: 0, price: 3999 } }], swings: [], displacement: [] } });
    expect(zoneReadiness(o, z, "bullish").status).toBe("valid");
    expect(zoneReadiness(o, z, "bearish").status).toBe("wait");
  });
  it("51 pips is WAIT / NO VALID SETUP even if everything else lines up", () => {
    const [o, z] = base({ stop: { pips: 51, priceDistance: 5.1, max: 50, maxPrice: 5, eligible: false } }, { structure: { events: [{ kind: "CHOCH", direction: "bullish", index: 60, t: 0, level: 3999, swing: { kind: "high", index: 55, t: 0, price: 3999 } }], swings: [], displacement: [] } });
    const r = zoneReadiness(o, z, "bullish");
    expect(r.status).toBe("wait");
    expect(r.headline).toMatch(/NO VALID SETUP.*51 pips.*\$5\.00/);
  });
});

describe("Fibonacci anchors and prices", () => {
  it("anchors the bullish retracement from the swing low to the highest high since, at every ratio", () => {
    const candles: Candle[] = Array.from({ length: 12 }, (_, i) => bar(1_700_000_000 + i * 300, 100, 100));
    candles[2] = { ...candles[2]!, l: 90 };
    candles[8] = { ...candles[8]!, h: 120 };
    const swings = [{ kind: "low" as const, index: 2, t: candles[2]!.t, price: 90 }, { kind: "high" as const, index: 8, t: candles[8]!.t, price: 120 }];
    const f = fibScenarios(candles, swings, "bullish", "1H");
    expect(f.active).toBe("bullish");
    expect(f.bullish!.from.price).toBe(90);
    expect(f.bullish!.to.price).toBe(120);
    expect(f.bullish!.tf).toBe("1H");
    expect(f.bullish!.levels.map((l) => l.ratio)).toEqual([...FIB_LEVELS]);
    const at = (r: number) => f.bullish!.levels.find((l) => l.ratio === r)!.price;
    expect(at(0.236)).toBeCloseTo(120 - 30 * 0.236);
    expect(at(0.5)).toBeCloseTo(105);
    expect(at(0.618)).toBeCloseTo(101.46);
    expect(at(0.886)).toBeCloseTo(93.42);
    expect(f.bearish).toBeNull();
  });
  it("draws the bearish retracement upward from the low, and voids a leg once price closes beyond its origin", () => {
    const candles: Candle[] = Array.from({ length: 12 }, (_, i) => bar(1_700_000_000 + i * 300, 100, 100));
    candles[2] = { ...candles[2]!, h: 110 };
    candles[7] = { ...candles[7]!, l: 80 };
    const swings = [{ kind: "high" as const, index: 2, t: 0, price: 110 }, { kind: "low" as const, index: 7, t: 0, price: 80 }];
    const f = fibScenarios(candles, swings, "bearish", "4H");
    expect(f.bearish!.levels.find((l) => l.ratio === 0.618)!.price).toBeCloseTo(80 + 30 * 0.618);
    const voided = [...candles, bar(1_800_000_000, 100, 111)];
    expect(fibScenarios(voided, swings, "bearish", "4H").bearish).toBeNull();
  });
});

describe("liquidity", () => {
  it("finds equal highs, and tells swept (wick through, close back) from unswept", () => {
    const c = chop(30, 100);
    const highs = [10, 18];
    for (const i of highs) c[i] = { ...c[i]!, h: 103 };
    const swings = highs.map((i) => ({ kind: "high" as const, index: i, t: c[i]!.t, price: 103 }));
    const unswept = liquidityBands(c, swings, 1);
    const eq = unswept.find((b) => b.kind === "equal-highs")!;
    expect(eq.state).toBe("unswept");
    expect(eq.side).toBe("buy");
    expect(eq.estimate).toBe("Medium");
    c[25] = { ...c[25]!, h: 103.6, c: 102.5 };
    expect(liquidityBands(c, swings, 1).find((b) => b.kind === "equal-highs")?.state).toBe("swept");
  });
  it("labels estimates qualitatively and never as order-book liquidity", () => {
    const o = computeOverlays({ symbol: "XAUUSD", tf: "1H", digits: 2, candles: sampleMtf("XAUUSD")["1H"] });
    for (const b of o.liquidity) expect(["High", "Medium", "Low"]).toContain(b.estimate);
  });
});

describe("data-source labelling for volume", () => {
  it("says volume is unavailable when the source has none", () => {
    const v = volumeInfo("XAUUSD", chop(30, 100));
    expect(v.kind).toBe("none");
    expect(v.label).toBe("Volume unavailable");
  });
  it("calls spot gold volume tick volume, never exchange volume, and flags relative-volume spikes", () => {
    const c = chop(40, 100).map((x) => ({ ...x, v: 100 }));
    c[35] = { ...c[35]!, v: 400 };
    const v = volumeInfo("XAUUSD", c);
    expect(v.kind).toBe("tick");
    expect(v.label).toBe("Tick volume");
    expect(v.note).toMatch(/cannot show who bought or sold/);
    expect(v.highIndices).toContain(35);
    expect(volumeInfo("XAUUSD", c, true).label).toBe("Sample volume");
  });
});
