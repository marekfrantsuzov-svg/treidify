import type { BiasLabel as Bias, InstrumentIntel } from "./engine";

/**
 * "News Impact on Gold": a qualitative read with its evidence, not a probability.
 * There is no validated model that turns headlines into a percentage, so none is shown. The read combines only what
 * is measured: DXY market structure (the dollar usually moves against gold), gold's own structure, and the scheduled
 * high-impact events that could overturn both. Headlines are counted and linked, never scored for sentiment.
 */
export interface ImpactHeadline { title: string; source: string; publishedAt: string; importance: "high" | "medium" | "low"; instruments: string[] }
export interface ImpactEvent { title: string; country: string; at: string; importance: "high" | "medium" | "low" }

export interface GoldImpact {
  read: "bullish" | "bearish" | "mixed" | "insufficient";
  label: string;
  uncertainty: "low" | "medium" | "high";
  reasons: string[];
  /** Headlines that touch gold or the dollar, newest first, for the person to read. Not scored. */
  headlines: ImpactHeadline[];
  nextEvent: ImpactEvent | null;
  asOf: string;
}

const sign = (b: Bias) => (b === "bullish" ? 1 : b === "bearish" ? -1 : 0);

export function goldImpact(gold: InstrumentIntel, dxy: InstrumentIntel, headlines: ImpactHeadline[], events: ImpactEvent[], now: Date): GoldImpact {
  const reasons: string[] = [];
  const dayAgo = now.getTime() - 86_400_000, dayAhead = now.getTime() + 86_400_000;
  const relevant = headlines
    .filter((h) => (h.instruments.includes("XAUUSD") || h.instruments.includes("DXY")) && h.importance !== "low" && Date.parse(h.publishedAt) >= dayAgo)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const upcoming = events
    .filter((e) => e.importance === "high" && e.country === "US" && Date.parse(e.at) >= now.getTime())
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const nextEvent = upcoming[0] ?? null;
  const eventSoon = nextEvent !== null && Date.parse(nextEvent.at) <= dayAhead;

  if (gold.bias === "insufficient" && dxy.bias === "insufficient") {
    return { read: "insufficient", label: "Not enough data", uncertainty: "high", reasons: ["Neither gold nor DXY has enough verified bars for a reading."], headlines: relevant.slice(0, 3), nextEvent, asOf: gold.asOf };
  }

  // The dollar leg: inverse relationship, so a bearish DXY supports gold.
  const dollar = dxy.bias === "insufficient" ? 0 : -sign(dxy.bias);
  if (dxy.bias === "bearish") reasons.push("DXY structure is bearish. A weaker dollar usually supports gold.");
  else if (dxy.bias === "bullish") reasons.push("DXY structure is bullish. A firmer dollar usually weighs on gold.");
  else if (dxy.bias === "neutral") reasons.push("DXY structure is mixed, so the dollar is not pushing gold either way.");
  else reasons.push("DXY has too little verified data to read.");

  const own = gold.bias === "insufficient" ? 0 : sign(gold.bias);
  if (gold.bias === "bullish" || gold.bias === "bearish") reasons.push(`Gold’s own 4H and 1H structure is ${gold.bias}.`);
  else if (gold.bias === "neutral") reasons.push("Gold’s own structure is mixed across timeframes.");

  const net = dollar + own;
  const read: GoldImpact["read"] = net > 0 ? "bullish" : net < 0 ? "bearish" : "mixed";
  if (dollar !== 0 && own !== 0 && dollar !== own) reasons.push("The dollar and gold’s own structure disagree, so the read is weak.");

  if (eventSoon) reasons.push(`${nextEvent!.title} is due within 24 hours and can reverse this read.`);
  if (relevant.length) reasons.push(`${relevant.length} gold or dollar headline${relevant.length > 1 ? "s" : ""} in the last 24 hours. Read them before acting.`);

  const disagree = dollar !== 0 && own !== 0 && dollar !== own;
  const uncertainty: GoldImpact["uncertainty"] = eventSoon || dxy.bias === "insufficient" || read === "mixed" ? "high" : disagree || Math.abs(net) === 1 ? "medium" : "low";
  const label = read === "bullish" ? "Bullish for Gold" : read === "bearish" ? "Bearish for Gold" : "Mixed for Gold";
  return { read, label, uncertainty, reasons, headlines: relevant.slice(0, 3), nextEvent, asOf: gold.asOf };
}
