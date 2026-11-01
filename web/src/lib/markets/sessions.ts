import { marketStatus } from "@/lib/analytics/sessions";
import { INSTRUMENTS, type SessionId } from "./registry";

/**
 * Whether an instrument's market is trading at `date`. Used to tell "market closed" (an old bar is expected) from
 * "stale" (an old bar is a fault). Exchange holidays are not modelled: a holiday shows as stale, never as live.
 */
const CASH: Record<Exclude<SessionId, "fx" | "crypto">, { tz: string; open: number; close: number }> = {
  "us-cash": { tz: "America/New_York", open: 9 * 60 + 30, close: 16 * 60 },
  "de-cash": { tz: "Europe/Berlin", open: 9 * 60, close: 17 * 60 + 30 },
  "uk-cash": { tz: "Europe/London", open: 8 * 60, close: 16 * 60 + 30 },
  "jp-cash": { tz: "Asia/Tokyo", open: 9 * 60, close: 15 * 60 + 30 },
};

function local(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { weekday: get("weekday"), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function sessionOpen(session: SessionId, date: Date): boolean {
  if (session === "crypto") return true;
  if (session === "fx") return marketStatus(date) === "open";
  const c = CASH[session];
  const { weekday, minutes } = local(date, c.tz);
  if (weekday === "Sat" || weekday === "Sun") return false;
  // Tokyo has a lunch break 11:30–12:30.
  if (session === "jp-cash" && minutes >= 11 * 60 + 30 && minutes < 12 * 60 + 30) return false;
  return minutes >= c.open && minutes < c.close;
}

/** Unknown symbols fall back to the FX week, the conservative choice for OTC instruments. */
export const symbolOpen = (symbol: string, date: Date) => sessionOpen(INSTRUMENTS[symbol]?.session ?? "fx", date);

export const SESSION_LABEL: Record<SessionId, string> = {
  fx: "Sun 17:00 – Fri 17:00 New York, daily break 17:00–18:00",
  crypto: "24/7",
  "us-cash": "NYSE regular session 09:30–16:00 New York",
  "de-cash": "Xetra 09:00–17:30 Frankfurt",
  "uk-cash": "LSE 08:00–16:30 London",
  "jp-cash": "TSE 09:00–15:30 Tokyo, lunch 11:30–12:30",
};
