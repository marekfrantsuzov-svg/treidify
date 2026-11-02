/**
 * Wall-clock time in an IANA time zone to a UTC instant, with daylight-saving handled by Intl (no fixed offsets).
 * Used for official release times, which agencies publish in US Eastern time (08:30 ET for CPI, NFP, GDP...).
 */
function offsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - utcMs) / 60_000);
}

/** `date` is YYYY-MM-DD, `time` is HH:MM in `timeZone`. Returns the UTC instant. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes settle the offset on either side of a DST change.
  let t = guess - offsetMinutes(guess, timeZone) * 60_000;
  t = guess - offsetMinutes(t, timeZone) * 60_000;
  return new Date(t);
}

/** YYYY-MM-DD of an instant in a time zone. */
export function dayIn(at: Date | number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

export const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => isoDay(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000);
