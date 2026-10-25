import { describe, expect, it } from "vitest";
import { equitySeries, monthStart, periodRange, zonedMidnight } from "./periods";
import type { ClosedTrade } from "./types";

const trade = (id: string, close: number, profit: number): ClosedTrade => ({ id, symbol: "XAUUSD", side: "buy", volume: 1, openTime: close - 600, closeTime: close, profit, commission: -1, swap: 0, fees: 0 });

describe("periods", () => {
  it("finds local midnight across DST zones", () => {
    expect(zonedMidnight(2026, 7, 1, "UTC")).toBe(Date.UTC(2026, 6, 1) / 1000);
    expect(zonedMidnight(2026, 7, 1, "Europe/London")).toBe(Date.UTC(2026, 5, 30, 23) / 1000);
    expect(zonedMidnight(2026, 1, 15, "America/New_York")).toBe(Date.UTC(2026, 0, 15, 5) / 1000);
    expect(zonedMidnight(2026, 3, 8, "America/New_York")).toBe(Date.UTC(2026, 2, 8, 5) / 1000);
  });

  it("starts This Month in the user's zone, not UTC", () => {
    const now = new Date(Date.UTC(2026, 9, 1, 2)); // 1 Oct 02:00 UTC = 30 Sep in New York
    expect(monthStart(now, "UTC")).toBe(Date.UTC(2026, 9, 1) / 1000);
    expect(monthStart(now, "America/New_York")).toBe(Date.UTC(2026, 8, 1, 4) / 1000);
  });

  it("makes custom ranges inclusive and order-independent", () => {
    const now = new Date(Date.UTC(2026, 9, 20));
    const r = periodRange("CUSTOM", now, "UTC", { from: "2026-10-10", to: "2026-10-05" });
    expect(r).toEqual({ from: Date.UTC(2026, 9, 5) / 1000, to: Date.UTC(2026, 9, 11) / 1000 });
  });

  it("builds an equity curve continuous with prior history", () => {
    const trades = [trade("a", 100, 50), trade("b", 200, -20), trade("c", 300, 30)];
    const s = equitySeries(trades, 1000, { from: 150, to: 1000 });
    expect(s.map((p) => p.equity)).toEqual([1049, 1028, 1057]);
    expect(equitySeries(trades, 1000, { from: null, to: 1000 })).toHaveLength(4);
  });
});
