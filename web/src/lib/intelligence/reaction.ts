import type { Candle } from "@/lib/analytics/types";
import { priceToPips } from "@/lib/trading/pips";

/** Measured price change from the bar containing `at` to the close `minutes` later. Null if the bars don't cover it. */
export function measuredReaction(candles: Candle[], barSeconds: number, at: number, minutes = 60): { from: number; to: number; change: number; pips: number; startAt: string; endAt: string } | null {
  const t = Math.floor(at / 1000);
  const i = candles.findIndex((c) => c.t <= t && t < c.t + barSeconds);
  if (i < 0) return null;
  const j = i + Math.round((minutes * 60) / barSeconds) - 1;
  const end = candles[j];
  if (!end || end.t - candles[i]!.t > minutes * 60 * 2) return null; // a weekend or data gap in between
  const from = candles[i]!.o, to = end.c, change = to - from;
  return { from, to, change, pips: priceToPips("XAUUSD", Math.abs(change)) * Math.sign(change), startAt: new Date(candles[i]!.t * 1000).toISOString(), endAt: new Date((end.t + barSeconds) * 1000).toISOString() };
}
