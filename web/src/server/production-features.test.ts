import { afterEach, describe, expect, it, vi } from "vitest";
import { coachFacts, sizeAfterOutcome, type ClosedTrade } from "@/lib/analytics";
import { categoriesOf } from "./news/classify";
import { metaApi } from "./sync/metaapi";
import { TD_INTERVAL, CACHE_SECONDS } from "./market/twelvedata";
import { TIMEFRAMES, TF_SECONDS } from "./market/instruments";
import { classifyFreshness } from "./market/freshness";
import { sampleSeries } from "@/lib/demo/markets";
import { computeOverlays } from "@/lib/intelligence/overlays";

const tr = (i: number, net: number, vol = 1, hoursAgo = 2): ClosedTrade => {
  const close = Math.floor(Date.parse("2026-11-02T12:00:00Z") / 1000) - hoursAgo * 3600 + i * 60;
  return { id: `t${i}`, symbol: i % 2 ? "XAUUSD" : "EURUSD", side: "buy", volume: vol, openTime: close - 1800, closeTime: close, profit: net + 1, commission: -1, swap: 0, fees: 0 };
};

describe("timeframes", () => {
  it("supports 1M through 1W with a provider interval and cache lifetime for each", () => {
    expect(TIMEFRAMES).toEqual(["1M", "5M", "15M", "30M", "1H", "4H", "1D", "1W"]);
    for (const tf of TIMEFRAMES) { expect(TD_INTERVAL[tf]).toBeTruthy(); expect(CACHE_SECONDS[tf]).toBeLessThan(TF_SECONDS[tf]); }
    expect(TD_INTERVAL["30M"]).toBe("30min");
    expect(TD_INTERVAL["1W"]).toBe("1week");
  });
  it("computes different overlays per timeframe from different bars", () => {
    const a = computeOverlays({ symbol: "XAUUSD", tf: "30M", digits: 2, candles: sampleSeries("XAUUSD", "30M") });
    const b = computeOverlays({ symbol: "XAUUSD", tf: "1W", digits: 2, candles: sampleSeries("XAUUSD", "1W") });
    expect(a.tf).toBe("30M"); expect(b.tf).toBe("1W");
    const sig = (o: typeof a) => JSON.stringify({ z: o.zones.map((z) => [z.lower, z.upper]), s: o.structure.swings.map((x) => x.price), l: o.liquidity.map((x) => x.price) });
    expect(a.structure.swings.length + b.structure.swings.length).toBeGreaterThan(0);
    expect(sig(a)).not.toBe(sig(b));
  });
  it("classifies a weekly bar opened this week as live while the market is open", () => {
    const now = new Date("2026-11-04T14:00:00Z"); // Wednesday
    const weekOpen = Math.floor(Date.parse("2026-11-01T22:00:00Z") / 1000);
    expect(classifyFreshness(weekOpen, "1W", now, "XAUUSD")).toBe("live");
  });
});

describe("MetaApi pending orders", () => {
  afterEach(() => vi.restoreAllMocks());
  it("reads the orders endpoint for the account's region with the token header", async () => {
    const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe("https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/acc1/orders");
      expect((init?.headers as Record<string, string>)["auth-token"]).toBe("tok");
      return new Response(JSON.stringify([{ id: "9", type: "ORDER_TYPE_BUY_LIMIT", symbol: "XAUUSD", openPrice: 3990, volume: 0.5, time: "2026-11-01T10:00:00Z" }]), { status: 200 });
    });
    const orders = await metaApi("tok", f as typeof fetch).orders("london", "acc1");
    expect(orders).toHaveLength(1);
    expect(orders[0]!.type).toBe("ORDER_TYPE_BUY_LIMIT");
  });
});

describe("news categories", () => {
  it("tags central banks, inflation and commodities from text", () => {
    expect(categoriesOf("Fed's Powell says CPI inflation still too high; gold rallies")).toEqual(expect.arrayContaining(["central-banks", "inflation", "commodities"]));
    expect(categoriesOf("Quarterly earnings lift Nasdaq stocks")).toEqual(expect.arrayContaining(["equities"]));
    expect(categoriesOf("Weather in Paris")).toEqual([]);
  });
});

describe("AI coach facts", () => {
  it("states only computed numbers for the period and never invents trades", () => {
    const trades = [tr(1, 50), tr(2, -20), tr(3, 30), tr(4, -10, 2), tr(5, 40, 3, 24 * 20)];
    const { facts, tradeCount } = coachFacts({ trades, allTrades: trades, period: "weekly", now: new Date("2026-11-02T12:00:00Z"), tz: "UTC", currency: "USD" });
    expect(tradeCount).toBe(4);
    expect(facts).toContain("Closed trades: 4 (2 wins, 2 losses");
    expect(facts).toContain("Net after costs: 50.00 USD");
    expect(facts).toContain("Win rate 50.0%");
    expect(facts).toContain("By instrument");
  });
  it("reports an empty period honestly", () => {
    const { facts, tradeCount } = coachFacts({ trades: [tr(1, 50, 1, 24 * 40)], allTrades: [], period: "daily", now: new Date("2026-11-02T12:00:00Z"), tz: "UTC", currency: "USD" });
    expect(tradeCount).toBe(0);
    expect(facts).toContain("No trades closed in this period.");
  });
  it("measures size after losses vs after wins", () => {
    const s = sizeAfterOutcome([tr(1, -5, 1), tr(2, 5, 2), tr(3, -5, 1), tr(4, 5, 2), tr(5, -5, 1), tr(6, 5, 2), tr(7, 5, 1)]);
    expect(s.afterLoss).toBe(2);
    expect(s.nLoss).toBe(3);
  });
});
