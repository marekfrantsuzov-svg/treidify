import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { open, seal } from "./secret-box";

const k = randomBytes(32).toString("base64");

describe("secret box", () => {
  it("round-trips and never stores plaintext", () => {
    const s = seal("investor-pass-123", k);
    expect(s.startsWith("v1.")).toBe(true);
    expect(s).not.toContain("investor");
    expect(open(s, k)).toBe("investor-pass-123");
  });
  it("uses a fresh IV each time", () => {
    expect(seal("x", k)).not.toBe(seal("x", k));
  });
  it("rejects tampering and wrong keys", () => {
    const s = seal("secret", k);
    const parts = s.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => open(parts.join("."), k)).toThrow();
    expect(() => open(s, randomBytes(32).toString("base64"))).toThrow();
  });
  it("refuses a missing or short key", () => {
    expect(() => seal("x", "")).toThrow(/not set/);
    expect(() => seal("x", Buffer.from("short").toString("base64"))).toThrow(/32 bytes/);
  });
});
