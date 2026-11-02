import "server-only";
import { cache } from "react";
import { reportError } from "@/lib/monitoring";
import { addDays, isoDay, zonedToUtc } from "@/lib/time/zoned";
import { compute, fmtLine, fmtRange, fomcOutcome, gdpEstimate, latestDate, lineAt, quarterLabel, US_RELEASES, type LineDef, type ReleaseDef } from "./calc";
import { fred, FRED_DOCS_PLACEHOLDER, fredKeyState, normalizeFredKey, type Obs, type VObs } from "./fred";

/**
 * US macro data from official sources through FRED: the Fed's target range, CPI, GDP, and the official release
 * schedule for the economic calendar. Values change only when an agency publishes, so they are cached for an hour,
 * and for ten minutes around scheduled release times so a new print shows up shortly after it is published.
 */
const ET = "America/New_York";
const env = (k: string) => process.env[k]?.trim() || null;
const usableKey = () => { const k = normalizeFredKey(env("FRED_API_KEY")); return k && k !== FRED_DOCS_PLACEHOLDER ? k : null; };
const client = () => fred(usableKey());
/** True only when FRED_API_KEY holds a usable key (32 lower-case letters and digits, not the docs example). */
export const macroKeyConfigured = () => Boolean(usableKey());
export const macroKeyState = () => fredKeyState(process.env.FRED_API_KEY);

export const SOURCE = {
  fred: { name: "FRED, Federal Reserve Bank of St. Louis", url: "https://fred.stlouisfed.org/" },
  rates: { name: "Federal Reserve (via FRED: DFEDTARL, DFEDTARU)", url: "https://fred.stlouisfed.org/series/DFEDTARU" },
  cpi: { name: "US Bureau of Labor Statistics (via FRED: CPIAUCNS)", url: "https://fred.stlouisfed.org/series/CPIAUCNS" },
  gdp: { name: "US Bureau of Economic Analysis (via FRED: A191RL1Q225SBEA)", url: "https://fred.stlouisfed.org/series/A191RL1Q225SBEA" },
} as const;

/**
 * FOMC meeting schedule published by the Federal Reserve (statement day = second day of each meeting). Used when the
 * FRED key is missing; with the key, FRED's schedule for its "FOMC Press Release" (release 101) is used instead.
 * Source: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
 */
export const FOMC_STATEMENT_DAYS = ["2025-01-29", "2025-03-19", "2025-05-07", "2025-06-18", "2025-07-30", "2025-09-17", "2025-10-29", "2025-12-10",
  "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17", "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09",
  "2027-01-27", "2027-03-17", "2027-04-28", "2027-06-09", "2027-07-28", "2027-09-15", "2027-10-27", "2027-12-08"];

/** Ten minutes from 30 min before to 4 hours after a scheduled release, an hour otherwise. */
function ttl(now: Date, schedule: { at: Date }[]) {
  const t = now.getTime();
  return schedule.some((s) => t >= s.at.getTime() - 30 * 60_000 && t <= s.at.getTime() + 4 * 3600_000) ? 600 : 3600;
}

/** Scheduled release dates for each tracked release, from FRED's official schedule. Cached 6 hours. */
const scheduleFor = cache(async (from: string, to: string): Promise<Map<string, string[]>> => {
  const c = client();
  const out = new Map<string, string[]>();
  await Promise.all(US_RELEASES.map(async (r) => { out.set(r.id, await c.releaseDates(r.releaseId, from, to, 21_600)); }));
  return out;
});

const at = (r: ReleaseDef, day: string) => zonedToUtc(day, r.timeEt, ET);
const fomcDays = async (from: string, to: string) => {
  if (!macroKeyConfigured()) return FOMC_STATEMENT_DAYS.filter((d) => d >= from && d <= to);
  try { const s = await scheduleFor(from, to); const d = s.get("fomc") ?? []; return d.length ? d : FOMC_STATEMENT_DAYS.filter((x) => x >= from && x <= to); }
  catch { return FOMC_STATEMENT_DAYS.filter((d) => d >= from && d <= to); }
};

async function values(id: string, start: string, revalidate: number): Promise<{ obs: Obs[]; via: "api" | "csv" }> {
  const c = client();
  if (c.hasKey) {
    try { return { obs: await c.observations(id, start, revalidate), via: "api" }; }
    catch (e) { reportError(e, { where: `macro.values.api.${id}` }); /* the public download still has the values */ }
  }
  return { obs: await c.csv(id, start, revalidate), via: "csv" };
}

