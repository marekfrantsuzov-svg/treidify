import { netOf } from "./breakdown";
import type { Bias } from "./bias";
import { performanceMetrics } from "./performance";
import { activeSessions, marketStatus, sessionAt, SESSIONS, type TradingSession } from "./sessions";
import type { ClosedTrade } from "./types";

export type Tone = "up" | "down" | "warn" | "neutral";
export interface OutlookLine { label: string; text: string; tone: Tone }

const sessionName = (s: TradingSession | "off") => SESSIONS.find((x) => x.id === s)?.name ?? "outside the main sessions";
const dayKey = (sec: number, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(sec * 1000));

/**
 * The deterministic daily outlook on the Overview. Market lines come from the clock and the structure engine;
 * account lines come only from the user's own closed trades. No predictions, no emotional labels.
 */
export function dailyOutlook(input: { now: Date; tz: string; trades: readonly ClosedTrade[]; currency?: string; gold?: Bias; dollar?: Bias; maxTradesPerDay?: number }): OutlookLine[] {
  const { now, tz, trades } = input;
  const lines: OutlookLine[] = [];

  const status = marketStatus(now);
  const open = activeSessions(now);
  lines.push(status === "weekendClosed"
    ? { label: "Market", text: "Gold and FX are closed for the weekend. A good time to review last week in the journal.", tone: "neutral" }
    : status === "dailyBreak"
      ? { label: "Market", text: "Daily gold and FX break. Spreads are often wider around the reopen.", tone: "warn" }
      : { label: "Market", text: open.length ? `${open.map(sessionName).join(" and ")} ${open.length > 1 ? "are" : "is"} open${open.includes("london") && open.includes("newYork") ? ", the most active overlap of the day" : ""}.` : "Between major sessions. Liquidity is usually thinner.", tone: open.length ? "up" : "neutral" });

  if (input.gold && input.dollar) {
    const word = (b: Bias) => (b === "insufficientData" ? "unclear" : b);
    const opposed = (input.gold === "bullish" && input.dollar === "bearish") || (input.gold === "bearish" && input.dollar === "bullish");
    lines.push({ label: "Structure", text: `4H structure: gold ${word(input.gold)}, dollar ${word(input.dollar)}.${opposed ? " They point in opposite directions, the usual relationship." : input.gold === input.dollar && input.gold !== "neutral" ? " Both lean the same way, which is less common, so treat gold setups with extra care." : ""}`, tone: "neutral" });
  }

  if (trades.length) {
    const sorted = [...trades].sort((a, b) => a.closeTime - b.closeTime);
    const today = dayKey(Math.floor(now.getTime() / 1000), tz);
    const todays = sorted.filter((t) => dayKey(t.closeTime, tz) === today);
    let streak = 0;
    for (let i = sorted.length - 1; i >= 0 && netOf(sorted[i]!) < 0; i--) streak++;
    if (streak >= 3) lines.push({ label: "Your account", text: `Your last ${streak} trades closed at a loss. Review them in the journal before the next entry.`, tone: "down" });
    else if (todays.length) {
      const net = todays.reduce((a, t) => a + netOf(t), 0);
      lines.push({ label: "Your account", text: `${todays.length} trade${todays.length > 1 ? "s" : ""} closed today, net ${net >= 0 ? "+" : "−"}${new Intl.NumberFormat("en-US", { style: "currency", currency: input.currency ?? "USD" }).format(Math.abs(net))}.`, tone: net >= 0 ? "up" : "down" });
    }
    if (input.maxTradesPerDay && todays.length >= input.maxTradesPerDay) lines.push({ label: "Your rules", text: `You have reached your limit of ${input.maxTradesPerDay} trades for today.`, tone: "warn" });

    // Strongest and weakest session from history, only with a meaningful sample.
    const groups = new Map<string, ClosedTrade[]>();
    for (const t of sorted) { const k = sessionAt(new Date(t.openTime * 1000)) ?? "off"; groups.set(k, [...(groups.get(k) ?? []), t]); }
    const ranked = [...groups.entries()].filter(([, ts]) => ts.length >= 15).map(([k, ts]) => ({ k: k as TradingSession | "off", e: performanceMetrics(ts).expectancy ?? 0, n: ts.length })).sort((a, b) => b.e - a.e);
    if (ranked.length >= 2) {
      const best = ranked[0]!, worst = ranked.at(-1)!;
      lines.push({ label: "Your edge", text: `Historically your best results come ${best.k === "off" ? "outside the main sessions" : `in ${sessionName(best.k)}`} (${best.n} trades)${worst.e < 0 ? `, and ${worst.k === "off" ? "off-session" : sessionName(worst.k)} trades have lost money on average` : ""}.`, tone: "neutral" });
    }
  } else {
    lines.push({ label: "Your account", text: "Connect an account to add personal lines based on your own trades.", tone: "neutral" });
  }
  return lines;
}
