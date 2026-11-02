import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalEmail, isOwnerEmail, OWNER_EMAIL, ownerConfig, ownerDecision } from "../owner";
import { connectErrorMessage, credentialAllowed, decideAccess, freshness, redact } from "./access";
import { errorDetails, metaApi, MetaApiError, metaApiToken, tokenShape } from "./metaapi";

describe("owner identity (verified owner email, bound to one immutable user ID)", () => {
  const marek = { id: "usr_marek", email: "marekfrantsuzov@gmail.com", emailVerified: true };
  it("the owner email is fixed on the server to Marek's verified Gmail", () => {
    expect(OWNER_EMAIL).toBe("marekfrantsuzov@gmail.com");
    expect(ownerConfig({})).toEqual({ id: null, email: "marekfrantsuzov@gmail.com" });
  });
  it("the verified owner email claims the free slot, then only that user ID is the owner", () => {
    expect(ownerDecision(marek, null, {})).toBe("claim");
    expect(ownerDecision(marek, "usr_marek", {})).toBe("owner");
    expect(ownerDecision({ ...marek, id: "usr_other" }, "usr_marek", {})).toBe("not_owner");
  });
  it("Gmail spellings of the same inbox match; other mailboxes never do", () => {
    expect(ownerDecision({ ...marek, email: " Marek.Frantsuzov+x@GoogleMail.com " }, "usr_marek", {})).toBe("owner");
    expect(ownerDecision({ ...marek, email: "marekfrantsuzov@gamil.com" }, null, {})).toBe("not_owner");
    expect(ownerDecision({ ...marek, email: "marekfrantsuzov@outlook.com" }, null, {})).toBe("not_owner");
    expect(canonicalEmail("a.b+c@example.com")).toBe("a.b+c@example.com");
    expect(isOwnerEmail("MAREKFRANTSUZOV@gmail.com", {})).toBe(true);
  });
  it("refuses an unverified email, an impersonated session, or no user", () => {
    expect(ownerDecision({ ...marek, emailVerified: false }, null, {})).toBe("not_owner");
    expect(ownerDecision({ ...marek, emailVerified: false }, "usr_marek", {})).toBe("not_owner");
    expect(ownerDecision({ ...marek, impersonated: true }, "usr_marek", {})).toBe("not_owner");
    expect(ownerDecision(null, "usr_marek", {})).toBe("not_owner");
  });
  it("the bound owner loses owner rights if their email stops matching", () => {
    expect(ownerDecision({ ...marek, email: "someone@else.com" }, "usr_marek", {})).toBe("not_owner");
  });
  it("server variables can pin the owner ID or change the email, never the browser", () => {
    const env = { TREIDIFY_OWNER_USER_ID: "usr_pinned", TREIDIFY_OWNER_EMAIL: "Owner@Example.com" };
    const pinned = { id: "usr_pinned", email: "owner@example.com", emailVerified: true };
    expect(ownerDecision(pinned, null, env)).toBe("owner");
    expect(ownerDecision(pinned, "usr_someone_else", env)).toBe("owner");
    expect(ownerDecision({ ...pinned, id: "usr_attacker" }, null, env)).toBe("not_owner");
    expect(ownerDecision(marek, null, env)).toBe("not_owner");
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
    expect(connectErrorMessage({ status: 403, message: "MetaApi: ForbiddenError: Not enough funds https://x.y/billing." })).toBe("MetaApi refused to create the connection: Not enough funds. Nothing was saved.");
    expect(connectErrorMessage({ status: 403 })).toBe("MetaApi refused to create the connection. Nothing was saved.");
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
    expect(keys).toEqual(["account", "createAccount", "deals", "deploy", "info", "orders", "positions", "probe", "remove", "vendor"]);
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

describe("token diagnostics never reveal the token", () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  it("reports JWT shape, expiry and API names only", () => {
    const t = `${b64({ alg: "RS512" })}.${b64({ exp: 1_700_000_000, accessRules: [{ id: "trading-account-management-api" }, { id: "metaapi-rest-api" }] })}.c2lnbmF0dXJl`;
    const s = tokenShape(t, Date.parse("2026-11-02T00:00:00Z"));
    expect(s).toEqual({ length: t.length, jwt: true, expiresAt: "2023-11-14T22:13:20.000Z", expired: true, apis: ["trading-account-management-api", "metaapi-rest-api"] });
    expect(JSON.stringify(s)).not.toContain("c2lnbmF0dXJl");
  });
  it("handles a non-JWT value", () => {
    expect(tokenShape("abc")).toMatchObject({ length: 3, jwt: false, apis: null });
  });
});
