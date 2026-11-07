/**
 * MetaApi cloud REST adapter (https://metaapi.cloud/docs). READ-ONLY BY CONSTRUCTION: this file has no trade, order
 * placement, modification or close method, and a test fails if one is added. Normal users must connect with the
 * investor password, proven by MetaApi's investorMode flag; only the verified owner may use a master password.
 * No "server-only" import so it can be unit tested with a mocked fetch. The token is sent only from the server.
 */
type Fetch = typeof fetch;
const PROVISIONING = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const clientBase = (region: string) => `https://mt-client-api-v1.${region}.agiliumtrade.ai`;

/** Names under which the MetaApi token may be set in the environment. METAAPI_TOKEN is the documented one. */
export const METAAPI_TOKEN_NAMES = ["METAAPI_TOKEN", "METAAPI_API_TOKEN", "METAAPI_API_KEY", "METAAPI_KEY", "META_API_TOKEN"] as const;
/** The configured token and the variable it came from. Surrounding quotes or a pasted "NAME=" prefix are tolerated. */
export function metaApiToken(env: Record<string, string | undefined> = process.env): { token: string; name: string } | null {
  for (const name of METAAPI_TOKEN_NAMES) {
    let v = env[name]?.trim();
    if (!v) continue;
    v = v.replace(/^[A-Z_]+=/, "").replace(/^["']|["']$/g, "").trim();
    if (v) return { token: v, name };
  }
  return null;
}

/**
 * Non-secret facts about the configured token, for diagnosing a refused token without ever revealing it: its length,
 * whether it is a JWT (MetaApi tokens are), its expiry and the API names its access rules cover. The signature and
 * the token itself are never returned.
 */
export function tokenShape(token: string, now = Date.now()) {
  const parts = token.split(".");
  const out: { length: number; jwt: boolean; expiresAt: string | null; expired: boolean | null; apis: string[] | null } = { length: token.length, jwt: false, expiresAt: null, expired: null, apis: null };
  if (parts.length !== 3) return out;
  try {
    const p = JSON.parse(Buffer.from(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as { exp?: number; accessRules?: { id?: unknown }[] };
    out.jwt = true;
    if (typeof p.exp === "number") { out.expiresAt = new Date(p.exp * 1000).toISOString(); out.expired = p.exp * 1000 < now; }
    if (Array.isArray(p.accessRules)) out.apis = p.accessRules.map((r) => (typeof r?.id === "string" ? r.id : "?")).slice(0, 20);
  } catch { /* not a JWT payload */ }
  return out;
}

export class MetaApiError extends Error {
  constructor(message: string, readonly status?: number, readonly retryAfter?: number, readonly code?: string, readonly serverNames?: string[]) { super(`MetaApi: ${message}`); }
}

/** Pulls the error code (E_AUTH, E_SRV_NOT_FOUND, …) and any suggested server names out of a MetaApi error body. */
export function errorDetails(body: unknown): { code?: string; serverNames?: string[] } {
  if (!body || typeof body !== "object") return {};
  const d = (body as { details?: unknown }).details;
  const pick = (x: unknown): { code?: string; serverNames?: string[] } => {
    if (!x || typeof x !== "object") return typeof x === "string" && /^E_[A-Z_]+$/.test(x) ? { code: x } : {};
    const o = x as { code?: unknown; serverNames?: unknown };
    const names = Array.isArray(o.serverNames) ? o.serverNames.filter((n): n is string => typeof n === "string").slice(0, 8) : undefined;
    return { code: typeof o.code === "string" ? o.code : undefined, serverNames: names };
  };
  if (Array.isArray(d)) { for (const x of d) { const r = pick(x); if (r.code) return r; } return {}; }
  return pick(d);
}

export interface MetaAccount { _id?: string; id?: string; name?: string; state: string; connectionStatus?: string; region?: string; platform?: string; login?: string | number; server?: string; type?: string }
/** investorMode: "flag indicating that investor password was used (supported for g2 only)" per MetaApi docs. */
export interface MetaAccountInfo { broker?: string; currency: string; server?: string; balance: number; equity: number; margin?: number; freeMargin?: number; leverage?: number; platform?: string; login?: number | string; investorMode?: boolean; tradeAllowed?: boolean; credit?: number; type?: string; name?: string }
export interface MetaPosition { id: string; type: string; symbol: string; openPrice: number; currentPrice?: number; volume: number; profit?: number; unrealizedProfit?: number; swap?: number; commission?: number; time: string; stopLoss?: number; takeProfit?: number }
export interface MetaOrder { id: string; type: string; state?: string; symbol: string; openPrice?: number; volume?: number; currentVolume?: number; stopLoss?: number; takeProfit?: number; time: string }
export interface MetaDeal { id: string; type: string; entryType?: string; symbol?: string; volume?: number; price?: number; profit?: number; commission?: number; swap?: number; time: string; positionId?: string; orderId?: string; comment?: string; stopLoss?: number; takeProfit?: number }

export function metaApi(token: string, fetchImpl: Fetch = fetch) {
  /** Every call has a time limit, so a slow broker check can never run into the platform's function limit. */
  async function call<T>(url: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(timeoutMs), headers: { "auth-token": token, "content-type": "application/json", accept: "application/json", ...(init.headers ?? {}) } });
    } catch (e) {
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      throw new MetaApiError(timedOut ? `no answer within ${Math.round(timeoutMs / 1000)} s` : "network error", timedOut ? 504 : 503);
    }
    if (res.status === 202) {
      throw new MetaApiError("request accepted, still processing", 202, Number(res.headers.get("retry-after") ?? 5));
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status}`, det: ReturnType<typeof errorDetails> = {}, retry: number | undefined;
      try {
        const b = (await res.json()) as { message?: string; error?: string; metadata?: { recommendedRetryTime?: string } };
        if (b.message) msg = b.message.slice(0, 240);
        if (b.error) msg = `${b.error.slice(0, 40)}: ${msg}`;
        det = errorDetails(b);
        if (b.metadata?.recommendedRetryTime) retry = Math.max(1, Math.ceil((Date.parse(b.metadata.recommendedRetryTime) - Date.now()) / 1000));
      } catch { /* body not JSON */ }
      throw new MetaApiError(msg, res.status, retry, det.code, det.serverNames);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  return {
    vendor: "metaapi" as const,
    /** Creates a cloud account with the investor password. MetaApi stores the password; Treidify does not need to. */
    /**
     * Always G2: only G2 reports investorMode, which is how Treidify proves a normal user's password is read-only.
     * magic 0: Treidify never places trades, so no expert magic number is reserved.
     */
    createAccount: (a: { platform: "mt4" | "mt5"; server: string; login: string; password: string; name: string; transactionId: string; reliability?: "regular" | "high"; region?: string }) =>
      call<{ id: string; state: string }>(`${PROVISIONING}/users/current/accounts`, {
        method: "POST",
        headers: { "transaction-id": a.transactionId },
        body: JSON.stringify({ name: a.name, login: a.login, password: a.password, server: a.server, platform: a.platform, magic: 0, type: "cloud-g2", reliability: a.reliability ?? "regular", manualTrades: false, ...(a.region ? { region: a.region } : {}) }),
      }),
    /** Read-only check that the token works for account management: lists at most one account. */
    probe: () => call<unknown[]>(`${PROVISIONING}/users/current/accounts?limit=1`),
    /** Accounts this token holds at MetaApi (read-only listing), used to find connections a timed-out request left behind. */
    list: async () => {
      const body = await call<MetaAccount[] | { items?: MetaAccount[] }>(`${PROVISIONING}/users/current/accounts?limit=100`);
      return Array.isArray(body) ? body : body.items ?? [];
    },
    account: (id: string) => call<MetaAccount>(`${PROVISIONING}/users/current/accounts/${encodeURIComponent(id)}`),
    deploy: (id: string) => call<void>(`${PROVISIONING}/users/current/accounts/${encodeURIComponent(id)}/deploy`, { method: "POST" }),
    /** Removes the account from MetaApi entirely, which also deletes the stored investor password there. */
    remove: (id: string) => call<void>(`${PROVISIONING}/users/current/accounts/${encodeURIComponent(id)}?executeForAllReplicas=true`, { method: "DELETE" }),
    info: (region: string, id: string, refresh = false) => call<MetaAccountInfo>(`${clientBase(region)}/users/current/accounts/${encodeURIComponent(id)}/account-information${refresh ? "?refreshTerminalState=true" : ""}`),
    positions: (region: string, id: string) => call<MetaPosition[]>(`${clientBase(region)}/users/current/accounts/${encodeURIComponent(id)}/positions`),
    /** Pending orders (limit, stop, stop-limit) currently on the account. */
    orders: (region: string, id: string) => call<MetaOrder[]>(`${clientBase(region)}/users/current/accounts/${encodeURIComponent(id)}/orders`),
    deals: async (region: string, id: string, from: Date, to: Date) => {
      const body = await call<MetaDeal[] | { deals: MetaDeal[] }>(`${clientBase(region)}/users/current/accounts/${encodeURIComponent(id)}/history-deals/time/${from.toISOString()}/${to.toISOString()}`, {}, 40_000);
      return Array.isArray(body) ? body : body.deals ?? [];
    },
  };
}
export type MetaApiClient = ReturnType<typeof metaApi>;
