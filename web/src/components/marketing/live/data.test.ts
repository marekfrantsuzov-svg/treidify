import { describe, expect, it } from "vitest";
import { maxStopPips } from "@/lib/trading/pips";
import { BEAR, BULL, SCENES } from "./data";

describe("homepage showcase data", () => {
  it("example setups obey the 50-pip XAUUSD structural stop rule", () => {
    expect(maxStopPips("XAUUSD")).toBe(50);
    for (const s of [BULL, BEAR]) {
      expect(s.eligible).toBe(true);
      expect(s.pips).toBeLessThanOrEqual(50);
      expect(s.pips).toBeGreaterThan(0);
    }
    expect(BULL.pips).toBe(38);
    expect(BEAR.pips).toBe(42);
  });

  it("stops sit beyond the zone on the correct side", () => {
    expect(BULL.zone.kind).toBe("demand");
    expect(BULL.stop).toBeLessThan(BULL.zone.lo);
    expect(BEAR.zone.kind).toBe("supply");
    expect(BEAR.stop).toBeGreaterThan(BEAR.zone.hi);
  });

  it("the structure matches the stated bias and the break of structure exists", () => {
    const pivot = (s: typeof BULL, label: string) => s.pivots.find((p) => p.label === label)!.i;
    expect(BULL.candles[pivot(BULL, "HL")]!.l).toBeGreaterThan(BULL.candles[pivot(BULL, "Low")]!.l);
    expect(BULL.candles[pivot(BULL, "HH")]!.h).toBeGreaterThan(BULL.candles[pivot(BULL, "H")]!.h);
    expect(BEAR.candles[pivot(BEAR, "LH")]!.h).toBeLessThan(BEAR.candles[pivot(BEAR, "High")]!.h);
    expect(BEAR.candles[pivot(BEAR, "LL")]!.l).toBeLessThan(BEAR.candles[pivot(BEAR, "L")]!.l);
    for (const s of [BULL, BEAR]) expect(s.bos.to).toBeGreaterThan(s.bos.from);
  });

  it("one loop runs 20 to 30 seconds", () => {
    const total = SCENES.reduce((a, s) => a + s.ms, 0);
    expect(total).toBeGreaterThanOrEqual(20000);
    expect(total).toBeLessThanOrEqual(30000);
  });

  it("is isolated from accounts, brokers, market data and AI", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const dir = new URL(".", import.meta.url);
    for (const f of readdirSync(dir).filter((n) => /\.(ts|tsx)$/.test(n) && !n.endsWith(".test.ts"))) {
      const src = readFileSync(new URL(f, dir), "utf8");
      expect(src, f).not.toMatch(/@\/server|metaapi|@anthropic|twelvedata|fetch\(|@\/db|auth-client/i);
    }
  });
});
