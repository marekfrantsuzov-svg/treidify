import "server-only";
import type { UpcomingEvent } from "@/lib/intelligence";
import { reportError } from "@/lib/monitoring";
import { finnhub, type RawEvent } from "./finnhub";
import { officialCalendar } from "../macro/service";
import { cleanLine, cleanText } from "@/lib/news/sanitize";
import { newsConfig } from "./config";
import { categoriesOf, eventImportance, headlineImportance, tagInstruments, trackedKind, type Instrument, type NewsCategory } from "./classify";

export interface Headline { id: string; title: string; summary: string; source: string; url: string; publishedAt: string; instruments: Instrument[]; importance: "high" | "medium" | "low"; categories: NewsCategory[]; breaking: boolean; image: string | null }
export interface EconEvent {
  id: string; title: string; country: string; at: string; importance: "high" | "medium" | "low"; kind: ReturnType<typeof trackedKind>; actual: string | null; forecast: string | null; previous: string | null;
  /** upcoming: scheduled. released: actual is in. awaiting: release time has passed, the value is not in the source yet. */
  status?: "upcoming" | "released" | "awaiting";
  /** The previous value as first printed, when this release revised it. */
  revisedFrom?: string | null;
  /** The period the release refers to, e.g. "September 2026". */
  period?: string | null;
  currency?: string;
  agency?: string;
  sourceUrl?: string;
}

const env = (k: string) => process.env[k]?.trim() || null;
export function newsStatus() {
  const { provider, key } = newsConfig();
  const needs = [!provider && "NEWS_PROVIDER", !key && "NEWS_API_KEY (or FINNHUB_API_KEY)"].filter(Boolean) as string[];
  const supported = provider === null || provider === "finnhub";
  return { configured: needs.length === 0 && supported, vendor: provider, needs: supported ? needs : [`a supported NEWS_PROVIDER (finnhub), not "${provider}"`] };
}
const client = () => finnhub(newsConfig().key!);
/** Headlines older than this are never shown as latest news. */
export const MAX_AGE_MS = 72 * 3600_000;
/** A high-importance story counts as breaking for its first hour. */
export const BREAKING_MS = 60 * 60_000;

export type Result<T> = { ok: true; data: T; vendor: string; fetchedAt: string } | { ok: false; reason: "not-configured" | "error" | "not-in-plan"; message: string; needs?: string[]; detail?: string };
const detailOf = (e: unknown) => (e instanceof Error ? e.message : undefined);
const refusedByPlan = (e: unknown) => /HTTP (401|403)/.test(detailOf(e) ?? "");

