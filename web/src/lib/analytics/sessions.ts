export type TradingSession = "sydney" | "tokyo" | "london" | "newYork";

export const SESSIONS: { id: TradingSession; name: string; tz: string; open: number; close: number }[] = [
  { id: "sydney", name: "Sydney", tz: "Australia/Sydney", open: 7, close: 16 },
  { id: "tokyo", name: "Tokyo", tz: "Asia/Tokyo", open: 9, close: 18 },
  { id: "london", name: "London", tz: "Europe/London", open: 8, close: 17 },
  { id: "newYork", name: "New York", tz: "America/New_York", open: 8, close: 17 },
];

function local(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")!.value;
  const hour = Number(parts.find((p) => p.type === "hour")!.value);
  return { weekday, hour };
}

/** Conventional local-hours model, mirroring SessionClock.swift. DST is handled by the time zone. */
export function activeSessions(date: Date): TradingSession[] {
  return SESSIONS.filter((s) => {
    const { weekday, hour } = local(date, s.tz);
    return !["Sat", "Sun"].includes(weekday) && hour >= s.open && hour < s.close;
  }).map((s) => s.id);
}

/** Spot gold/FX week: Sunday 18:00 to Friday 17:00 New York time, with a daily 17:00–18:00 break. */
export function marketStatus(date: Date): "open" | "dailyBreak" | "weekendClosed" {
  const { weekday, hour } = local(date, "America/New_York");
  if (weekday === "Sat") return "weekendClosed";
  if (weekday === "Sun") return hour >= 18 ? "open" : "weekendClosed";
  if (weekday === "Fri" && hour >= 17) return "weekendClosed";
  if (hour === 17) return "dailyBreak";
  return "open";
}

/** Session in which a trade was opened; overlaps go to the later-opening session. */
export function sessionAt(date: Date): TradingSession | null {
  const active = activeSessions(date);
  const order: TradingSession[] = ["sydney", "tokyo", "london", "newYork"];
  return active.sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] ?? null;
}
