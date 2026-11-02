import "server-only";
import { newsConfig } from "./news/config";

/**
 * Which external providers are configured in this environment. Every surface that depends on one
 * checks here and shows an honest "not connected" state instead of sample data presented as live.
 */
export const syncProviderConfigured = () => Boolean(process.env.METAAPI_TOKEN);
export const marketDataConfigured = () => Boolean(process.env.MARKET_DATA_PROVIDER && process.env.MARKET_DATA_API_KEY);
export const newsConfigured = () => { const c = newsConfig(); return Boolean(c.provider && c.key); };
export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);
export const billingConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export function providerStatus() {
  return {
    sync: syncProviderConfigured(),
    marketData: marketDataConfigured(),
    news: newsConfigured(),
    ai: aiConfigured(),
    billing: billingConfigured(),
  };
}