export async function latestHeadlines(limit = 30): Promise<Result<Headline[]>> {
  const st = newsStatus();
  if (!st.configured) return { ok: false, reason: "not-configured", message: "The news feed is not connected.", needs: st.needs };
  try {
    // Three cached feeds (5 min each): well inside Finnhub's free 60 requests per minute.
    const [fx, gen, crypto] = await Promise.all([client().news("forex"), client().news("general"), client().news("crypto").catch(() => [])]);
    const seen = new Set<string>();
    const now = Date.now();
    const items = [...fx, ...gen, ...crypto]
      // Stale protection: drop items without a valid publication time, from the future, or older than 72 hours.
      .filter((n) => n.headline && n.url && Number.isFinite(n.datetime) && n.datetime * 1000 <= now + 5 * 60_000 && now - n.datetime * 1000 <= MAX_AGE_MS && !seen.has(n.url) && seen.add(n.url))
      .map((n) => {
        const text = `${n.headline} ${n.summary}`;
        const importance = headlineImportance(text);
        const publishedMs = n.datetime * 1000;
        return { id: String(n.id), title: cleanLine(n.headline), summary: cleanText(n.summary), source: cleanLine(n.source), url: n.url, publishedAt: new Date(publishedMs).toISOString(), instruments: tagInstruments(text), importance, categories: categoriesOf(text), breaking: importance === "high" && now - publishedMs <= BREAKING_MS, image: n.image && /^https:\/\//.test(n.image) ? n.image : null };
      })
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    // Instrument-relevant stories first, then everything else, newest first in each group.
    const breaking = items.filter((i) => i.breaking), relevant = items.filter((i) => !i.breaking && i.instruments.length), rest = items.filter((i) => !i.breaking && !i.instruments.length);
    return { ok: true, data: [...breaking, ...relevant, ...rest].slice(0, limit), vendor: "finnhub", fetchedAt: new Date().toISOString() };
  } catch (e) {
    reportError(e, { where: "news.latestHeadlines" });
    return { ok: false, reason: "error", message: "The news provider did not answer. No headlines are shown rather than old or invented ones.", detail: detailOf(e) };
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

const CURRENCY: Record<string, string> = { US: "USD", EU: "EUR", GB: "GBP", JP: "JPY", CN: "CNY", CA: "CAD", CH: "CHF", AU: "AUD", DE: "EUR" };
/** Official tracked-kind for the shared UI (FOMC, CPI...); other official releases keep their own label in the title. */
const OFFICIAL_KIND: Record<string, EconEvent["kind"]> = { FOMC: "FOMC", CPI: "CPI", PPI: "PPI", NFP: "NFP", GDP: "GDP", PCE: "PCE" };
/** Finnhub refused the calendar (plan): don't ask again for six hours on this instance. */
let calendarRefusedUntil = 0;
export const OFFICIAL_VENDOR = "Official US releases (BLS, BEA, Federal Reserve) via FRED";

/** The official US release calendar from FRED. Needs FRED_API_KEY (free). Forecasts are never available here. */
async function officialFallback(from: Date, to: Date, why: string): Promise<Result<EconEvent[]>> {
  if (!process.env.FRED_API_KEY?.trim()) {
    return { ok: false, reason: "not-configured", message: `${why} The official US release calendar needs a free FRED API key.`.trim(), needs: ["FRED_API_KEY"] };
  }
  try {
    const ev = await officialCalendar(from, to);
    const data: EconEvent[] = ev.map((e) => ({ id: e.id, title: e.title, country: e.country, at: e.at, importance: e.importance, kind: OFFICIAL_KIND[e.kind] ?? null, actual: e.actual, forecast: null, previous: e.previous, status: e.status, revisedFrom: e.revisedFrom, period: e.period, currency: e.currency, agency: e.agency, sourceUrl: e.sourceUrl }));
    return { ok: true, data, vendor: OFFICIAL_VENDOR, fetchedAt: new Date().toISOString() };
  } catch (e) {
    reportError(e, { where: "news.officialCalendar" });
    return { ok: false, reason: "error", message: "The official release calendar (FRED) did not answer, so no events are shown.", detail: detailOf(e) };
  }
}

/**
 * Economic calendar. Finnhub when the connected plan includes it (it adds forecasts and other countries); otherwise
 * the official US release schedule with actual and previous values from FRED.
 */
export async function economicCalendar(from: Date, to: Date): Promise<Result<EconEvent[]>> {
  const st = newsStatus();
  if (!st.configured || process.env.CALENDAR_PROVIDER?.trim() === "fred") return officialFallback(from, to, "");
  if (Date.now() < calendarRefusedUntil) return officialFallback(from, to, "The news plan does not include an economic calendar.");
  try {
    const raw = await client().calendar(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
    const now = Date.now();
    const data = raw.map(normaliseEvent).filter((x): x is EconEvent => !!x)
      .map((e) => ({ ...e, currency: CURRENCY[e.country], status: (Date.parse(e.at) > now ? "upcoming" : e.actual ? "released" : "awaiting") as EconEvent["status"] }))
      .sort((a, b) => a.at.localeCompare(b.at));
    return { ok: true, data, vendor: "finnhub", fetchedAt: new Date().toISOString() };
  } catch (e) {
    if (refusedByPlan(e)) { calendarRefusedUntil = Date.now() + 6 * 3600_000; return officialFallback(from, to, "The news plan does not include an economic calendar."); }
    reportError(e, { where: "news.economicCalendar" });
    return officialFallback(from, to, "The calendar provider did not answer.");
  }
}

/** High and medium-impact events in the next 24 hours, for the engine's event-risk rule. Empty when not connected. */
export async function upcomingEvents(now = new Date()): Promise<UpcomingEvent[]> {
  const r = await economicCalendar(now, new Date(now.getTime() + 36 * 3600_000));
  if (!r.ok) return [];
  return r.data.filter((e) => e.importance !== "low" && Date.parse(e.at) >= now.getTime() && Date.parse(e.at) <= now.getTime() + 24 * 3600_000)
    .map((e) => ({ title: `${e.country} ${e.title}`, at: new Date(e.at), importance: e.importance, country: e.country }));
}

/** One story from the current feed by its provider id (the feed is cached, so this costs no extra request). */
export async function headlineById(id: string): Promise<{ ok: true; item: Headline | null; vendor: string; fetchedAt: string } | { ok: false; message: string; needs?: string[] }> {
  const r = await latestHeadlines(120);
  if (!r.ok) return { ok: false, message: r.message, needs: r.needs };
  return { ok: true, item: r.data.find((h) => h.id === id) ?? null, vendor: r.vendor, fetchedAt: r.fetchedAt };
}
