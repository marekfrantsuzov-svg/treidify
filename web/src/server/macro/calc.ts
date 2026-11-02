/**
 * Official US release definitions and the arithmetic that turns FRED series into calendar values.
 * Pure functions (no I/O) so they can be tested against fixed vintages.
 *
 * Sources: release ids and series ids are FRED's (https://fred.stlouisfed.org/releases). Release times are the
 * agencies' published times in US Eastern time; they are converted with DST rules, never with a fixed offset.
 */
import type { VObs } from "./fred";
import { vintageAt } from "./fred";

export type Transform = "level" | "change" | "pct_mom" | "pct_yoy";
export interface LineDef { key: string; title: string; series: string; t: Transform; digits: number; unit: "%" | "K" | "M"; scale?: number; importance: "high" | "medium" | "low" }
export interface ReleaseDef {
  id: string; releaseId: number; name: string; agency: "BLS" | "BEA" | "Federal Reserve" | "Census Bureau" | "Department of Labor";
  kind: "CPI" | "PPI" | "NFP" | "FOMC" | "GDP" | "PCE" | "Retail sales" | "Jobless claims" | "JOLTS";
  timeEt: string; url: string; lines: LineDef[];
}

export const US_RELEASES: ReleaseDef[] = [
  { id: "fomc", releaseId: 101, name: "FOMC rate decision", agency: "Federal Reserve", kind: "FOMC", timeEt: "14:00", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    lines: [{ key: "fomc", title: "FOMC rate decision", series: "DFEDTARU", t: "level", digits: 2, unit: "%", importance: "high" }] },
  { id: "cpi", releaseId: 10, name: "Consumer Price Index", agency: "BLS", kind: "CPI", timeEt: "08:30", url: "https://www.bls.gov/cpi/",
    lines: [
      { key: "cpi-yoy", title: "CPI y/y", series: "CPIAUCNS", t: "pct_yoy", digits: 1, unit: "%", importance: "high" },
      { key: "cpi-mom", title: "CPI m/m", series: "CPIAUCSL", t: "pct_mom", digits: 1, unit: "%", importance: "high" },
      { key: "core-cpi-yoy", title: "Core CPI y/y", series: "CPILFENS", t: "pct_yoy", digits: 1, unit: "%", importance: "high" },
      { key: "core-cpi-mom", title: "Core CPI m/m", series: "CPILFESL", t: "pct_mom", digits: 1, unit: "%", importance: "high" },
    ] },
  { id: "nfp", releaseId: 50, name: "Employment Situation", agency: "BLS", kind: "NFP", timeEt: "08:30", url: "https://www.bls.gov/ces/",
    lines: [
      { key: "nfp", title: "Non-farm payrolls", series: "PAYEMS", t: "change", digits: 0, unit: "K", importance: "high" },
      { key: "unrate", title: "Unemployment rate", series: "UNRATE", t: "level", digits: 1, unit: "%", importance: "high" },
      { key: "ahe", title: "Average hourly earnings m/m", series: "CES0500000003", t: "pct_mom", digits: 1, unit: "%", importance: "medium" },
    ] },
  { id: "gdp", releaseId: 53, name: "Gross Domestic Product", agency: "BEA", kind: "GDP", timeEt: "08:30", url: "https://www.bea.gov/data/gdp/gross-domestic-product",
    lines: [{ key: "gdp", title: "GDP q/q annualized", series: "A191RL1Q225SBEA", t: "level", digits: 1, unit: "%", importance: "high" }] },
  { id: "pce", releaseId: 54, name: "Personal Income and Outlays", agency: "BEA", kind: "PCE", timeEt: "08:30", url: "https://www.bea.gov/data/personal-consumption-expenditures-price-index",
    lines: [
      { key: "pce-yoy", title: "PCE price index y/y", series: "PCEPI", t: "pct_yoy", digits: 1, unit: "%", importance: "high" },
      { key: "core-pce-yoy", title: "Core PCE price index y/y", series: "PCEPILFE", t: "pct_yoy", digits: 1, unit: "%", importance: "high" },
      { key: "core-pce-mom", title: "Core PCE price index m/m", series: "PCEPILFE", t: "pct_mom", digits: 1, unit: "%", importance: "medium" },
    ] },
  { id: "ppi", releaseId: 46, name: "Producer Price Index", agency: "BLS", kind: "PPI", timeEt: "08:30", url: "https://www.bls.gov/ppi/",
    lines: [{ key: "ppi-mom", title: "PPI final demand m/m", series: "PPIFIS", t: "pct_mom", digits: 1, unit: "%", importance: "high" }] },
  { id: "retail", releaseId: 9, name: "Retail Sales", agency: "Census Bureau", kind: "Retail sales", timeEt: "08:30", url: "https://www.census.gov/retail/",
    lines: [{ key: "retail", title: "Retail sales m/m", series: "RSAFS", t: "pct_mom", digits: 1, unit: "%", importance: "medium" }] },
  { id: "claims", releaseId: 180, name: "Unemployment Insurance Weekly Claims", agency: "Department of Labor", kind: "Jobless claims", timeEt: "08:30", url: "https://www.dol.gov/ui/data.pdf",
    lines: [{ key: "claims", title: "Initial jobless claims", series: "ICSA", t: "level", digits: 0, unit: "K", scale: 1 / 1000, importance: "medium" }] },
  { id: "jolts", releaseId: 192, name: "Job Openings and Labor Turnover Survey", agency: "BLS", kind: "JOLTS", timeEt: "10:00", url: "https://www.bls.gov/jlt/",
    lines: [{ key: "jolts", title: "JOLTS job openings", series: "JTSJOL", t: "level", digits: 2, unit: "M", scale: 1 / 1000, importance: "medium" }] },
];

