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
    expect(fredKeyState("nope")).toMatchObject({ state: "malformed", length: 4 });
    expect(fredKeyState(` ${K} `)).toMatchObject({ state: "ok", length: 34 });
  });
});

describe("pasted request URLs", () => {
  it("takes the api_key parameter", () => {
    expect(normalizeFredKey(`https://api.stlouisfed.org/fred/series?series_id=GNPCA&api_key=${K}&file_type=json`)).toBe(K);
  });
  it("flags FRED's documentation placeholder", () => {
    const st = fredKeyState("https://api.stlouisfed.org/fred/series?series_id=GNPCA&api_key=abcdefghijklmnopqrstuvwxyz123456&file_type=json");
    expect(st.state).toBe("placeholder");
    expect(st.shape).toMatchObject({ url: true, apiKeyParam: true });
  });
});
