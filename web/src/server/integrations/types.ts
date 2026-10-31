/**
 * Contracts for every external service. Pages and actions depend on these interfaces, never on a vendor SDK,
 * so a provider can be swapped or switched on without touching the UI. Each provider reports whether it is
 * configured; nothing is presented as live until its adapter has been tested end to end.
 */
import type { Candle } from "@/lib/analytics";

export class NotConfiguredError extends Error {
  constructor(readonly service: string, readonly needs: string[]) {
    super(`${service} is not connected yet. Needs: ${needs.join(", ")}.`);
  }
}

export interface ProviderInfo {
  service: "sync" | "marketData" | "news" | "ai" | "billing";
  vendor: string | null;
  configured: boolean;
  /** True only after the adapter has passed an end-to-end test against the real service. */
  verified: boolean;
  needs: string[];
}

// ── Account sync (MT4/MT5) ────────────────────────────────────────────────
export interface ConnectRequest { platform: "mt4" | "mt5"; server: string; login: string; investorPassword: string }
export interface ConnectResult { externalId: string; status: "pending" | "connected" | "error"; message?: string }
export interface SyncedDeal { externalId: string; positionId: string; symbol: string; type: string; entry: string; volume: number; price: number; profit: number; commission: number; swap: number; fee: number; time: Date }
export interface AccountSyncProvider {
  info(): ProviderInfo;
  /** Read-only connection with an investor password. Must never request trading permissions. */
  connect(req: ConnectRequest): Promise<ConnectResult>;
  status(externalId: string): Promise<ConnectResult>;
  disconnect(externalId: string): Promise<void>;
  /** Deals since a time, used for backfill and incremental sync by the worker, not by web requests. */
  deals(externalId: string, since: Date): Promise<SyncedDeal[]>;
  snapshot(externalId: string): Promise<{ balance: number; equity: number; currency: string; at: Date }>;
}

// ── Market data ───────────────────────────────────────────────────────────
export type Timeframe = "1M" | "5M" | "15M" | "1H" | "4H" | "1D";
export interface MarketDataProvider {
  info(): ProviderInfo;
  candles(symbol: string, tf: Timeframe, count: number): Promise<Candle[]>;
  quote(symbol: string): Promise<{ bid: number; ask: number; at: Date }>;
}

// ── News and calendar ─────────────────────────────────────────────────────
export interface NewsItem {
  id: string; title: string; summary: string; publishedAt: Date; url: string;
  sources: { name: string; url: string }[];
  category: "centralBanks" | "economicData" | "geopolitics" | "commodities" | "markets" | "other";
  importance: "high" | "medium" | "low";
  /** Only images the vendor licenses for display; otherwise null and the UI uses branded art. */
  image: { url: string; credit: string; license: string } | null;
}
export interface CalendarEvent { id: string; title: string; country: string; at: Date; importance: "high" | "medium" | "low"; forecast: string | null; previous: string | null; actual: string | null }
export interface NewsProvider {
  info(): ProviderInfo;
  latest(opts: { since?: Date; categories?: NewsItem["category"][]; limit?: number }): Promise<NewsItem[]>;
  calendar(from: Date, to: Date): Promise<CalendarEvent[]>;
}

// ── AI ────────────────────────────────────────────────────────────────────
export interface ChartReading { instrument: string | null; timeframe: string | null; structure: string; zones: { kind: string; from: number; to: number; why: string }[]; scenarios: { bias: "bullish" | "bearish"; confirm: string; invalidate: string }[]; limits: string[] }
export interface AiProvider {
  info(): ProviderInfo;
  readChart(image: { bytes: Uint8Array; mime: string }, context: { question?: string }): Promise<ChartReading>;
  /** Writes a review from computed metrics and observations only. It never infers emotions. */
  coachReview(input: { period: "daily" | "weekly" | "monthly"; metrics: Record<string, number | null>; observations: { title: string; evidence: string[] }[]; notes: string[] }): Promise<{ summary: string; plan: string[] }>;
}

// ── Billing ───────────────────────────────────────────────────────────────
export interface BillingProvider {
  info(): ProviderInfo;
  checkout(input: { userId: string; email: string; interval: "month" | "year"; returnUrl: string }): Promise<{ url: string }>;
  portal(input: { userId: string; returnUrl: string }): Promise<{ url: string }>;
  /** Verifies the signature and returns a normalised event, or throws. */
  parseWebhook(rawBody: string, signature: string | null): Promise<{ type: "subscription.active" | "subscription.canceled" | "payment.failed" | "ignored"; userId?: string; periodEnd?: Date }>;
}
