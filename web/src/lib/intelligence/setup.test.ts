import { describe, expect, it } from "vitest";
import type { InstrumentIntel, Zone } from "./engine";
import { pips, tradeSetup } from "./setup";

function zone(p: Partial<Zone> & { lower: number; upper: number; inv: number; side?: "buy" | "sell" }): Zone {
  const side = p.side ?? "buy";
  return {
    id: `${side}-${p.lower}-${p.upper}`, side, lower: p.lower, upper: p.upper, timeframe: "1H", reasons: ["1H support formed by 3 swing lows"], withTrend: p.withTrend ?? true,
    confirmation: "Wait for 5M confirmation.", invalidation: { level: p.inv, text: "" }, status: p.status ?? "in-zone", distanceATR: 0,
  };
}
function gold(zones: Zone[], extra: Partial<InstrumentIntel> = {}): InstrumentIntel {
  return {
    symbol: "XAUUSD", engine: "mtf-structure-v2" as never, asOf: "2026-11-01T10:00:00Z", lastPrice: 3968.2, digits: 2, bias: "bullish", score: 60, confidence: "high",
    components: [], limitations: [], trends: { "4H": "bullish", "1H": "bullish", "15M": null, "5M": null }, structure: [], fib: null,
    levels: [{ id: "r1", kind: "resistance", lower: 3976, upper: 3977, touches: 3, lastTouch: 0, swingIndices: [] }], liquidity: [], sweeps: [], zones, bubbles: [], invalidation: null, volatility: null,
    ...extra,
  };
}

describe("gold pip convention (1 pip = $0.10)", () => {
  it("$1.00 is 10 pips and $5.00 is 50 pips", () => {
    expect(pips("XAUUSD", 1)).toBe(10);
    expect(pips("XAUUSD", 3970 - 3965)).toBe(50);
    expect(pips("XAUUSD", 10)).toBe(100);
  });
  it("does not treat $0.50 as 50 pips", () => {
    expect(pips("XAUUSD", 0.5)).toBe(5);
  });
});

describe("50-pip ($5.00) structural stop rule for XAUUSD", () => {
  it("accepts a confirmed setup whose structural stop is exactly 50 pips ($5.00)", () => {
    const s = tradeSetup(gold([zone({ lower: 3965.5, upper: 3970, inv: 3965, status: "confirmed" })]));
    expect(s.status).toBe("valid");
    expect(s.stopPips).toBe(50);
    expect(s.stop).toBe(3965);
    expect(s.targets[0]).toBe(3976);
  });
  it("returns WAIT when the structural stop needs more than 50 pips, and never tightens it", () => {
    const s = tradeSetup(gold([zone({ lower: 3962, upper: 3972, inv: 3948 })]));
    expect(s.status).toBe("wait");
    expect(s.stopPips).toBe(240);
    expect(s.stop).toBe(3948);
    expect(s.reasons.join(" ")).toMatch(/50-pip maximum \(\$5\.00/);
  });
  it("51 pips is already WAIT, measured from the zone edge price reaches first", () => {
    // 1.10 from the lower edge (11 pips) but 5.10 from the upper edge, which price reaches first: 51 pips.
    const s = tradeSetup(gold([zone({ lower: 3966, upper: 3970, inv: 3964.9 })]));
    expect(s.stopPips).toBe(51);
    expect(s.status).toBe("wait");
    expect(s.stop).toBe(3964.9);
  });
  it("applies to sell setups too", () => {
    const s = tradeSetup(gold([zone({ side: "sell", lower: 3975, upper: 3977, inv: 3980.5 })], { bias: "bearish", levels: [{ id: "s1", kind: "support", lower: 3960, upper: 3961, touches: 2, lastTouch: 0, swingIndices: [] }] }));
    expect(s.side).toBe("sell");
    expect(s.stopPips).toBe(55);
    expect(s.status).toBe("wait");
  });
  it("accepts a sell whose stop fits", () => {
    const s = tradeSetup(gold([zone({ side: "sell", lower: 3975, upper: 3977, inv: 3978.5, status: "confirmed" })], { bias: "bearish", levels: [{ id: "s1", kind: "support", lower: 3960, upper: 3961, touches: 2, lastTouch: 0, swingIndices: [] }] }));
    expect(s.stopPips).toBe(35);
    expect(s.status).toBe("valid");
    expect(s.targets[0]).toBe(3961);
  });
  it("never calls a setup just because price is inside or near a zone", () => {
    const inZone = tradeSetup(gold([zone({ lower: 3965.5, upper: 3970, inv: 3965, status: "in-zone" })]));
    expect(inZone.status).toBe("wait");
    expect(inZone.reasons[0]).toMatch(/confirmation has not printed/);
    expect(inZone.stopPips).toBe(50);
    expect(tradeSetup(gold([zone({ lower: 3965.5, upper: 3970, inv: 3965, status: "watching" })])).status).toBe("wait");
  });
  it("is WAIT with mixed structure or no with-trend zone", () => {
    expect(tradeSetup(gold([], { bias: "neutral" })).status).toBe("wait");
    expect(tradeSetup(gold([zone({ lower: 3965.5, upper: 3970, inv: 3965, withTrend: false })])).status).toBe("wait");
  });
  it("is WAIT when no target is at least 1R away", () => {
    const s = tradeSetup(gold([zone({ lower: 3965.5, upper: 3970, inv: 3965, status: "confirmed" })], { levels: [{ id: "r1", kind: "resistance", lower: 3971, upper: 3972, touches: 2, lastTouch: 0, swingIndices: [] }] }));
    expect(s.status).toBe("wait");
  });
});
