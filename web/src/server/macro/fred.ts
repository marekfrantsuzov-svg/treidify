/**
 * FRED (Federal Reserve Bank of St. Louis) adapter. Official US statistics as published by BLS, BEA and the Federal
 * Reserve, plus each release's official schedule. https://fred.stlouisfed.org/docs/api/fred/
 *
 * With FRED_API_KEY: the API (values, real-time vintages, release dates). Without it: the public fredgraph CSV
 * download, which has values only (no release dates, no vintages). The key is free and is sent from the server only.
 */
type Fetch = typeof fetch;
const API = "https://api.stlouisfed.org/fred";
const CSV = "https://fred.stlouisfed.org/graph/fredgraph.csv";

export interface Obs { date: string; value: number | null }
/** An observation as it stood between realtime_start and realtime_end (ALFRED vintages). */
export interface VObs extends Obs { realtimeStart: string; realtimeEnd: string }

const num = (v: string | undefined) => { if (v === undefined || v === "." || v.trim() === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

export class FredError extends Error {}

/**
 * A FRED API key is 32 lower-case letters and digits. Values pasted into a dashboard often carry extra characters
 * (spaces, quotes, upper case, or the whole "FRED_API_KEY=..." line), which FRED rejects with HTTP 400. This reads the
 * key out of such a value, or returns null when there is no usable key in it.
 */
export function normalizeFredKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^FRED_API_KEY\s*[=:]\s*/i, "").replace(/^["'`]+|["'`]+$/g, "").trim().toLowerCase();
  if (/^[a-z0-9]{32}$/.test(s)) return s;
  // A pasted request URL: take the api_key parameter.
  const param = s.match(/api_key=([a-z0-9]{32})(?![a-z0-9])/);
  if (param) return param[1]!;
  const m = s.match(/(?:^|[^a-z0-9])([a-z0-9]{32})(?:$|[^a-z0-9])/);
  return m ? m[1]! : null;
}

/** The placeholder key printed in FRED's documentation examples. It is not a real key. */
export const FRED_DOCS_PLACEHOLDER = "abcdefghijklmnopqrstuvwxyz123456";

/** What is wrong with a FRED_API_KEY value, without revealing it: only its shape. */
export function fredKeyState(raw: string | null | undefined): { state: "ok" | "missing" | "malformed" | "placeholder"; length: number; shape?: { url: boolean; apiKeyParam: boolean; whitespace: boolean; quotes: boolean; upperCase: boolean; tokens32: number } } {
  if (!raw || !raw.trim()) return { state: "missing", length: 0 };
  const k = normalizeFredKey(raw);
  const shape = { url: /https?:|stlouisfed\.org/i.test(raw), apiKeyParam: /api_key=/i.test(raw), whitespace: /\s/.test(raw.trim()) || raw !== raw.trim(), quotes: /["'`]/.test(raw), upperCase: /[A-Z]/.test(raw), tokens32: (raw.toLowerCase().match(/(?<![a-z0-9])[a-z0-9]{32}(?![a-z0-9])/g) ?? []).length };
  if (k === FRED_DOCS_PLACEHOLDER) return { state: "placeholder", length: raw.length, shape };
  return { state: k ? "ok" : "malformed", length: raw.length, ...(raw.trim().length === 32 ? {} : { shape }) };
}

export function fred(key: string | null, fetchImpl: Fetch = fetch) {
  async function api<T>(path: string, params: Record<string, string>, revalidate: number): Promise<T> {
    if (!key) throw new FredError("fred: FRED_API_KEY is not set");
    const url = new URL(API + path);
    for (const [k, v] of Object.entries({ ...params, file_type: "json" })) url.searchParams.set(k, v);
    url.searchParams.set("api_key", key);
    const res = await fetchImpl(url, { next: { revalidate } } as RequestInit);
    if (!res.ok) {
      let msg = "";
      try { msg = ((await res.json()) as { error_message?: string }).error_message ?? ""; } catch { /* not JSON */ }
      throw new FredError(`fred: HTTP ${res.status}${msg ? ` ${msg}` : ""}`);
    }
    return (await res.json()) as T;
  }

  return {
    hasKey: Boolean(key),
    /** Current values (latest vintage). */
    async observations(id: string, start: string, revalidate: number): Promise<Obs[]> {
      const r = await api<{ observations: { date: string; value: string }[] }>("/series/observations", { series_id: id, observation_start: start }, revalidate);
      return r.observations.map((o) => ({ date: o.date, value: num(o.value) }));
    },
    /** Every vintage of each observation since `realtimeStart` (output_type=1). Lets us tell first prints from revisions. */
    async vintages(id: string, start: string, realtimeStart: string, revalidate: number): Promise<VObs[]> {
      const r = await api<{ observations: { date: string; value: string; realtime_start: string; realtime_end: string }[] }>("/series/observations",
        { series_id: id, observation_start: start, realtime_start: realtimeStart, realtime_end: "9999-12-31", output_type: "1" }, revalidate);
      return r.observations.map((o) => ({ date: o.date, value: num(o.value), realtimeStart: o.realtime_start, realtimeEnd: o.realtime_end }));
    },
    /** Official release dates (past and scheduled) of one FRED release, between `from` and `to` (YYYY-MM-DD). */
    async releaseDates(releaseId: number, from: string, to: string, revalidate: number): Promise<string[]> {
      const r = await api<{ release_dates: { release_id: number; date: string }[] }>("/release/dates",
        { release_id: String(releaseId), realtime_start: from, realtime_end: to, include_release_dates_with_no_data: "true", sort_order: "asc", limit: "1000" }, revalidate);
      return r.release_dates.map((d) => d.date).filter((d) => d >= from && d <= to);
    },
    /** Keyless public CSV: current values only. */
    async csv(id: string, start: string, revalidate: number): Promise<Obs[]> {
      const url = new URL(CSV);
      url.searchParams.set("id", id);
      url.searchParams.set("cosd", start);
      const res = await fetchImpl(url, { next: { revalidate } } as RequestInit);
      if (!res.ok) throw new FredError(`fred csv: HTTP ${res.status}`);
      return parseFredCsv(await res.text());
    },
  };
}
export type FredClient = ReturnType<typeof fred>;

/** fredgraph.csv: a header row ("observation_date,ID" or "DATE,ID") then "YYYY-MM-DD,value" rows; "." is missing. */
export function parseFredCsv(text: string): Obs[] {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length || !/date/i.test(lines[0]!)) throw new FredError("fred csv: unexpected format");
  return lines.slice(1).map((l) => { const [date, v] = l.split(","); return { date: date!.trim(), value: num(v?.trim()) }; }).filter((o) => /^\d{4}-\d{2}-\d{2}$/.test(o.date));
}

/** The vintage of a series as it was known on `day` (YYYY-MM-DD): date → value. */
export function vintageAt(rows: VObs[], day: string): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (const r of rows) if (r.realtimeStart <= day && day <= r.realtimeEnd) m.set(r.date, r.value);
  return m;
}
