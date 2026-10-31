import { atr as atrSeries } from "./indicators";
import { detectSwings } from "./swings";
import type { Candle, SwingPoint } from "./types";

export type ZoneKind = "support" | "resistance" | "buySideLiquidity" | "sellSideLiquidity";

export const zoneLabel: Record<ZoneKind, string> = {
  support: "Support",
  resistance: "Resistance",
  buySideLiquidity: "Buy-side liquidity",
  sellSideLiquidity: "Sell-side liquidity",
};

export interface PriceZone {
  id: string;
  kind: ZoneKind;
  lower: number;
  upper: number;
  /** Number of swing points that formed the zone (its sample size). */
  touches: number;
  lastTouch: number;
  /** Indices of the swings that formed the zone, for "what happened previously". */
  swingIndices: number[];
}

export interface LevelAnalysis {
  zones: PriceZone[];
  atr: number | null;
  referencePrice: number | null;
  unavailableReason: string | null;
}

export const LEVEL_DEFAULTS = {
  swingStrength: 2,
  atrPeriod: 14,
  clusterToleranceATR: 0.5,
  liquidityToleranceATR: 0.15,
  minTouches: 2,
  maxZonesPerSide: 3,
  minimumCandles: 50,
};

export function cluster(swings: readonly SwingPoint[], tolerance: number): SwingPoint[][] {
  const sorted = [...swings].sort((a, b) => a.price - b.price);
  const clusters: SwingPoint[][] = [];
  for (const s of sorted) {
    const current = clusters.at(-1);
    if (current && s.price - current[0]!.price <= tolerance) current.push(s);
    else clusters.push([s]);
  }
  return clusters;
}

const mid = (z: { lower: number; upper: number }) => (z.lower + z.upper) / 2;

function nearest(zones: PriceZone[], price: number, limit: number) {
  return [...zones].sort((a, b) => Math.abs(mid(a) - price) - Math.abs(mid(b) - price)).slice(0, limit);
}

function toZone(kind: ZoneKind, c: SwingPoint[]): PriceZone {
  const prices = c.map((s) => s.price);
  const lower = Math.min(...prices), upper = Math.max(...prices);
  return {
    id: `${kind}-${lower}-${upper}`,
    kind,
    lower,
    upper,
    touches: c.length,
    lastTouch: Math.max(...c.map((s) => s.t)),
    swingIndices: c.map((s) => s.index).sort((a, b) => a - b),
  };
}

/** Conditional S/R and liquidity zones from swing clustering. Mirrors TreidifyCore LevelDetector.swift. */
export function analyzeLevels(candles: readonly Candle[], cfg = LEVEL_DEFAULTS): LevelAnalysis {
  const close = candles.at(-1)?.c ?? null;
  if (candles.length < cfg.minimumCandles || close === null) {
    return { zones: [], atr: null, referencePrice: close, unavailableReason: `At least ${cfg.minimumCandles} candles are required for level analysis.` };
  }
  const a = atrSeries(candles, cfg.atrPeriod).at(-1);
  if (a == null || a <= 0) return { zones: [], atr: null, referencePrice: close, unavailableReason: "ATR could not be computed." };
  const swings = detectSwings(candles, cfg.swingStrength);

  const sr = cluster(swings, cfg.clusterToleranceATR * a)
    .filter((c) => c.length >= cfg.minTouches)
    .map((c) => {
      const z = toZone("support", c);
      return mid(z) <= close ? z : { ...toZone("resistance", c) };
    });
  const zones: PriceZone[] = [
    ...nearest(sr.filter((z) => z.kind === "support"), close, cfg.maxZonesPerSide),
    ...nearest(sr.filter((z) => z.kind === "resistance"), close, cfg.maxZonesPerSide),
  ];

  const tol = cfg.liquidityToleranceATR * a;
  const buySide = cluster(swings.filter((s) => s.kind === "high"), tol)
    .filter((c) => c.length >= cfg.minTouches)
    .flatMap((c) => {
      const z = toZone("buySideLiquidity", c);
      const last = Math.max(...c.map((s) => s.index));
      if (z.upper <= close) return [];
      return candles.slice(last + 1).some((b) => b.h > z.upper) ? [] : [z];
    });
  const sellSide = cluster(swings.filter((s) => s.kind === "low"), tol)
    .filter((c) => c.length >= cfg.minTouches)
    .flatMap((c) => {
      const z = toZone("sellSideLiquidity", c);
      const last = Math.max(...c.map((s) => s.index));
      if (z.lower >= close) return [];
      return candles.slice(last + 1).some((b) => b.l < z.lower) ? [] : [z];
    });
  zones.push(...nearest(buySide, close, cfg.maxZonesPerSide), ...nearest(sellSide, close, cfg.maxZonesPerSide));

  return {
    zones,
    atr: a,
    referencePrice: close,
    unavailableReason: zones.length === 0 ? "No price level was touched by enough swings to qualify." : null,
  };
}
