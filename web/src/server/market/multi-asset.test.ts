import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetCoverageMemory, coverageMap, probeCoverage } from "./coverage";
import { getSeries } from "./service";
import { deskIntelligence } from "./intelligence";

const bars = (n: number, start = 100) => ({ status: "ok", values: Array.from({ length: n }, (_, i) => ({ datetime: new Date(Date.UTC(2026, 9, 28, 0, 0) + i * 3600_000).toISOString().slice(0, 19).replace("T", " "), open: String(start + i), high: String(start + i + 1), low: String(start + i - 1), close: String(start + i + 0.5) })) });
const refuse = (code: number, message: string) => ({ status: "error", code, message });

function mockVendor(table: Record<string, unknown>) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: URL) => {
    const sym = url.searchParams.get("symbol")!;
    calls.push(sym);
    const body = table[sym] ?? refuse(404, `symbol ${sym} not found`);
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }));
  return calls;
}

describe("provider coverage is verified, never assumed", () => {
  beforeEach(() => { vi.stubEnv("MARKET_DATA_PROVIDER", "twelvedata"); vi.stubEnv("MARKET_DATA_API_KEY", "test"); vi.stubEnv("DATABASE_URL", ""); _resetCoverageMemory(); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("falls through refused candidates and remembers the one that served bars", async () => {
    const calls = mockVendor({ NDX: refuse(403, "This symbol is available on the Pro plan, please upgrade"), IXIC: bars(50, 25000) });
    const r = await getSeries("US100", "1H", 50, new Date("2026-10-30T14:00:00Z"));
    expect(r.ok).toBe(true);
    expect(calls).toEqual(["NDX", "IXIC"]);
    const again = await getSeries("US100", "1H", 50, new Date("2026-10-30T14:00:00Z"));
    expect(again.ok).toBe(true);
    expect(calls.slice(2)).toEqual(["IXIC"]);
    expect((await coverageMap()).US100).toMatchObject({ state: "verified", vendorSymbol: "IXIC" });
  });

  it("an instrument the plan does not serve is 'not-covered', with no data substituted", async () => {
    mockVendor({});
    const r = await getSeries("UKOIL", "1H", 50);
    expect(r).toMatchObject({ ok: false, reason: "not-covered" });
  });

  it("rate limits and outages are errors, not coverage verdicts", async () => {
    mockVendor({ "EUR/USD": refuse(429, "You have run out of API credits for the current minute") });
    const r = await getSeries("EURUSD", "1H", 50);
    expect(r).toMatchObject({ ok: false, reason: "vendor-error" });
    expect((await coverageMap()).EURUSD!.state).toBe("unchecked");
  });

  it("the probe marks verified and unavailable instruments", async () => {
    mockVendor({ "XAU/USD": bars(2, 3900) });
    const out = await probeCoverage("test", 3);
    expect(out.length).toBe(3);
    const map = await coverageMap();
    expect(out.find((o) => o.symbol === "XAUUSD")?.state ?? map.XAUUSD!.state).toBe("verified");
  });

  it("rejects symbols outside the registry", async () => {
    expect(await getSeries("FAKE", "1H")).toMatchObject({ ok: false, reason: "unknown-symbol" });
  });
});

describe("multi-asset desk", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("runs each instrument with its own conventions and DXY link, on labelled sample bars when not connected", async () => {
    vi.stubEnv("MARKET_DATA_PROVIDER", ""); vi.stubEnv("MARKET_DATA_API_KEY", "");
    const d = await deskIntelligence(["EURUSD", "BTCUSD", "US100"]);
    expect(d.mode).toBe("sample");
    expect(d.items.map((i) => [i.symbol, i.status, i.digits])).toEqual([["EURUSD", "sample", 5], ["BTCUSD", "sample", 2], ["US100", "sample", 2]]);
    expect(d.dxy).not.toBeNull(); // EURUSD has a dollar link, so DXY is computed alongside
    expect(d.items[0]!.intel.components.some((c) => c.id === "dxy")).toBe(true);
    expect(d.items[1]!.intel.components.some((c) => c.id === "dxy")).toBe(false);
    expect(d.items[2]!.intel.components.some((c) => c.id === "dxy")).toBe(false);
  });
});
