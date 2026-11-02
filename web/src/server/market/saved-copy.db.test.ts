import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Runs only against a real Postgres (DATABASE_URL); proves the saved copy is shared and used under rate limits.
const run = process.env.DATABASE_URL ? describe : describe.skip;
const bars = (n: number, start: number) => ({ status: "ok", values: Array.from({ length: n }, (_, i) => ({ datetime: new Date(Date.UTC(2026, 9, 28) + i * 60_000).toISOString().slice(0, 19).replace("T", " "), open: String(start + i), high: String(start + i + 1), low: String(start + i - 1), close: String(start + i) })) });

run("saved copy", () => {
  beforeEach(() => { vi.stubEnv("MARKET_DATA_PROVIDER", "twelvedata"); vi.stubEnv("MARKET_DATA_API_KEY", "test"); vi.stubEnv("MARKET_DATA_PLAN", "free"); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("serves the saved copy inside the refresh window, and the last real bars when rate limited", async () => {
    const { db, schema } = await import("../db");
    await db.delete(schema.marketSeriesCache);
    const { getSeries, _resetMarketBudget } = await import("./service");
    _resetMarketBudget();
    let mode: "ok" | "limit" = "ok"; let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => { calls++; return new Response(JSON.stringify(mode === "ok" ? bars(60, 3900) : { status: "error", code: 429, message: "You have run out of API credits for the current minute." }), { status: 200 }); }));
    const t0 = new Date("2026-10-28T01:05:00Z");
    const a = await getSeries("XAUUSD", "1M", 50, t0);
    expect(a).toMatchObject({ ok: true, savedCopy: false });
    const b = await getSeries("XAUUSD", "1M", 50, new Date(t0.getTime() + 60_000));
    expect(b).toMatchObject({ ok: true, savedCopy: false });
    expect(calls).toBe(1);
    mode = "limit";
    const c = await getSeries("XAUUSD", "1M", 50, new Date(t0.getTime() + 3600_000));
    expect(c).toMatchObject({ ok: true, savedCopy: true, fetchedAt: t0.toISOString() });
    expect(c.ok && c.candles.length).toBe(50);
    expect(calls).toBe(2);
  });
});
