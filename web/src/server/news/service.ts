import "server-only";
import type { UpcomingEvent } from "@/lib/intelligence";
import { reportError } from "@/lib/monitoring";
import { finnhub, type RawEvent } from "./finnhub";
import { eventImportance, headlineImportance, tagInstruments, trackedKind, type Instrument } from "./classify";

export interface Headline { id: string; title: string; summary: string; source: string; url: string; publishedAt: string; instruments: Instrument[]; importance: "high" | "medium" | "low" }
export interface EconEvent { id: string; title: string; country: string; at: string; importance: "high" | "medium" | "low"; kind: ReturnType<typeof trackedKind>; actual: string | null; forecast: string | null; previous: string | null }

const env = (k: string) => process.env[k]?.trim() || null;
export function newsStatus() {
  const provider = env("NEWS_PROVIDER");
  const needs = [!provider && "NEWS_PROVIDER", !env("NEWS_API_KEY") && "NEWS_API_KEY"].filter(Boolean) as string[];
  const supported = provider === null || provider === "finnhub";
  return { configured: needs.length === 0 && supported, vendor: provider, needs: supported ? needs : [`a supported NEWS_PROVIDER (finnhub), not "${provider}"`] };
}
const client = () => finnhub(env("NEWS_API_KEY")!);

export type Result<T> = { ok: true; data: T; vendor: string; fetchedAt: string } | { ok: false; reason: "not-configured" | "error"; message: string; needs?: string[] };

export async function latestHeadlines(limit = 30): Promise<Result<Headline[]>> {
  const st = newsStatus();
  if (!st.configured) return { ok: false, reason: "not-configured", message: "The news feed is not connected.", needs: st.needs };
  try {
    const [fx, gen] = await Promise.all([client().news("forex"), client().news("general")]);
    const seen = new Set<string>();
    const items = [...fx, ...gen]
      .filter((n) => n.headline && n.url && !seen.has(n.url) && seen.add(n.url))
      .map((n) => {
        const text = `${n.headline} ${n.summary}`;
        return { id: String(n.id), title: n.headline, summary: n.summary, source: n.source, url: n.url, publishedAt: new Date(n.datetime * 1000).toISOString(), instruments: tagInstruments(text), importance: headlineImportance(text) };
      })
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    // Instrument-relevant stories first, then everything else, newest first in each group.
    const relevant = items.filter((i) => i.instruments.length), rest = items.filter((i) => !i.instruments.length);
    return { ok: true, data: [...relevant, ...rest].slice(0, limit), vendor: "finnhub", fetchedAt: new Date().toISOString() };
  } catch (e) {
    reportError(e, { where: "news.latestHeadlines" });
    return { ok: false, reason: "error", message: "The news provider did not answer. No headlines are shown rather than old or invented ones." };
  }
}

const num = (v: number | null | undefined, unit?: string) => (v === null || v === undefined ? null : `${v}${unit && unit !== "" ? unit : ""}`);
const MAJOR = new Set(["US", "EU", "GB", "JP", "CN", "CA", "CH", "AU", "DE"]);

export function normaliseEvent(e: RawEvent, i: number): EconEvent | null {
  // Finnhub calendar times are UTC "YYYY-MM-DD HH:MM:SS".
  const at = Date.parse(`${e.time.replace(" ", "T")}Z`);
  if (!Number.isFinite(at) || !MAJOR.has(e.country)) return null;
  return { id: `${e.country}-${at}-${i}`, title: e.event, country: e.country, at: new Date(at).toISOString(), importance: eventImportance(e.event, e.impact), kind: trackedKind(e.event), actual: num(e.actual, e.unit), forecast: num(e.estimate, e.unit), previous: num(e.prev, e.unit) };
}

export async function economicCalendar(from: Date, to: Date): Promise<Result<EconEvent[]>> {
  const st = newsStatus();
  if (!st.configured) return { ok: false, reason: "not-configured", message: "The economic calendar is not connected.", needs: st.needs };
  try {
    const raw = await client().calendar(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
    const data = raw.map(normaliseEvent).filter((x): x is EconEvent => !!x).sort((a, b) => a.at.localeCompare(b.at));
    return { ok: true, data, vendor: "finnhub", fetchedAt: new Date().toISOString() };
  } catch (e) {
    reportError(e, { where: "news.economicCalendar" });
    return { ok: false, reason: "error", message: "The calendar provider did not answer, so no events are shown." };
  }
}

/** High and medium-impact events in the next 24 hours, for the engine's event-risk rule. Empty when not connected. */
export async function upcomingEvents(now = new Date()): Promise<UpcomingEvent[]> {
  const r = await economicCalendar(now, new Date(now.getTime() + 36 * 3600_000));
  if (!r.ok) return [];
  return r.data.filter((e) => e.importance !== "low" && Date.parse(e.at) >= now.getTime() && Date.parse(e.at) <= now.getTime() + 24 * 3600_000)
    .map((e) => ({ title: `${e.country} ${e.title}`, at: new Date(e.at), importance: e.importance, country: e.country }));
}
