import { describe, expect, it } from "vitest";
import type { InstrumentIntel } from "./engine";
import { goldImpact } from "./gold-impact";

const intel = (symbol: string, bias: InstrumentIntel["bias"]) => ({ symbol, bias, asOf: "2026-11-01T10:00:00Z" }) as unknown as InstrumentIntel;
const now = new Date("2026-11-01T10:00:00Z");

describe("News Impact on Gold", () => {
  it("is bullish when the dollar is bearish and gold structure is bullish, with low uncertainty and no event", () => {
    const r = goldImpact(intel("XAUUSD", "bullish"), intel("DXY", "bearish"), [], [], now);
    expect(r.read).toBe("bullish");
    expect(r.label).toBe("Bullish for Gold");
    expect(r.uncertainty).toBe("low");
  });
  it("marks high uncertainty when a US high-impact event is within 24 hours", () => {
    const r = goldImpact(intel("XAUUSD", "bullish"), intel("DXY", "bearish"), [], [{ title: "CPI (YoY)", country: "US", at: "2026-11-01T13:30:00Z", importance: "high" }], now);
    expect(r.uncertainty).toBe("high");
    expect(r.reasons.join(" ")).toMatch(/CPI \(YoY\) is due within 24 hours/);
  });
  it("is mixed when the dollar and gold disagree", () => {
    const r = goldImpact(intel("XAUUSD", "bearish"), intel("DXY", "bearish"), [], [], now);
    expect(r.read).toBe("mixed");
    expect(r.uncertainty).toBe("high");
  });
  it("never reports a reading without data", () => {
    expect(goldImpact(intel("XAUUSD", "insufficient"), intel("DXY", "insufficient"), [], [], now).read).toBe("insufficient");
  });
  it("lists recent gold and dollar headlines without scoring them", () => {
    const h = [{ title: "Gold steadies", source: "Reuters", publishedAt: "2026-11-01T08:00:00Z", importance: "medium" as const, instruments: ["XAUUSD"] }, { title: "Old", source: "X", publishedAt: "2026-10-29T08:00:00Z", importance: "high" as const, instruments: ["XAUUSD"] }];
    const r = goldImpact(intel("XAUUSD", "bullish"), intel("DXY", "bearish"), h, [], now);
    expect(r.headlines.map((x) => x.title)).toEqual(["Gold steadies"]);
  });
});

describe("News Impact on Gold: evidence and freshness", () => {
  const g = intel("XAUUSD", "bullish"), d = intel("DXY", "bearish");
  it("refuses a read on sample bars", () => {
    const r = goldImpact(g, d, [], [], now, { market: { mode: "sample", freshness: null, vendor: null, asOf: now.toISOString() } });
    expect(r.read).toBe("insufficient");
    expect(r.missing[0]).toMatch(/Live Gold and DXY/);
  });
  it("refuses a read on stale bars", () => {
    expect(goldImpact(g, d, [], [], now, { market: { mode: "live", freshness: "stale", vendor: "twelvedata", asOf: now.toISOString() } }).read).toBe("insufficient");
  });
  it("lists macro evidence, recent releases and missing sources with times", () => {
    const r = goldImpact(g, d, [], [{ title: "CPI y/y", country: "US", at: "2026-10-31T12:30:00Z", importance: "high", actual: "3.0%", previous: "2.9%", status: "released" }], now,
      { market: { mode: "live", freshness: "live", vendor: "twelvedata", asOf: now.toISOString() }, macro: [{ label: "Fed target", detail: "3.75–4.00%", at: "2026-10-28", source: "Federal Reserve" }], newsOk: false });
    expect(r.read).toBe("bullish");
    expect(r.evidence.map((e) => e.kind)).toEqual(["market", "macro", "release"]);
    expect(r.missing).toEqual(["News feed"]);
    expect(r.reasons.join(" ")).toMatch(/CPI y\/y came in at 3.0%/);
    expect(r.calculatedAt).toBe(now.toISOString());
  });
});