/** First publication date of an observation: the earliest vintage that contains it. Needs the key. */
async function firstPublished(id: string, date: string, now: Date, revalidate: number): Promise<string | null> {
  const c = client();
  if (!c.hasKey) return null;
  const rows = await c.vintages(id, date, isoDay(Date.parse(`${date}T00:00:00Z`)), revalidate);
  return rows.filter((r) => r.date === date && r.value !== null).map((r) => r.realtimeStart).sort()[0] ?? null;
}

export interface MacroPoint { date: string; value: number }
export interface MacroIndicator {
  id: "rates" | "inflation" | "gdp";
  ok: boolean;
  /** Headline value as displayed, e.g. "3.75–4.00%" or "3.0%". */
  value: string | null;
  /** What the value is, e.g. "Federal funds target range". */
  measure: string;
  /** The period the value refers to, e.g. "September 2026" or "Q3 2026". */
  period: string | null;
  /** When the agency published it (YYYY-MM-DD), when known. */
  releasedOn: string | null;
  previous: string | null;
  previousLabel: string;
  /** Extra verified facts (last decision, estimate type, core CPI...). */
  facts: { label: string; value: string }[];
  next: { label: string; at: string } | null;
  history: MacroPoint[];
  historyLabel: string;
  source: { name: string; url: string };
  via: "api" | "csv" | null;
  fetchedAt: string;
  message: string | null;
  needs: string[];
}

const monthName = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const fail = (id: MacroIndicator["id"], measure: string, source: { name: string; url: string }, e: unknown): MacroIndicator => {
  reportError(e, { where: `macro.${id}` });
  return { id, ok: false, value: null, measure, period: null, releasedOn: null, previous: null, previousLabel: "Previous", facts: [], next: null, history: [], historyLabel: "", source, via: null, fetchedAt: new Date().toISOString(), message: `FRED did not answer (${e instanceof Error ? e.message : "error"}). Nothing is shown rather than an old or estimated value.`, needs: [] };
};
const needsKey = () => (macroKeyConfigured() ? [] : ["FRED_API_KEY (free) for release dates"]);

async function nextRelease(r: ReleaseDef, now: Date): Promise<{ label: string; at: string } | null> {
  if (r.id === "fomc") {
    const d = (await fomcDays(isoDay(now.getTime() - 86_400_000), addDays(isoDay(now.getTime()), 400))).map((x) => at(r, x)).find((x) => x.getTime() > now.getTime());
    return d ? { label: "Next FOMC decision", at: d.toISOString() } : null;
  }
  if (!macroKeyConfigured()) return null;
  try {
    const s = await scheduleFor(isoDay(now.getTime() - 86_400_000), addDays(isoDay(now.getTime()), 120));
    const d = (s.get(r.id) ?? []).map((x) => at(r, x)).find((x) => x.getTime() > now.getTime());
    return d ? { label: `Next ${r.kind === "CPI" ? "CPI" : r.kind === "GDP" ? "GDP" : r.name} release`, at: d.toISOString() } : null;
  } catch { return null; }
}

