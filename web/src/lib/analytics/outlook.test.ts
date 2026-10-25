import { describe, expect, it } from "vitest";
import { dailyOutlook } from "./outlook";
import type { ClosedTrade } from "./types";

const trade = (i: number, closeIso: string, profit: number): ClosedTrade => {
  const close = Date.parse(closeIso) / 1000;
  return { id: String(i), symbol: "XAUUSD", side: "buy", volume: 1, openTime: close - 3600, closeTime: close, profit, commission: 0, swap: 0, fees: 0 };
};

describe("dailyOutlook", () => {
  it("says the market is closed at the weekend", () => {
    const l = dailyOutlook({ now: new Date("2026-10-25T10:00:00Z"), tz: "UTC", trades: [] });
    expect(l[0]!.text).toMatch(/closed for the weekend/);
    expect(l.at(-1)!.text).toMatch(/Connect an account/);
  });
  it("names the London and New York overlap", () => {
    const l = dailyOutlook({ now: new Date("2026-10-21T14:00:00Z"), tz: "UTC", trades: [] });
    expect(l[0]!.text).toMatch(/London and New York are open, the most active overlap/);
  });
  it("flags a losing streak from the user's own trades and the daily limit", () => {
    const now = new Date("2026-10-21T15:00:00Z");
    const trades = [trade(1, "2026-10-21T09:00:00Z", 50), trade(2, "2026-10-21T10:00:00Z", -20), trade(3, "2026-10-21T11:00:00Z", -20), trade(4, "2026-10-21T12:00:00Z", -20)];
    const l = dailyOutlook({ now, tz: "UTC", trades, maxTradesPerDay: 4 });
    expect(l.find((x) => x.label === "Your account")!.text).toMatch(/last 3 trades closed at a loss/);
    expect(l.find((x) => x.label === "Your rules")!.text).toMatch(/limit of 4/);
  });
  it("describes structure without predicting direction", () => {
    const l = dailyOutlook({ now: new Date("2026-10-21T14:00:00Z"), tz: "UTC", trades: [], gold: "bullish", dollar: "bearish" });
    expect(l.find((x) => x.label === "Structure")!.text).toBe("4H structure: gold bullish, dollar bearish. They point in opposite directions, the usual relationship.");
  });
});
