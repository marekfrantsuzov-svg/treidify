/**
 * Finnhub adapter for market news and the economic calendar (https://finnhub.io/docs/api).
 * The economic calendar needs a Finnhub plan that includes it. Key travels in the X-Finnhub-Token header.
 */
type Fetch = typeof fetch;
const BASE = "https://finnhub.io/api/v1";

export interface RawNews { id: number; datetime: number; headline: string; summary: string; source: string; url: string; category: string; image?: string; related?: string }
export interface RawEvent { event: string; country: string; time: string; impact?: string; actual?: number | null; estimate?: number | null; prev?: number | null; unit?: string }

export function finnhub(token: string, fetchImpl: Fetch = fetch) {
  async function get<T>(path: string, params: Record<string, string>, revalidate: number): Promise<T> {
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetchImpl(url, { headers: { "X-Finnhub-Token": token }, next: { revalidate } } as RequestInit);
    if (!res.ok) throw new Error(`finnhub: HTTP ${res.status}`);
    return (await res.json()) as T;
  }
  return {
    vendor: "finnhub" as const,
    news: (category: "forex" | "general") => get<RawNews[]>("/news", { category }, 300),
    calendar: async (from: string, to: string) => (await get<{ economicCalendar?: RawEvent[] }>("/calendar/economic", { from, to }, 1800)).economicCalendar ?? [],
  };
}
