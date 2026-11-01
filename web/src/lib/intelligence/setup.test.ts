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
    symbol: "XAUUSD", engine: "mtf-structure-v2" as never, asOf: "2026-11-01T10:00:00Z", lastPrice: 3970.2, digits: 2, bias: "bullish", score: 60, confidence: "high",
    components: [], limitations: [], trends: { "4H": "bullish", "1H": "bullish", "15M": null, "5M": null }, structure: [], fib: null,
    levels: [{ id: "r1", kind: "resistance", lower: 3971.5, upper: 3972, touches: 3, lastTouch: 0, swingIndices: [] }], liquidity: [], sweeps: [], zones, bubbles: [], invalidation: null, volatility: null,
    ...extra,
  };
}

describe("gold pip convention", () => {
  it("$1.00 is 100 pips and $0.50 is 50 pips", () => {
    expect(pips("XAUUSD", 1)).toBe(100);
    expect(pips("XAUUSD", 3970 - 3969.5)).toBe(50);
  });
});

describe("50-pip stop-loss rule for XAUUSD", () => {
  it("accepts a setup whose structural stop is exactly 50 pips", () => {
    const s = tradeSetup(gold([zone({ lower: 3969.8, upper: 3970, inv: 3969.5 })]));
    expect(s.status).toBe("valid");
    expect(s.stopPips).toBe(50);
    expect(s.stop).toBe(3969.5);
    expect(s.targets[0]).toBe(3971.5);
  });
  it("returns WAIT when the structural stop needs more than 50 pips, and never tightens it", () => {
    const s = tradeSetup(gold([zone({ lower: 3962, upper: 3972, inv: 3948 })]));
    expect(s.status).toBe("wait");
    expect(s.stopPips).toBe(2400);
    expect(s.stop).toBe(3948);
    expect(s.reasons.join(" ")).toMatch(/50-pip maximum/);
  });
  it("measures from the zone edge price reaches first, not the far edge", () => {
    // Stop is 0.40 from the lower edge but 0.60 from the upper edge: 60 pips, so WAIT.
    const s = tradeSetup(gold([zone({ lower: 3969.8, upper: 3970, inv: 3969.4 })]));
    expect(s.stopPips).toBe(60);
    expect(s.status).toBe("wait");
  });
  it("applies to sell setups too", () => {
    const s = tradeSetup(gold([zone({ side: "sell", lower: 3975, upper: 3975.2, inv: 3975.9 })], { bias: "bearish", levels: [{ id: "s1", kind: "support", lower: 3970, upper: 3970.5, touches: 2, lastTouch: 0, swingIndices: [] }] }));
    expect(s.side).toBe("sell");
    expect(s.stopPips).toBe(90);
    expect(s.status).toBe("wait");
  });
  it("is WAIT with mixed structure or no with-trend zone", () => {
    expect(tradeSetup(gold([], { bias: "neutral" })).status).toBe("wait");
    expect(tradeSetup(gold([zone({ lower: 3969.8, upper: 3970, inv: 3969.5, withTrend: false })])).status).toBe("wait");
  });
  it("is WAIT when no target is at least 1R away", () => {
    const s = tradeSetup(gold([zone({ lower: 3969.8, upper: 3970, inv: 3969.5 })], { levels: [{ id: "r1", kind: "resistance", lower: 3970.2, upper: 3970.3, touches: 2, lastTouch: 0, swingIndices: [] }] }));
    expect(s.status).toBe("wait");
  });
});
