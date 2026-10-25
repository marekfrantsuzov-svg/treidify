import { describe, expect, it } from "vitest";
import { byMonth, bySide, bySymbol, byWeekday, drawdownSeries, holdingHours } from "./breakdown";
import type { ClosedTrade } from "./types";

const t = (id: string, open: string, close: string, profit: number, symbol = "XAUUSD", side: "buy" | "sell" = "buy"): ClosedTrade => ({
  id, symbol, side, volume: 1, openTime: Date.parse(open) / 1000, closeTime: Date.parse(close) / 1000, profit, commission: -2, swap: 0, fees: 0,
});

const trades = [
  t("a", "2026-01-30T22:00:00Z", "2026-01-31T23:30:00Z", 102), // closes 1 Feb in Tokyo
  t("b", "2026-02-02T09:00:00Z", "2026-02-02T11:00:00Z", -48, "DXY", "sell"),
  t("c", "2026-02-03T09:00:00Z", "2026-02-03T10:00:00Z", 52),
];

describe("breakdowns", () => {
  it("groups months in the user's time zone with net after costs", () => {
    expect(byMonth(trades, "UTC").map((m) => [m.month, m.net])).toEqual([["2026-01", 100], ["2026-02", 0]]);
    expect(byMonth(trades, "Asia/Tokyo").map((m) => [m.month, m.trades])).toEqual([["2026-02", 3]]);
  });
  it("splits by symbol, side and weekday", () => {
    expect(bySymbol(trades).map((g) => [g.key, g.metrics.tradeCount])).toEqual([["XAUUSD", 2], ["DXY", 1]]);
    expect(bySide(trades).find((g) => g.key === "sell")!.label).toBe("Short");
    expect(byWeekday(trades, "UTC").map((g) => g.key)).toEqual(["Mon", "Tue", "Fri"]);
  });
  it("measures drawdown from the running peak", () => {
    const dd = drawdownSeries([{ t: 1, equity: 100 }, { t: 2, equity: 120 }, { t: 3, equity: 90 }, { t: 4, equity: 130 }]);
    expect(dd.map((p) => Math.round(p.dd))).toEqual([0, 0, -25, 0]);
  });
  it("averages holding time for winners and losers", () => {
    const h = holdingHours(trades);
    expect(h.losers).toBe(2);
    expect(h.winners).toBeCloseTo((25.5 + 1) / 2);
  });
});
