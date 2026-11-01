/**
 * MetaApi cloud REST adapter (https://metaapi.cloud/docs). Read-only use: Treidify connects with the INVESTOR
 * password, and refuses accounts that MetaApi reports as not in investor mode. Never call trading endpoints.
 * No "server-only" import so it can be unit tested with a mocked fetch. The token is sent only from the server.
 */
type Fetch = typeof fetch;
const PROVISIONING = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const clientBase = (region: string) => `https://mt-client-api-v1.${region}.agiliumtrade.ai`;

export class MetaApiError extends Error {
  constructor(message: string, readonly status?: number, readonly retryAfter?: number) { super(`MetaApi: ${message}`); }
}

export interface MetaAccount { _id?: string; id?: string; state: string; connectionStatus?: string; region?: string; platform?: string; login?: string; server?: string }
export interface MetaAccountInfo { broker?: string; currency: string; server?: string; balance: number; equity: number; margin?: number; freeMargin?: number; leverage?: number; platform?: string; login?: number | string; investorMode?: boolean; name?: string }
export interface MetaPosition { id: string; type: string; symbol: string; openPrice: number; currentPrice?: number; volume: number; profit?: number; unrealizedProfit?: number; swap?: number; commission?: number; time: string; stopLoss?: number; takeProfit?: number }
export interface MetaDeal { id: string; type: string; entryType?: string; symbol?: string; volume?: number; price?: number; profit?: number; commission?: number; swap?: number; time: string; positionId?: string; orderId?: string; comment?: string; stopLoss?: number; takeProfit?: number }

export function metaApi(token: string, fetchImpl: Fetch = fetch) {
  async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
    const res = await fetchImpl(url, { ...init, cache: "no-store", headers: { "auth-token": token, "content-type": "application/json", accept: "application/json", ...(init.headers ?? {}) } });
    if (res.status === 202) {
      throw new MetaApiError("request accepted, still processing", 202, Number(res.headers.get("retry-after") ?? 5));
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const b = (await res.json()) as { message?: string }; if (b.message) msg = b.message; } catch { /* body not JSON */ }
      throw new MetaApiError(msg, res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  return {
    vendor: "metaapi" as const,
    /** Creates a cloud account with the investor password. MetaApi stores the password; Treidify does not need to. */
    createAccount: (a: { platform: "mt4" | "mt5"; server: string; login: string; password: string; name: string; transactionId: string }) =>
      call<{ id: string; state: string }>(`${PROVISIONING}/users/current/accounts`, {
        method: "POST",
        headers: { "transaction-id": a.transactionId },
        body: JSON.stringify({ name: a.name, login: a.login, password: a.password, server: a.server, platform: a.platform, magic: 0, type: "cloud-g2", reliability: "regular", manualTrades: false }),
      }),
    account: (id: string) => call<MetaAccount>(`${PROVISIONING}/users/current/accounts/${encodeURIComponent(id)}`),
    deploy: (id: string) => call<void>(`${PROVISIONING}/users/current/accounts/${encodeURIComponent(id)}/deploy`, { method: "POST" }),
    /** Removes the account from MetaApi entirely, which also deletes the stored investor password there. */
    remove: (id: string) => call<void>(`${PROVISIONING}/users/current/accounts/${encodeURIComponent(id)}?executeForAllReplicas=true`, { method: "DELETE" }),
    info: (region: string, id: string) => call<MetaAccountInfo>(`${clientBase(region)}/users/current/accounts/${encodeURIComponent(id)}/account-information`),
    positions: (region: string, id: string) => call<MetaPosition[]>(`${clientBase(region)}/users/current/accounts/${encodeURIComponent(id)}/positions`),
    deals: async (region: string, id: string, from: Date, to: Date) => {
      const body = await call<MetaDeal[] | { deals: MetaDeal[] }>(`${clientBase(region)}/users/current/accounts/${encodeURIComponent(id)}/history-deals/time/${from.toISOString()}/${to.toISOString()}`);
      return Array.isArray(body) ? body : body.deals ?? [];
    },
  };
}
export type MetaApiClient = ReturnType<typeof metaApi>;