export async function ratesIndicator(now = new Date()): Promise<MacroIndicator> {
  const def = US_RELEASES.find((r) => r.id === "fomc")!;
  try {
    const start = addDays(isoDay(now.getTime()), -3 * 365);
    const [u, l] = await Promise.all([values("DFEDTARU", start, 3600), values("DFEDTARL", start, 3600)]);
    const um = new Map(u.obs.map((o) => [o.date, o.value])), lm = new Map(l.obs.map((o) => [o.date, o.value]));
    const last = latestDate(um);
    if (!last) throw new Error("no target range observations");
    const value = fmtRange(lm.get(last) ?? null, um.get(last) ?? null);
    const meetings = (await fomcDays(addDays(isoDay(now.getTime()), -400), addDays(isoDay(now.getTime()), 400))).filter((d) => at(def, d).getTime() <= now.getTime());
    const lastMeeting = meetings.at(-1) ?? null;
    const facts: { label: string; value: string }[] = [];
    let previous: string | null = null;
    if (lastMeeting) {
      const before = [...um.keys()].filter((d) => d <= lastMeeting).sort().at(-1);
      const after = [...um.keys()].filter((d) => d > lastMeeting).sort()[0];
      const outcome = after && before ? fomcOutcome(um.get(before) ?? null, um.get(after) ?? null) : null;
      previous = before ? fmtRange(lm.get(before) ?? null, um.get(before) ?? null) : null;
      facts.push({ label: "Last decision", value: `${new Date(`${lastMeeting}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}${outcome ? ` · ${outcome}` : " · awaiting FRED update"}` });
    }
    // Monthly end-of-month upper bound for the trend chart.
    const byMonth = new Map<string, MacroPoint>();
    for (const o of u.obs) if (o.value !== null) byMonth.set(o.date.slice(0, 7), { date: o.date, value: o.value });
    const history = [...byMonth.values()].slice(-36);
    return {
      id: "rates", ok: true, value, measure: "Federal funds target range", period: `In effect ${new Date(`${last}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`,
      releasedOn: lastMeeting, previous, previousLabel: "Before last decision", facts, next: await nextRelease(def, now), history, historyLabel: "Upper bound of the target range, end of month",
      source: SOURCE.rates, via: u.via, fetchedAt: now.toISOString(), message: null, needs: [],
    };
  } catch (e) { return fail("rates", "Federal funds target range", SOURCE.rates, e); }
}

export async function inflationIndicator(now = new Date()): Promise<MacroIndicator> {
  const def = US_RELEASES.find((r) => r.id === "cpi")!;
  try {
    const start = addDays(isoDay(now.getTime()), -4 * 365);
    const [h, core] = await Promise.all([values("CPIAUCNS", start, 3600), values("CPILFENS", start, 3600).catch(() => null)]);
    const m = new Map(h.obs.map((o) => [o.date, o.value]));
    const last = latestDate(m);
    if (!last) throw new Error("no CPI observations");
    const dates = [...m.keys()].filter((d) => m.get(d) !== null).sort();
    const prev = dates.at(-2) ?? null;
    const yoy = (d: string) => compute(m, d, "pct_yoy");
    const line: Pick<LineDef, "digits" | "unit" | "t"> = { digits: 1, unit: "%", t: "pct_yoy" };
    const history = dates.slice(-36).map((d) => ({ date: d, value: yoy(d) })).filter((p): p is MacroPoint => p.value !== null);
    const facts: { label: string; value: string }[] = [];
    if (core) { const cm = new Map(core.obs.map((o) => [o.date, o.value])); const cv = fmtLine(compute(cm, last, "pct_yoy"), line); if (cv) facts.push({ label: "Core CPI y/y (ex food and energy)", value: cv }); }
    const mm = fmtLine(compute(m, last, "pct_mom"), { digits: 1, unit: "%", t: "pct_mom" });
    if (mm) facts.push({ label: "Not seasonally adjusted m/m", value: mm });
    return {
      id: "inflation", ok: true, value: fmtLine(yoy(last), line), measure: "CPI, all items, year over year", period: monthName(last),
      releasedOn: await firstPublished("CPIAUCNS", last, now, 3600).catch(() => null), previous: prev ? fmtLine(yoy(prev), line) : null, previousLabel: prev ? `Previous (${monthName(prev)})` : "Previous",
      facts, next: await nextRelease(def, now), history, historyLabel: "CPI year over year, monthly", source: SOURCE.cpi, via: h.via, fetchedAt: now.toISOString(), message: null, needs: needsKey(),
    };
  } catch (e) { return fail("inflation", "CPI, all items, year over year", SOURCE.cpi, e); }
}

export async function gdpIndicator(now = new Date()): Promise<MacroIndicator> {
  const def = US_RELEASES.find((r) => r.id === "gdp")!;
  try {
    const start = addDays(isoDay(now.getTime()), -6 * 365);
    const g = await values("A191RL1Q225SBEA", start, 3600);
    const pts = g.obs.filter((o): o is MacroPoint => o.value !== null);
    const last = pts.at(-1);
    if (!last) throw new Error("no GDP observations");
    const prev = pts.at(-2) ?? null;
    const releasedOn = await firstPublished("A191RL1Q225SBEA", last.date, now, 3600).catch(() => null);
    const facts: { label: string; value: string }[] = [];
    if (macroKeyConfigured()) {
      try {
        const s = await scheduleFor(addDays(last.date, -1), isoDay(now.getTime()));
        const est = gdpEstimate(s.get("gdp") ?? [], last.date, isoDay(now.getTime()));
        if (est) facts.push({ label: "Estimate", value: `${est} (from BEA's release schedule)` });
      } catch { /* estimate stays unknown */ }
    }
    const f = (v: number) => fmtLine(v, { digits: 1, unit: "%", t: "level" })!;
    return {
      id: "gdp", ok: true, value: f(last.value), measure: "Real GDP, % change at an annual rate", period: quarterLabel(last.date),
      releasedOn, previous: prev ? f(prev.value) : null, previousLabel: prev ? `Previous (${quarterLabel(prev.date)})` : "Previous",
      facts, next: await nextRelease(def, now), history: pts.slice(-20), historyLabel: "Real GDP growth, quarterly, annualized", source: SOURCE.gdp, via: g.via,
      fetchedAt: now.toISOString(), message: null, needs: macroKeyConfigured() ? [] : ["FRED_API_KEY (free) for the release date and estimate type"],
    };
  } catch (e) { return fail("gdp", "Real GDP, % change at an annual rate", SOURCE.gdp, e); }
}

export interface YieldReading { id: "DFII10" | "DGS10"; label: string; value: number; date: string; prev: number | null; prevDate: string | null; url: string }

/** US 10-year nominal and real (TIPS) yields, daily, from the Federal Reserve's H.15 via FRED. */
export async function treasuryYields(now = new Date()): Promise<{ ok: boolean; items: YieldReading[]; message: string | null }> {
  const start = addDays(isoDay(now.getTime()), -30);
  const defs = [{ id: "DFII10" as const, label: "10-year real yield (TIPS)" }, { id: "DGS10" as const, label: "10-year Treasury yield" }];
  try {
    const items = await Promise.all(defs.map(async (d) => {
      const pts = (await values(d.id, start, 3600)).obs.filter((o): o is MacroPoint => o.value !== null);
      const last = pts.at(-1), prev = pts.at(-2);
      if (!last) throw new Error(`no ${d.id} observations`);
      return { ...d, value: last.value, date: last.date, prev: prev?.value ?? null, prevDate: prev?.date ?? null, url: `https://fred.stlouisfed.org/series/${d.id}` };
    }));
    return { ok: true, items, message: null };
  } catch (e) {
    reportError(e, { where: "macro.yields" });
    return { ok: false, items: [], message: "Treasury yields could not be loaded from FRED just now." };
  }
}

/** All three Macro Desk indicators plus yields, once per request. */
export const macroIndicators = cache(async () => {
  const now = new Date();
  const [rates, inflation, gdp, yields] = await Promise.all([ratesIndicator(now), inflationIndicator(now), gdpIndicator(now), treasuryYields(now)]);
  return { rates, inflation, gdp, yields, asOf: now.toISOString() };
});
export type MacroBundle = Awaited<ReturnType<typeof macroIndicators>>;

/** Verified macro facts for the gold read's evidence list (facts only, not scored). */
export function macroEvidence(m: MacroBundle) {
  const out: { label: string; detail: string; at: string | null; source: string }[] = [];
  if (m.rates.ok && m.rates.value) out.push({ label: "Fed funds target range", detail: `${m.rates.value}${m.rates.facts[0] ? ` · ${m.rates.facts[0].value}` : ""}`, at: m.rates.releasedOn, source: "Federal Reserve via FRED" });
  if (m.inflation.ok && m.inflation.value) out.push({ label: `US CPI y/y, ${m.inflation.period}`, detail: `${m.inflation.value}${m.inflation.previous ? ` · previous ${m.inflation.previous}` : ""}`, at: m.inflation.releasedOn, source: "BLS via FRED" });
  const real = m.yields.items.find((y) => y.id === "DFII10");
  if (real) {
    const ch = real.prev !== null ? real.value - real.prev : null;
    out.push({ label: "US 10-year real yield", detail: `${real.value.toFixed(2)}%${ch !== null ? ` (${ch >= 0 ? "+" : "−"}${Math.abs(ch * 100).toFixed(0)} bp on the day)` : ""}. Lower real yields usually support gold; higher ones weigh on it.`, at: real.date, source: "Federal Reserve H.15 via FRED" });
  }
  return out;
}

/* ── Economic calendar from the official US release schedule ── */

export interface OfficialEvent {
  id: string; title: string; country: "US"; currency: "USD"; at: string; importance: "high" | "medium" | "low";
  kind: ReleaseDef["kind"]; release: string; agency: ReleaseDef["agency"]; sourceUrl: string;
  status: "upcoming" | "released" | "awaiting";
  period: string | null; actual: string | null; forecast: null; previous: string | null; revisedFrom: string | null;
}

const periodLabel = (r: ReleaseDef, d: string | null) => (!d ? null : r.kind === "GDP" ? quarterLabel(d) : r.kind === "Jobless claims" ? `week ending ${new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}` : monthName(d));

/**
 * Every tracked US release scheduled between `from` and `to`, with actual and previous values computed from the
 * series' official vintages. Forecasts are not available from official sources and are always null.
 */
export async function officialCalendar(from: Date, to: Date, now = new Date()): Promise<OfficialEvent[]> {
  const c = client();
  const f = isoDay(from.getTime()), t = isoDay(to.getTime()), today = isoDay(now.getTime());
  const schedule = await scheduleFor(addDays(f, -1), addDays(t, 1));
  const slots = US_RELEASES.flatMap((r) => (schedule.get(r.id) ?? []).map((day) => ({ r, day, at: at(r, day) })))
    .filter((s) => s.at.getTime() >= from.getTime() && s.at.getTime() <= to.getTime());
  const revalidate = ttl(now, slots);
  const series = [...new Set(slots.flatMap((s) => (s.r.id === "fomc" ? [] : s.r.lines.map((l) => l.series))))];
  const obsStart = addDays(f, -800);
  const rows = new Map<string, VObs[]>();
  await Promise.all(series.map(async (id) => { rows.set(id, await c.vintages(id, obsStart, addDays(f, -3), revalidate)); }));
  const needFomc = slots.some((s) => s.r.id === "fomc");
  const [fu, fl] = needFomc ? await Promise.all([c.observations("DFEDTARU", addDays(f, -40), revalidate), c.observations("DFEDTARL", addDays(f, -40), revalidate)]) : [[], []];
  const gdpDates = slots.some((s) => s.r.id === "gdp") ? (await scheduleFor(addDays(f, -200), addDays(t, 1)).catch(() => schedule)).get("gdp") ?? [] : [];

  const out: OfficialEvent[] = [];
  for (const { r, day, at: when } of slots) {
    const base = { country: "US" as const, currency: "USD" as const, at: when.toISOString(), kind: r.kind, release: r.name, agency: r.agency, sourceUrl: r.url, forecast: null };
    const future = when.getTime() > now.getTime();
    if (r.id === "fomc") {
      const um = new Map(fu.map((o) => [o.date, o.value])), lm = new Map(fl.map((o) => [o.date, o.value]));
      const before = [...um.keys()].filter((d) => d <= day && um.get(d) !== null).sort().at(-1);
      const after = [...um.keys()].filter((d) => d > day && um.get(d) !== null).sort()[0];
      const prev = before ? fmtRange(lm.get(before) ?? null, um.get(before) ?? null) : null;
      const actual = !future && after ? fmtRange(lm.get(after) ?? null, um.get(after) ?? null) : null;
      const outcome = actual && before && after ? fomcOutcome(um.get(before) ?? null, um.get(after) ?? null) : null;
      out.push({ ...base, id: `fomc-${day}`, title: outcome ? `FOMC rate decision · ${outcome}` : "FOMC rate decision", importance: "high", status: future ? "upcoming" : actual ? "released" : "awaiting", period: null, actual, previous: prev, revisedFrom: null });
      continue;
    }
    for (const l of r.lines) {
      const v = lineAt(rows.get(l.series) ?? [], l, day, today);
      const released = !future && v.actual !== null;
      let title = l.title;
      if (r.id === "gdp" && released && v.period) { const est = gdpEstimate(gdpDates, v.period, day); if (est) title = `${l.title} · ${est.replace(" estimate", "").toLowerCase()}`; }
      out.push({ ...base, id: `${l.key}-${day}`, title, importance: l.importance, status: future ? "upcoming" : released ? "released" : "awaiting", period: periodLabel(r, v.period), actual: released ? v.actual : null, previous: v.previous, revisedFrom: released ? v.revisedFrom : null });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at) || (a.importance === b.importance ? 0 : a.importance === "high" ? -1 : 1));
}