/** Shift a YYYY-MM-DD observation date back by whole years (for y/y). */
const yearsBack = (date: string, n: number) => `${Number(date.slice(0, 4)) - n}${date.slice(4)}`;

/** Value of one transform at `date` in a date→value map, or null when an input is missing. */
export function compute(m: Map<string, number | null>, date: string, t: Transform): number | null {
  const v = m.get(date);
  if (v === null || v === undefined) return null;
  if (t === "level") return v;
  if (t === "pct_yoy") { const p = m.get(yearsBack(date, 1)); return p ? (v / p - 1) * 100 : null; }
  const dates = [...m.keys()].sort();
  const i = dates.indexOf(date);
  const p = i > 0 ? m.get(dates[i - 1]!) : null;
  if (p === null || p === undefined) return null;
  return t === "change" ? v - p : p ? (v / p - 1) * 100 : null;
}

export function fmtLine(v: number | null, l: Pick<LineDef, "digits" | "unit" | "scale" | "t">): string | null {
  if (v === null || !Number.isFinite(v)) return null;
  const x = v * (l.scale ?? 1);
  const s = x.toFixed(l.digits);
  const signed = l.t === "change" && x > 0 ? `+${s}` : s;
  return `${signed === "-0" || signed === "-0.0" ? s.replace("-", "") : signed}${l.unit}`;
}

/** The latest date with a value in a vintage map. */
export const latestDate = (m: Map<string, number | null>) => [...m.entries()].filter(([, v]) => v !== null).map(([d]) => d).sort().at(-1) ?? null;
const prevDate = (m: Map<string, number | null>, d: string) => [...m.keys()].filter((x) => x < d).sort().at(-1) ?? null;

export interface LineValues { period: string | null; actual: string | null; previous: string | null; revisedFrom: string | null }

/**
 * What a release on `day` reported for one line, from the series' vintages:
 * - released: the vintage on `day` holds a period the day before did not → actual, previous (as revised that day) and
 *   the previous value as first printed when it differs (a revision).
 * - not released yet (future, or today before the data is in): previous = the latest published value.
 */
export function lineAt(rows: VObs[], l: LineDef, day: string, today: string): LineValues {
  const dayBefore = new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  if (day <= today) {
    const after = vintageAt(rows, day), before = vintageAt(rows, dayBefore);
    const a = latestDate(after), b = latestDate(before);
    if (a && (!b || a > b)) {
      const p = prevDate(after, a);
      const actual = fmtLine(compute(after, a, l.t), l);
      const previous = p ? fmtLine(compute(after, p, l.t), l) : null;
      const firstPrev = p ? fmtLine(compute(before, p, l.t), l) : null;
      return { period: a, actual, previous, revisedFrom: firstPrev && previous && firstPrev !== previous ? firstPrev : null };
    }
  }
  const cur = vintageAt(rows, today);
  const last = latestDate(cur);
  return { period: null, actual: null, previous: last ? fmtLine(compute(cur, last, l.t), l) : null, revisedFrom: null };
}

