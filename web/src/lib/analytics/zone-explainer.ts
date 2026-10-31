import type { BiasResult } from "./bias";
import { zoneLabel, type PriceZone } from "./levels";
import type { Candle } from "./types";

/**
 * Deterministic, data-backed explanation of a computed zone: the eight questions a trader asks.
 * Every statement is derived from the candles and the zone. AI may rephrase this later, but it
 * may not add levels or facts that are not here.
 */
export interface ZoneExplanation {
  title: string;
  favours: "buyers" | "sellers" | "neither";
  why: string;
  method: string;
  history: string;
  confirmation: string;
  invalidation: string;
  liquidity: string;
  macro: string;
  disclaimer: string;
}

const f = (v: number, d: number) => v.toFixed(d);

export function explainZone(zone: PriceZone, candles: readonly Candle[], ctx: {
  symbol: string; timeframe: string; digits: number; atr: number | null; bias: BiasResult | null; others: PriceZone[];
}): ZoneExplanation {
  const { symbol, timeframe, digits: d, atr, bias, others } = ctx;
  const close = candles.at(-1)?.c ?? zone.upper;
  const distance = Math.abs((zone.lower + zone.upper) / 2 - close);
  const distAtr = atr ? distance / atr : null;
  const isSupport = zone.kind === "support" || zone.kind === "sellSideLiquidity";
  const reactions = zone.swingIndices.map((i) => candles[i]).filter(Boolean) as Candle[];
  const lastReaction = reactions.at(-1);
  const biasAligned = bias && ((bias.bias === "bullish" && zone.kind === "support") || (bias.bias === "bearish" && zone.kind === "resistance"));
  const range = `${f(zone.lower, d)}–${f(zone.upper, d)}`;

  if (zone.kind === "buySideLiquidity" || zone.kind === "sellSideLiquidity") {
    const side = zone.kind === "buySideLiquidity" ? "above" : "below";
    return {
      title: `${symbol}: ${zoneLabel[zone.kind]} ${range}`,
      favours: "neither",
      why: `${zone.touches} swing ${zone.kind === "buySideLiquidity" ? "highs" : "lows"} formed at nearly the same price ${side} the market and price has not traded through them since. Resting stop orders often sit beyond such equal ${zone.kind === "buySideLiquidity" ? "highs" : "lows"}.`,
      method: `Confirmed fractal swings (2 bars each side) clustered within 0.15 × ATR(14)${atr ? ` (${f(atr * 0.15, d)})` : ""}, at least 2 touches, still unswept.`,
      history: lastReaction ? `Last touch on the bar of ${new Date(lastReaction.t * 1000).toUTCString().slice(5, 22)} UTC. No bar has closed or wicked beyond it since.` : "Formed by earlier swings in the visible history.",
      confirmation: `A sweep beyond ${f(zone.kind === "buySideLiquidity" ? zone.upper : zone.lower, d)} followed by a quick rejection back inside the range is a common reversal tell; acceptance beyond it suggests continuation.`,
      invalidation: "The pool is spent once price trades through it. Treidify then removes it from the chart.",
      liquidity: `Distance from price: ${f(distance, d)}${distAtr !== null ? ` (${distAtr.toFixed(1)} × ATR)` : ""}.`,
      macro: "Scheduled high-impact releases often trigger liquidity sweeps. Check the event calendar before relying on this area.",
      disclaimer: "An analytical area, not a prediction or a trade instruction.",
    };
  }

  const opposite = others.filter((z) => z.kind === (isSupport ? "sellSideLiquidity" : "buySideLiquidity")).sort((a, b) => Math.abs(a.upper - zone.lower) - Math.abs(b.upper - zone.lower))[0];
  return {
    title: `${symbol}: potential ${isSupport ? "buy" : "sell"} area ${range}`,
    favours: isSupport ? "buyers" : "sellers",
    why: `Price reacted from this area ${zone.touches} times on the ${timeframe} chart${biasAligned ? `, and it sits in the direction of the current ${bias!.bias} ${timeframe} structure` : bias && bias.bias !== "insufficientData" ? `, but it runs against the current ${bias.bias} ${timeframe} structure, so treat it with extra caution` : ""}.`,
    method: `Confirmed swing ${isSupport ? "lows" : "highs"} and ${isSupport ? "highs" : "lows"} clustered within 0.5 × ATR(14)${atr ? ` (${f(atr * 0.5, d)})` : ""}; zone spans the cluster's lowest to highest swing; at least 2 touches.`,
    history: reactions.length ? `Reactions at ${reactions.map((c) => f(isSupport ? c.l : c.h, d)).join(", ")}. Most recent: ${new Date(zone.lastTouch * 1000).toUTCString().slice(5, 22)} UTC.` : "Formed by earlier swings in the visible history.",
    confirmation: isSupport
      ? `Wait for price to reach ${range}, then a bullish displacement (a strong close back above the zone) and a successful lower-timeframe retest that holds.`
      : `Wait for price to reach ${range}, then a bearish displacement (a strong close back below the zone) and a lower-timeframe retest that fails.`,
    invalidation: isSupport
      ? `A ${timeframe} close below ${f(zone.lower, d)}${atr ? ` (a buffer of about ${f(atr * 0.25, d)} is common)` : ""} invalidates the area.${bias?.invalidationLevel ? ` The ${timeframe} structure itself is invalidated by a close below ${f(bias.invalidationLevel, d)}.` : ""}`
      : `A ${timeframe} close above ${f(zone.upper, d)}${atr ? ` (a buffer of about ${f(atr * 0.25, d)} is common)` : ""} invalidates the area.${bias?.invalidationLevel ? ` The ${timeframe} structure itself is invalidated by a close above ${f(bias.invalidationLevel, d)}.` : ""}`,
    liquidity: opposite
      ? `Nearest ${zoneLabel[opposite.kind].toLowerCase()}: ${f(opposite.lower, d)}–${f(opposite.upper, d)}. Price may sweep it before reacting.`
      : `No unswept liquidity pool was detected ${isSupport ? "below" : "above"} this area in the visible history.`,
    macro: symbol.startsWith("XAU")
      ? "A stronger dollar or rising real yields would weaken a gold buy case; check DXY and the Macro Desk before acting."
      : "Fed communication and US data surprises move the dollar most; check the event calendar.",
    disclaimer: "An analytical area, not a prediction or a trade instruction.",
  };
}
