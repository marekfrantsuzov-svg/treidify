/**
 * News provider settings. NEWS_PROVIDER + NEWS_API_KEY, or simply FINNHUB_API_KEY (which implies Finnhub).
 * Server only by use: the key is read here and sent from the server, never to the browser.
 */
const env = (k: string) => process.env[k]?.trim() || null;
export function newsConfig() {
  const key = env("NEWS_API_KEY") ?? env("FINNHUB_API_KEY");
  const provider = env("NEWS_PROVIDER") ?? (env("FINNHUB_API_KEY") ? "finnhub" : null);
  return { provider, key };
}
