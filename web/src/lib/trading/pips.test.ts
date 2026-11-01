import { describe, expect, it } from "vitest";
import { formatPips, goldMoneyPerLot, maxStopPrice, pipsToPrice, priceToPips, stopCheck } from "./pips";

describe("XAUUSD pip conversion: 1 pip = $0.10", () => {
  it.each([
    [0.1, 1], [1, 10], [5, 50], [10, 100], [0.5, 5], [2.35, 23.5], [-5, 50],
  ])("$%s of price movement is %s pips", (price, p) => {
    expect(priceToPips("XAUUSD", price)).toBe(p);
  });
  it.each([[1, 0.1], [10, 1], [50, 5], [100, 10]])("%s pips is $%s of price movement", (p, price) => {
    expect(pipsToPrice("XAUUSD", p)).toBe(price);
  });
  it("round-trips without float dust", () => {
    for (const p of [0.1, 3.3, 17, 49.9, 50, 50.1, 123.4]) expect(priceToPips("XAUUSD", pipsToPrice("XAUUSD", p))).toBe(p);
  });
  it("max structural stop is 50 pips = $5.00", () => {
    expect(maxStopPrice("XAUUSD")).toBe(5);
  });
  it("leaves other symbols on their own convention", () => {
    expect(priceToPips("DXY", 0.05)).toBe(5);
    expect(priceToPips("XAGUSD", 0.05)).toBe(50);
    expect(maxStopPrice("DXY")).toBeNull();
  });
});

describe("50-pip structural stop eligibility", () => {
  it("50.0 pips passes, 50.1 and 51 fail", () => {
    expect(stopCheck("XAUUSD", 3970, 3965).eligible).toBe(true);
    expect(stopCheck("XAUUSD", 3970, 3964.99).eligible).toBe(false); // 50.1
    expect(stopCheck("XAUUSD", 3970, 3964.9).eligible).toBe(false); // 51
    expect(stopCheck("XAUUSD", 3970, 3975.1).pips).toBe(51);
  });
  it("reports the distance in pips and in price, never in money", () => {
    const c = stopCheck("XAUUSD", 3970, 3967.5);
    expect(c).toMatchObject({ pips: 25, priceDistance: 2.5, max: 50, maxPrice: 5, eligible: true });
  });
  it("symbols without a rule are always eligible", () => {
    expect(stopCheck("DXY", 100, 90).eligible).toBe(true);
  });
});

describe("formatting and money are separate", () => {
  it("formats gold pips with the price movement, not dollars of P&L", () => {
    expect(formatPips("XAUUSD", 50)).toBe("50 pips ($5.00)");
    expect(formatPips("XAUUSD", 12.5)).toBe("12.5 pips ($1.25)");
    expect(formatPips("DXY", 12)).toBe("12 pips");
  });
  it("monetary value depends on lot size: $5.00 of movement on 0.10 lot is $50, on 1 lot is $500", () => {
    expect(goldMoneyPerLot(5, 0.1)).toBeCloseTo(50);
    expect(goldMoneyPerLot(5, 1)).toBe(500);
  });
});
