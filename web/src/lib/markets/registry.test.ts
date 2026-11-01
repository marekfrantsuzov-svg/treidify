import { describe, expect, it } from "vitest";
import { DEFAULT_DESK, INSTRUMENT_LIST, INSTRUMENTS, normalizeDesk, resolveSymbol, searchInstruments } from "./registry";
import { sessionOpen, symbolOpen } from "./sessions";
import { formatPips, maxStopPips, moneyForMove, priceToPips, stopCheck, stopUnit } from "@/lib/trading/pips";
import { tradeSetup } from "@/lib/intelligence/setup";
import type { InstrumentIntel } from "@/lib/intelligence";

describe("instrument registry", () => {
  it("covers every asset class in the brief", () => {
    for (const s of ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCHF", "USDCAD", "XAUUSD", "XAGUSD", "US100", "US30", "SPX500", "DAX40", "BTCUSD", "ETHUSD", "USOIL", "UKOIL", "DXY"]) expect(INSTRUMENTS[s], s).toBeDefined();
  });
  it("has unique symbols, sane precision and a provider route for every instrument", () => {
    expect(new Set(INSTRUMENT_LIST.map((i) => i.symbol)).size).toBe(INSTRUMENT_LIST.length);
    for (const i of INSTRUMENT_LIST) {
      expect(i.tickSize, i.symbol).toBeCloseTo(10 ** -i.digits, 12);
      expect(i.move.size, i.symbol).toBeGreaterThanOrEqual(i.tickSize);
      expect(i.providers.twelvedata.candidates.length > 0 || i.providers.twelvedata.computed, i.symbol).toBeTruthy();
    }
  });
  it("only Gold has a maximum-stop rule", () => {
    expect(INSTRUMENT_LIST.filter((i) => i.maxStop !== null).map((i) => i.symbol)).toEqual(["XAUUSD"]);
  });
  it("defaults the desk to Gold, DXY, Silver", () => expect([...DEFAULT_DESK]).toEqual(["XAUUSD", "DXY", "XAGUSD"]));
});

describe("pip and point conventions per instrument", () => {
  it("Gold keeps the house rule: 1 pip = $0.10, 50-pip max", () => {
    expect(priceToPips("XAUUSD", 5)).toBe(50);
    expect(maxStopPips("XAUUSD")).toBe(50);
    expect(formatPips("XAUUSD", 50)).toBe("50 pips ($5.00)");
  });
  it("FX uses 0.0001 pips (JPY quotes 0.01) and has no stop cap", () => {
    expect(priceToPips("EURUSD", 0.0025)).toBe(25);
    expect(priceToPips("USDJPY", 0.25)).toBe(25);
    expect(maxStopPips("EURUSD")).toBeNull();
    expect(stopCheck("EURUSD", 1.1, 1.09).eligible).toBe(true); // 100 pips: no cap outside Gold
  });
  it("indices and crypto are measured in points, never Gold pips", () => {
    expect(stopUnit("US100")).toBe("point");
    expect(priceToPips("US100", 85)).toBe(85);
    expect(formatPips("US100", 85)).toBe("85 points");
    expect(priceToPips("BTCUSD", 420)).toBe(420);
    expect(stopCheck("BTCUSD", 100_000, 99_000)).toMatchObject({ unit: "point", pips: 1000, max: null, eligible: true });
  });
  it("money for a move is in the quote currency with the typical contract size", () => {
    expect(moneyForMove("EURUSD", 0.001, 1)).toMatchObject({ amount: 100, currency: "USD" });
    expect(moneyForMove("USDJPY", 0.1, 1)).toMatchObject({ amount: 10_000, currency: "JPY" });
    expect(moneyForMove("XAUUSD", 5, 0.1)).toMatchObject({ amount: 50, currency: "USD" });
    expect(moneyForMove("DAX40", 10, 1, 25)).toMatchObject({ amount: 250, currency: "EUR", typicalSpec: false });
  });
});

describe("a large stop is WAIT only on Gold", () => {
  const intel = (symbol: string, lower: number, upper: number, inv: number, target: number, digits: number): InstrumentIntel => ({
    symbol, engine: "mtf-structure-v2", asOf: "2026-11-01T12:00:00Z", lastPrice: upper, digits, bias: "bullish", score: 60, confidence: "high", components: [], limitations: [],
    trends: { "4H": "bullish", "1H": "bullish", "15M": "bullish", "5M": "bullish" }, structure: [], fib: null, levels: [{ kind: "resistance", lower: target, upper: target, touches: 2 } as never], liquidity: [], sweeps: [],
    zones: [{ id: "z", side: "buy", lower, upper, timeframe: "1H", reasons: ["1H support"], withTrend: true, confirmation: "", invalidation: { level: inv, text: "" }, status: "confirmed", distanceATR: 0 }],
    bubbles: [], invalidation: null, volatility: null,
  });
  it("US100 with an 80-point structural stop can be valid", () => {
    expect(tradeSetup(intel("US100", 25_000, 25_040, 24_960, 25_300, 2)).status).toBe("valid");
  });
  it("Gold with an 80-pip ($8.00) structural stop is WAIT", () => {
    expect(tradeSetup(intel("XAUUSD", 3990, 3994, 3986, 4020, 2)).status).toBe("wait");
  });
});

describe("sessions", () => {
  const wed = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 28, h, m));
  it("crypto never closes", () => expect(sessionOpen("crypto", new Date("2026-10-31T12:00:00Z"))).toBe(true));
  it("US cash indices follow the NYSE session", () => {
    expect(symbolOpen("US100", wed(14, 0))).toBe(true); // 10:00 New York
    expect(symbolOpen("US100", wed(21, 0))).toBe(false); // 17:00 New York
    expect(symbolOpen("SPX500", new Date("2026-10-31T15:00:00Z"))).toBe(false); // Saturday
  });
  it("DAX follows Xetra hours and Nikkei has a lunch break", () => {
    expect(symbolOpen("DAX40", wed(9, 0))).toBe(true); // 10:00 Frankfurt
    expect(symbolOpen("DAX40", wed(17, 0))).toBe(false); // 18:00 Frankfurt
    expect(symbolOpen("JP225", wed(2, 45))).toBe(false); // 11:45 Tokyo
    expect(symbolOpen("JP225", wed(4, 0))).toBe(true); // 13:00 Tokyo
  });
  it("FX and Gold keep the Sunday-to-Friday week", () => {
    expect(symbolOpen("EURUSD", new Date("2026-10-31T12:00:00Z"))).toBe(false);
    expect(symbolOpen("XAUUSD", wed(12))).toBe(true);
  });
});

