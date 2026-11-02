import { describe, expect, it } from "vitest";
import { fredKeyState, normalizeFredKey } from "./fred";

const K = "abcdef0123456789abcdef0123456789";
describe("normalizeFredKey", () => {
  it("accepts a clean key", () => expect(normalizeFredKey(K)).toBe(K));
  it("strips whitespace, quotes, a pasted variable name and upper case", () => {
    expect(normalizeFredKey(`  ${K}\n`)).toBe(K);
    expect(normalizeFredKey(`"${K}"`)).toBe(K);
    expect(normalizeFredKey(`FRED_API_KEY=${K}`)).toBe(K);
    expect(normalizeFredKey(`FRED_API_KEY = '${K.toUpperCase()}'`)).toBe(K);
  });
  it("rejects values with no 32-character key", () => {
    expect(normalizeFredKey("")).toBeNull();
    expect(normalizeFredKey("abc123")).toBeNull();
    expect(normalizeFredKey(K + "0")).toBeNull();
    expect(normalizeFredKey("ab-cdef0123456789abcdef0123456789")).toBeNull();
  });
  it("reports state without the value", () => {
    expect(fredKeyState(undefined)).toEqual({ state: "missing", length: 0 });
    expect(fredKeyState("nope")).toEqual({ state: "malformed", length: 4 });
    expect(fredKeyState(` ${K} `)).toEqual({ state: "ok", length: 34 });
  });
});
