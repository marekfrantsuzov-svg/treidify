import type { Candle } from "./types";

/** SMA-seeded EMA with k = 2 / (period + 1). Indices before the seed are null. */
export function ema(values: readonly number[], period: number): (number | null)[] {
  if (period <= 0) throw new RangeError("period must be positive");
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let current = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = current;
  for (let i = period; i < values.length; i++) {
    current = values[i]! * k + current * (1 - k);
    out[i] = current;
  }
  return out;
}

export function trueRanges(candles: readonly Candle[]): number[] {
  return candles.map((c, i) => {
    if (i === 0) return c.h - c.l;
    const prev = candles[i - 1]!.c;
    return Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev));
  });
}

/** Wilder ATR seeded with the simple average of the first `period` true ranges. */
export function atr(candles: readonly Candle[], period = 14): (number | null)[] {
  if (period <= 0) throw new RangeError("period must be positive");
  const tr = trueRanges(candles);
  const out: (number | null)[] = new Array(tr.length).fill(null);
  if (tr.length < period) return out;
  let current = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = current;
  for (let i = period; i < tr.length; i++) {
    current = (current * (period - 1) + tr[i]!) / period;
    out[i] = current;
  }
  return out;
}