describe("broker symbols, search and desk repair", () => {
  it.each([["XAUUSD.m", "XAUUSD"], ["GOLD", "XAUUSD"], ["NAS100.cash", "US100"], ["USTEC", "US100"], ["GER40", "DAX40"], ["EURUSD+", "EURUSD"], ["eurusd.pro", "EURUSD"], ["US500", "SPX500"], ["XTIUSD", "USOIL"], ["BTCUSDT", "BTCUSD"], ["FOO", null]])("%s → %s", (raw, sym) => {
    expect(resolveSymbol(raw)).toBe(sym);
  });
  it("finds instruments by symbol, name and alias", () => {
    expect(searchInstruments("eur")[0]!.symbol).toBe("EURUSD");
    expect(searchInstruments("nasdaq").map((i) => i.symbol)).toContain("US100");
    expect(searchInstruments("bitcoin")[0]!.symbol).toBe("BTCUSD");
    expect(searchInstruments("EUR/USD")[0]!.symbol).toBe("EURUSD");
    expect(searchInstruments("").length).toBe(INSTRUMENT_LIST.length);
  });
  it("repairs unknown and duplicate desk entries", () => {
    expect(normalizeDesk(["EURUSD", "BTCUSD", "US100"])).toEqual(["EURUSD", "BTCUSD", "US100"]);
    expect(normalizeDesk(null)).toEqual(["XAUUSD", "DXY", "XAGUSD"]);
    expect(normalizeDesk(["EURUSD", "EURUSD", "NOPE"])).toEqual(["EURUSD", "XAUUSD", "DXY"]);
    expect(new Set(normalizeDesk(["DXY", "XAUUSD", "XAUUSD"])).size).toBe(3);
  });
});
