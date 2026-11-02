import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isOwner, ownerConfig } from "../owner";
import { connectErrorMessage, credentialAllowed, decideAccess, freshness, redact } from "./access";
import { errorDetails, metaApi, MetaApiError, metaApiToken } from "./metaapi";

const OWNER_ENV = { TREIDIFY_OWNER_USER_ID: "usr_owner_1", TREIDIFY_OWNER_EMAIL: "Owner@Example.com" };

describe("owner identity (server-side id + verified email)", () => {
  const owner = { id: "usr_owner_1", email: "owner@example.com", emailVerified: true };
  it("grants owner only when id, email and verification all match", () => {
    expect(isOwner(owner, OWNER_ENV)).toBe(true);
    expect(isOwner({ ...owner, email: " OWNER@example.com " }, OWNER_ENV)).toBe(true);
  });
  it("refuses an unverified email, another id with the owner's email, or the owner's id with another email", () => {
    expect(isOwner({ ...owner, emailVerified: false }, OWNER_ENV)).toBe(false);
    expect(isOwner({ ...owner, id: "usr_attacker" }, OWNER_ENV)).toBe(false);
    expect(isOwner({ ...owner, email: "attacker@example.com" }, OWNER_ENV)).toBe(false);
  });
  it("grants nobody when either setting is missing", () => {
    expect(isOwner(owner, { TREIDIFY_OWNER_EMAIL: "owner@example.com" })).toBe(false);
    expect(isOwner(owner, { TREIDIFY_OWNER_USER_ID: "usr_owner_1" })).toBe(false);
    expect(isOwner(owner, {})).toBe(false);
    expect(isOwner(null, OWNER_ENV)).toBe(false);
    expect(ownerConfig({}).configured).toBe(false);
  });
});

describe("read-only access policy", () => {
  it("normal user: only investorMode === true is accepted", () => {
    expect(decideAccess({ investorMode: true, owner: false })).toEqual({ ok: true, mode: "investor" });
    expect(decideAccess({ investorMode: false, owner: false })).toMatchObject({ ok: false, reason: "master_password" });
    expect(decideAccess({ investorMode: undefined, owner: false })).toMatchObject({ ok: false, reason: "mode_unknown" });
    expect(decideAccess({ investorMode: null, owner: false })).toMatchObject({ ok: false, reason: "mode_unknown" });
  });
  it("owner: master or investor are both accepted and labelled honestly", () => {
    expect(decideAccess({ investorMode: false, owner: true })).toEqual({ ok: true, mode: "master" });
    expect(decideAccess({ investorMode: undefined, owner: true })).toEqual({ ok: true, mode: "master" });
    expect(decideAccess({ investorMode: true, owner: true })).toEqual({ ok: true, mode: "investor" });
  });
  it("only the owner may even submit a master password", () => {
    expect(credentialAllowed("investor", false)).toBe(true);
    expect(credentialAllowed("master", false)).toBe(false);
    expect(credentialAllowed("master", true)).toBe(true);
  });
});

describe("connection errors", () => {
  it("maps MetaApi validation codes to clear messages", () => {
    expect(connectErrorMessage({ status: 400, code: "E_AUTH" })).toMatch(/rejected the login/);
    expect(connectErrorMessage({ status: 400, code: "E_SRV_NOT_FOUND", serverNames: ["ICMarketsSC-Live07", "ICMarketsSC-Live08"] })).toMatch(/not found.*ICMarketsSC-Live07, ICMarketsSC-Live08/);
    expect(connectErrorMessage({ status: 429 })).toMatch(/busy/);
    expect(connectErrorMessage({ status: 401 })).toMatch(/configuration/);
  });
  it("reads error codes from MetaApi error bodies", () => {
    expect(errorDetails({ error: "ValidationError", details: { code: "E_AUTH" } })).toEqual({ code: "E_AUTH", serverNames: undefined });
    expect(errorDetails({ details: { code: "E_SRV_NOT_FOUND", serverNames: ["A-Live", 7, "B-Live"] } })).toEqual({ code: "E_SRV_NOT_FOUND", serverNames: ["A-Live", "B-Live"] });
    expect(errorDetails({ details: [{ parameter: "login" }, { code: "E_AUTH" }] }).code).toBe("E_AUTH");
    expect(errorDetails({ details: "E_SERVER_TIMEZONE" }).code).toBe("E_SERVER_TIMEZONE");
    expect(errorDetails(null)).toEqual({});
  });
  it("creates the account on G2 (needed for investorMode) and surfaces E_AUTH", async () => {
    let sent: Record<string, unknown> = {};
    const f = (async (_u: string, init?: RequestInit) => { sent = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ error: "ValidationError", message: "Authentication failed", details: { code: "E_AUTH" } }), { status: 400 }); }) as typeof fetch;
    const err = await metaApi("tok", f).createAccount({ platform: "mt5", server: "Broker-Demo", login: "123456", password: "s3cret-pass", name: "x", transactionId: "t" }).catch((e) => e);
    expect(err).toBeInstanceOf(MetaApiError);
    expect(err).toMatchObject({ status: 400, code: "E_AUTH" });
    expect(String(err.message)).not.toContain("s3cret-pass");
    expect(sent).toMatchObject({ type: "cloud-g2", platform: "mt5", magic: 0 });
  });
  it("redacts secrets from any text bound for logs", () => {
    expect(redact("bad password hunter22 for 123", "hunter22")).toBe("bad password [redacted] for 123");
    expect(redact("x", "", null, undefined)).toBe("x");
  });
});

describe("token configuration", () => {
  it("accepts the documented name and common variants, and cleans pasted values", () => {
    expect(metaApiToken({ METAAPI_TOKEN: "abc" })).toEqual({ token: "abc", name: "METAAPI_TOKEN" });
    expect(metaApiToken({ METAAPI_API_KEY: ' "abc" ' })).toEqual({ token: "abc", name: "METAAPI_API_KEY" });
    expect(metaApiToken({ METAAPI_KEY: "METAAPI_TOKEN=abc" })).toEqual({ token: "abc", name: "METAAPI_KEY" });
    expect(metaApiToken({ METAAPI_TOKEN: "  " })).toBeNull();
  });
});

describe("freshness labels", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  it("classifies by age and never assumes data exists", () => {
    expect(freshness(null, now)).toBe("none");
    expect(freshness(new Date(now.getTime() - 30_000), now)).toBe("fresh");
    expect(freshness(new Date(now.getTime() - 5 * 60_000), now)).toBe("recent");
    expect(freshness(new Date(now.getTime() - 20 * 60_000), now)).toBe("stale");
  });
});

describe("Treidify never trades", () => {
  it("the MetaApi client exposes only read and account-management methods", () => {
    const keys = Object.keys(metaApi("t")).sort();
    expect(keys).toEqual(["account", "createAccount", "deals", "deploy", "info", "orders", "positions", "remove", "vendor"]);
  });
  it("no source file calls a MetaApi trade endpoint", () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts")) files.push(p); } };
    walk(root);
    const offenders = files.filter((f) => { const s = readFileSync(f, "utf8"); return /accounts\/[^\n]*\/trade\b/.test(s) || /createMarket(Buy|Sell)Order|closePosition\(|modifyPosition\(/.test(s); });
    expect(offenders).toEqual([]);
  });
});
