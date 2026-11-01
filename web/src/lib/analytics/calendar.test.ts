import { describe, expect, it } from "vitest";
import { dayKey, pnlCalendar, tradedMonths } from "./calendar";
import type { ClosedTrade } from "./types";

const t = (id: string, iso: string, profit: number, extra: Partial<ClosedTrade> = {}): ClosedTrade => {
  const s = Date.parse(iso) / 1000;
  return { id, symbol: "XAUUSD", side: "buy", volume: 0.1, openTime: s - 600, closeTime: s, profit, commission: 0, swap: 0, fees: 0, ...extra };
};

describe("journal P&L calendar", () => {
  const trades = [
    t("a", "2026-10-05T10:00:00Z", 120),
    t("b", "2026-10-05T14:00:00Z", -40, { commission: -2 }),
    t("c", "2026-10-07T09:00:00Z", -75.5),
    t("d", "2026-10-20T16:00:00Z", 30, { swap: -1.25, fees: -0.75 }),
    t("e", "2026-09-30T10:00:00Z", 999), // previous month
  ];
  const m = pnlCalendar(trades, 2026, 10, "UTC");

  it("sums realized net P&L per close day, including commission, swap and fees", () => {
    expect(m.days).toHaveLength(31);
    expect(m.days[4]).toMatchObject({ key: "2026-10-05", net: 78, trades: 2, wins: 1, losses: 1 });
    expect(m.days[6]!.net).toBe(-75.5);
    expect(m.days[19]!.net).toBe(28);
    expect(m.days[0]!.trades).toBe(0);
  });
  it("computes monthly net, trade count, win rate and best / worst day", () => {
    expect(m.net).toBe(30.5);
    expect(m.trades).toBe(4);
    expect(m.wins).toBe(2);
    expect(m.winRate).toBe(0.5);
    expect(m.tradingDays).toBe(3);
    expect(m.best?.key).toBe("2026-10-05");
    expect(m.worst?.key).toBe("2026-10-07");
  });
  it("starts weeks on Monday (1 Oct 2026 is a Thursday)", () => {
    expect(m.lead).toBe(3);
  });
  it("books a trade on the trader's local close date", () => {
    // 23:30 UTC on 31 Oct is already 1 Nov in Tokyo.
    const late = [t("x", "2026-10-31T23:30:00Z", 50)];
    expect(pnlCalendar(late, 2026, 10, "UTC").net).toBe(50);
    expect(pnlCalendar(late, 2026, 10, "Asia/Tokyo").net).toBe(0);
    expect(pnlCalendar(late, 2026, 11, "Asia/Tokyo").days[0]!.net).toBe(50);
    expect(dayKey(Date.parse("2026-10-31T23:30:00Z") / 1000, "America/New_York")).toBe("2026-10-31");
  });
  it("empty months have no win rate and no best or worst day", () => {
    const e = pnlCalendar([], 2026, 2, "UTC");
    expect(e.days).toHaveLength(28);
    expect(e.winRate).toBeNull();
    expect(e.best).toBeNull();
    expect(e.worst).toBeNull();
  });
  it("lists traded months newest first", () => {
    expect(tradedMonths(trades, "UTC")).toEqual([[2026, 10], [2026, 9]]);
  });
});
