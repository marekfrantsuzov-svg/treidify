import { describe, expect, it } from "vitest";
import { bestWorstDays, buckets, weekStart } from "./journal-summary";
import type { ClosedTrade } from "./types";

const t = (id: string, iso: string, profit: number, commission = 0, swap = 0): ClosedTrade => ({ id, symbol: "XAUUSD", side: "buy", volume: 0.1, openTime: Date.parse(iso) / 1000 - 600, closeTime: Date.parse(iso) / 1000, profit, commission, swap, fees: 0 });

describe("journal summary", () => {
  const trades = [
    t("a", "2026-10-26T09:00:00Z", 100, -3.5, -1), // Mon, net 95.5
    t("b", "2026-10-26T15:00:00Z", -40, -3.5),     // Mon, net -43.5
    t("c", "2026-10-28T10:00:00Z", -80, -3.5),     // Wed, net -83.5
    t("d", "2026-11-02T08:00:00Z", 50, -3.5, 2),   // next Mon, net 48.5
  ];
  it("weeks start on Monday", () => {
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // Sunday belongs to the week of Mon 26 Oct
    expect(weekStart("2026-11-02")).toBe("2026-11-02");
  });
  it("buckets net after commission and swap, newest first", () => {
    const d = buckets(trades, "UTC", "day");
    expect(d.map((b) => b.key)).toEqual(["2026-11-02", "2026-10-28", "2026-10-26"]);
    expect(d[2]!.net).toBeCloseTo(52, 6);
    expect(d[2]).toMatchObject({ trades: 2, wins: 1, losses: 1, winRate: 0.5 });
    const w = buckets(trades, "UTC", "week");
    expect(w.map((b) => [b.key, +b.net.toFixed(2)])).toEqual([["2026-11-02", 48.5], ["2026-10-26", -31.5]]);
    const m = buckets(trades, "UTC", "month");
    expect(m.map((b) => [b.key, +b.net.toFixed(2)])).toEqual([["2026-11", 48.5], ["2026-10", -31.5]]);
  });
  it("uses the trader's time zone for the day", () => {
    // 22:30 UTC on 1 Nov is 00:30 on 2 Nov in Tallinn (UTC+2 in winter)
    const x = [t("z", "2026-11-01T22:30:00Z", 10)];
    expect(buckets(x, "Europe/Tallinn", "day")[0]!.key).toBe("2026-11-02");
    expect(buckets(x, "UTC", "day")[0]!.key).toBe("2026-11-01");
  });
  it("finds best and worst days and counts green/red days", () => {
    const r = bestWorstDays(trades, "UTC");
    expect(r.best?.key).toBe("2026-10-26");
    expect(r.worst?.key).toBe("2026-10-28");
    expect([r.green, r.red]).toEqual([2, 1]);
    expect(bestWorstDays([], "UTC")).toEqual({ best: null, worst: null, green: 0, red: 0 });
  });
});
