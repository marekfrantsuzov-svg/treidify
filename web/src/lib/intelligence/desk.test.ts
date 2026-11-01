import { describe, expect, it } from "vitest";
import type { InstrumentIntel, Zone } from "./engine";
import { tradeSetup } from "./setup";
import { dxyRelation, headlinesAbout, momentumLabel, scenarios, silverRelation, zoneBrief } from "./desk";

function zone(p: { lower: number; upper: number; inv: number; side?: "buy" | "sell"; withTrend?: boolean; status?: Zone["status"] }): Zone {
  const side = p.side ?? "buy";
  return { id: `${side}-${p.lower}`, side, lower: p.lower, upper: p.upper, timeframe: "1H", reasons: ["1H support formed by 3 swing lows"], withTrend: p.withTrend ?? true,
    confirmation: "Wait for 5M confirmation.", invalidation: { level: p.inv, text: "inv" }, status: p.status ?? "in-zone", distanceATR: 0 };
}
function intel(extra: Partial<InstrumentIntel> = {}): InstrumentIntel {
  return {
    symbol: "XAUUSD", engine: "mtf-structure-v2" as never, asOf: "2026-11-01T10:00:00Z", lastPrice: 3968.2, digits: 2, bias: "bullish", score: 60, confidence: "high",
    components: [], limitations: [], trends: { "4H": "bullish", "1H": "bullish", "15M": null, "5M": null }, structure: [], fib: null,
    levels: [{ id: "r1", kind: "resistance", lower: 3976, upper: 3977, touches: 3, lastTouch: 0, swingIndices: [] }] as never, liquidity: [], sweeps: [], zones: [], bubbles: [], invalidation: null, volatility: null,
    ...extra,
  };
}

describe("zone readiness obeys the 50-pip XAUUSD rule", () => {
  it("marks a zone WAIT when its structural stop is over 50 pips, without tightening", () => {
    const z = zone({ lower: 3962, upper: 3972, inv: 3948 });
    const i = intel({ zones: [z] });
    const b = zoneBrief(i, z, tradeSetup(i));
    expect(b.readiness).toBe("wait");
    expect(b.stopPips).toBe(240);
    expect(b.readinessText).toMatch(/NO VALID SETUP/);
    expect(b.readinessText).toMatch(/\$5\.00/);
    expect(b.diagram.stop).toBe(3948);
  });
  it("marks the setup's zone ready when the stop fits and 5M has confirmed", () => {
    const z = zone({ lower: 3965.5, upper: 3970, inv: 3965, status: "confirmed" });
    const i = intel({ zones: [z] });
    const b = zoneBrief(i, z, tradeSetup(i));
    expect(b.readiness).toBe("ready");
    expect(b.stopPips).toBe(50);
  });
  it("keeps counter-trend zones on wait", () => {
    const z = zone({ lower: 3965.5, upper: 3970, inv: 3965, withTrend: false });
    const i = intel({ zones: [z] });
    expect(zoneBrief(i, z, tradeSetup(i)).readiness).toBe("wait");
  });
});

describe("scenarios", () => {
  it("marks WAIT active when there is no valid setup", () => {
    const i = intel({ bias: "neutral" });
    const s = scenarios(i, tradeSetup(i));
    expect(s.find((x) => x.active)?.id).toBe("wait");
  });
});

describe("relationships never assume the inverse DXY link", () => {
  it("reports moving together when both are bullish", () => {
    const r = dxyRelation(intel(), intel({ symbol: "DXY" }));
    expect(r.label).toBe("Moving together");
    expect(r.text).toMatch(/not holding/);
  });
  it("says the link is weak when opposite but no correlation was measured", () => {
    const r = dxyRelation(intel(), intel({ symbol: "DXY", bias: "bearish" }));
    expect(r.label).toBe("Opposite, link weak");
  });
  it("silver confirming and diverging", () => {
    expect(silverRelation(intel(), intel({ symbol: "XAGUSD" })).label).toBe("Confirms Gold");
    expect(silverRelation(intel(), intel({ symbol: "XAGUSD", bias: "bearish" })).label).toBe("Diverges from Gold");
  });
});

describe("helpers", () => {
  it("momentum bands", () => {
    expect(momentumLabel(null).label).toBe("Unavailable");
    expect(momentumLabel(72).label).toBe("Stretched up");
    expect(momentumLabel(50).label).toBe("Flat");
  });
  it("topic filter only returns matching headlines", () => {
    const h = [{ title: "Fed holds rates", source: "x", url: "u", publishedAt: "", instruments: [], importance: "high" as const }, { title: "Apple earnings", source: "x", url: "u", publishedAt: "", instruments: [], importance: "low" as const }];
    expect(headlinesAbout(h, "cb").map((x) => x.title)).toEqual(["Fed holds rates"]);
    expect(headlinesAbout(h, "geo")).toEqual([]);
  });
});

describe("rsiOf", () => {
  it("reads the RSI from the engine's sentence, including the trailing full stop", async () => {
    const { rsiOf } = await import("./desk");
    expect(rsiOf(intel({ components: [{ id: "momentum", label: "", weight: 10, value: 0, contribution: 0, detail: "RSI(14) on 1H is 52.3." }] }))).toBe(52.3);
  });
});
