import { describe, expect, it } from "vitest";
import { cashFlows, closedPositions, normaliseDeal } from "./reconstruct";
import { metaApi, MetaApiError } from "./metaapi";

const d = (o: Record<string, unknown>) => normaliseDeal({ id: String(Math.random()), time: "2026-10-01T10:00:00Z", ...o } as never);

describe("closed trades from deals", () => {
  it("rebuilds a scaled-in, fully closed buy with VWAP prices and summed costs", () => {
    const deals = [
      d({ id: "1", positionId: "P1", type: "DEAL_TYPE_BUY", entryType: "DEAL_ENTRY_IN", symbol: "XAUUSD", volume: 1, price: 4000, commission: -3.5, time: "2026-10-01T10:00:00Z" }),
      d({ id: "2", positionId: "P1", type: "DEAL_TYPE_BUY", entryType: "DEAL_ENTRY_IN", symbol: "XAUUSD", volume: 1, price: 4010, commission: -3.5, time: "2026-10-01T11:00:00Z" }),
      d({ id: "3", positionId: "P1", type: "DEAL_TYPE_SELL", entryType: "DEAL_ENTRY_OUT", symbol: "XAUUSD", volume: 2, price: 4020, profit: 3000, commission: -7, swap: -1.2, time: "2026-10-01T14:00:00Z" }),
    ];
    const [t] = closedPositions(deals);
    expect(t).toMatchObject({ positionId: "P1", side: "buy", volume: 2, openPrice: 4005, closePrice: 4020, profit: 3000, commission: -14, swap: -1.2 });
    expect(t!.openTime.toISOString()).toBe("2026-10-01T10:00:00.000Z");
    expect(t!.closeTime.toISOString()).toBe("2026-10-01T14:00:00.000Z");
  });
  it("leaves partially closed positions open", () => {
    const deals = [
      d({ positionId: "P2", type: "DEAL_TYPE_SELL", entryType: "DEAL_ENTRY_IN", volume: 1, price: 50 }),
      d({ positionId: "P2", type: "DEAL_TYPE_BUY", entryType: "DEAL_ENTRY_OUT", volume: 0.5, price: 49, profit: 25 }),
    ];
    expect(closedPositions(deals)).toHaveLength(0);
  });
  it("keeps deposits and withdrawals out of trading profit", () => {
    const deals = [d({ id: "b1", type: "DEAL_TYPE_BALANCE", profit: 5000 }), d({ id: "b2", type: "DEAL_TYPE_BALANCE", profit: -200 })];
    expect(closedPositions(deals)).toHaveLength(0);
    expect(cashFlows(deals).map((f) => [f.kind, f.amount])).toEqual([["deposit", 5000], ["withdrawal", -200]]);
  });
});

describe("MetaApi client", () => {
  it("sends the token in the auth-token header and never in the URL, and accepts both deal response shapes", async () => {
    const calls: { url: string; token: string | null }[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, token: new Headers(init.headers).get("auth-token") });
      return new Response(JSON.stringify(calls.length === 1 ? [{ id: "1", type: "DEAL_TYPE_BUY", time: "2026-10-01T00:00:00Z" }] : { deals: [] }), { status: 200 });
    }) as unknown as typeof fetch;
    const api = metaApi("tok", fake);
    expect(await api.deals("london", "abc", new Date(0), new Date(1000))).toHaveLength(1);
    expect(await api.deals("london", "abc", new Date(0), new Date(1000))).toEqual([]);
    expect(calls[0]!.url).toContain("mt-client-api-v1.london.agiliumtrade.ai");
    expect(calls[0]!.url).not.toContain("tok");
    expect(calls[0]!.token).toBe("tok");
  });
  it("surfaces 202 as a retryable error", async () => {
    const fake = (async () => new Response(null, { status: 202, headers: { "retry-after": "7" } })) as unknown as typeof fetch;
    await expect(metaApi("t", fake).account("x")).rejects.toMatchObject({ status: 202, retryAfter: 7 });
    expect(MetaApiError).toBeDefined();
  });
});