/** Quarter end (YYYY-MM-DD) of a quarterly observation date such as 2026-07-01 → 2026-09-30. */
export function quarterEnd(obsDate: string): string {
  const y = Number(obsDate.slice(0, 4)), m = Number(obsDate.slice(5, 7));
  const end = new Date(Date.UTC(y, m - 1 + 3, 0));
  return end.toISOString().slice(0, 10);
}
export const quarterLabel = (obsDate: string) => `Q${Math.floor((Number(obsDate.slice(5, 7)) - 1) / 3) + 1} ${obsDate.slice(0, 4)}`;

/**
 * Which BEA estimate a GDP release is: the n-th GDP release after the quarter ends (1 advance, 2 second, 3 third).
 * Derived from the official release schedule, so it is labelled as derived in the UI.
 */
export function gdpEstimate(gdpReleaseDates: string[], obsDate: string, releasedOn: string): "Advance estimate" | "Second estimate" | "Third estimate" | "Later revision" | null {
  const qe = quarterEnd(obsDate);
  const n = gdpReleaseDates.filter((d) => d > qe && d <= releasedOn).length;
  return n === 1 ? "Advance estimate" : n === 2 ? "Second estimate" : n === 3 ? "Third estimate" : n > 3 ? "Later revision" : null;
}

/** Outcome of an FOMC decision from the target range before and after it. */
export function fomcOutcome(beforeUpper: number | null, afterUpper: number | null): string | null {
  if (beforeUpper === null || afterUpper === null) return null;
  const bp = Math.round((afterUpper - beforeUpper) * 100);
  return bp === 0 ? "Held" : bp < 0 ? `Cut ${-bp} bp` : `Raised ${bp} bp`;
}

export const fmtRange = (lower: number | null, upper: number | null) => (lower === null || upper === null ? null : `${lower.toFixed(2)}–${upper.toFixed(2)}%`);

const shiftMonth = (day: string, n: number) => { const d = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1 + n, 1)); return d.toISOString().slice(0, 10); };

/**
 * The period a release on `day` reports, by the agencies' standard schedules: the previous month for CPI, PPI,
 * payrolls, retail sales and PCE; two months back for JOLTS; the week ending the Saturday before for jobless claims;
 * the last completed quarter for GDP. Used only without FRED vintages.
 */
export function expectedPeriod(kind: ReleaseDef["kind"], day: string): string | null {
  switch (kind) {
    case "CPI": case "PPI": case "NFP": case "Retail sales": case "PCE": return shiftMonth(day, -1);
    case "JOLTS": return shiftMonth(day, -2);
    case "Jobless claims": {
      const d = new Date(Date.parse(`${day}T00:00:00Z`) - 4 * 86_400_000);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7)); // back to Saturday
      return d.toISOString().slice(0, 10);
    }
    case "GDP": { const m = Number(day.slice(5, 7)) - 1; const qStart = m - (m % 3); return shiftMonth(`${day.slice(0, 4)}-${String(qStart + 1).padStart(2, "0")}-01`, -3); }
    default: return null;
  }
}

/**
 * Release values from current (latest-vintage) data, when first-print vintages are not available: the actual is the
 * period's current value (it may include later revisions, and that is said in the UI), previous is the period before.
 */
export function lineFromCurrent(m: Map<string, number | null>, l: LineDef, kind: ReleaseDef["kind"], day: string, released: boolean): LineValues {
  const period = expectedPeriod(kind, day);
  if (!period) return { period: null, actual: null, previous: null, revisedFrom: null };
  const p = prevDate(m, period);
  const previous = p ? fmtLine(compute(m, p, l.t), l) : null;
  const actual = released && m.get(period) !== undefined ? fmtLine(compute(m, period, l.t), l) : null;
  return { period, actual, previous, revisedFrom: null };
}
