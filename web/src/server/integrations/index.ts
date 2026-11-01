import "server-only";
import { NotConfiguredError, type AccountSyncProvider, type AiProvider, type BillingProvider, type MarketDataProvider, type NewsProvider, type ProviderInfo } from "./types";

export * from "./types";

/**
 * Registry. Each getter returns the configured adapter, or a not-connected stand-in that answers info() honestly
 * and throws NotConfiguredError for anything else. Vendor adapters are added here in Phase F, each behind an
 * end-to-end test with real credentials; `verified` flips to true only then.
 */
const env = (k: string) => process.env[k]?.trim() || null;

function missing(service: ProviderInfo["service"], vendor: string | null, needs: string[]) {
  const info: ProviderInfo = { service, vendor, configured: needs.length === 0, verified: false, needs };
  const fail = async (): Promise<never> => { throw new NotConfiguredError(labels[service], needs.length ? needs : ["a tested adapter"]); };
  return { info: () => info, fail };
}

const labels: Record<ProviderInfo["service"], string> = { sync: "Account sync", marketData: "Market data", news: "News feed", ai: "AI analysis", billing: "Billing" };
const need = (...keys: string[]) => keys.filter((k) => !env(k));

export function syncProvider(): AccountSyncProvider {
  const m = missing("sync", "metaapi", need("METAAPI_TOKEN"));
  return { info: m.info, connect: m.fail, status: m.fail, disconnect: m.fail, deals: m.fail, snapshot: m.fail };
}

export function marketDataProvider(): MarketDataProvider {
  const m = missing("marketData", env("MARKET_DATA_PROVIDER"), need("MARKET_DATA_PROVIDER", "MARKET_DATA_API_KEY"));
  return { info: m.info, candles: m.fail, quote: m.fail };
}

export function newsProvider(): NewsProvider {
  const m = missing("news", env("NEWS_PROVIDER"), need("NEWS_PROVIDER", "NEWS_API_KEY"));
  return { info: m.info, latest: m.fail, calendar: m.fail };
}

export function aiProvider(): AiProvider {
  const m = missing("ai", "anthropic", need("ANTHROPIC_API_KEY"));
  return { info: m.info, readChart: m.fail, coachReview: m.fail };
}

export function billingProvider(): BillingProvider {
  const m = missing("billing", "stripe", need("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_MONTHLY", "STRIPE_PRICE_ANNUAL"));
  return { info: m.info, checkout: m.fail, portal: m.fail, parseWebhook: m.fail };
}

/** One line per service for the admin and status pages. */
export const integrationReport = (): ProviderInfo[] => [syncProvider(), marketDataProvider(), newsProvider(), aiProvider(), billingProvider()].map((p) => p.info());
