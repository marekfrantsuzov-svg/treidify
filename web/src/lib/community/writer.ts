import type { InstrumentIntel, Zone } from "@/lib/intelligence";
import type { Analyst } from "./analysts";

/**
 * Writes a virtual analyst's post from computed intelligence only. Returns null when the persona has nothing
 * meaningful to say (no data, nothing in its specialty), so the feed never fills with filler.
 */
export interface WriterInput { gold: InstrumentIntel; dxy: InstrumentIntel; silver: InstrumentIntel; overall: { bias: string; score: number | null; detail: string }; events: { title: string; at: string; importance: string }[]; session: "asia" | "london" | "newYork" | null; vendor: string }

const p = (v: number, d: number) => v.toFixed(d);
const rng = (z: Zone, d: number) => `${p(z.lower, d)}–${p(z.upper, d)}`;
const signed = (n: number | null) => (n === null ? "n/a" : `${n > 0 ? "+" : ""}${n}`);
const OPEN: Record<Analyst["voice"], string[]> = {
  measured: ["Quick read.", "Here is where things stand.", "Update."],
  direct: ["Straight to it.", "Levels first.", "What matters now."],
  teacher: ["Let’s walk through it.", "A short lesson from the current chart.", "Here’s how I’d read this."],
  quant: ["By the numbers.", "Model readout.", "Data check."],
  cautious: ["Careful here.", "Risk first.", "Slow down for a second."],
};
const UNCERTAIN = "This is analysis from computed market structure, not a signal or advice. Conditions can change on the next candle.";

function zoneLine(i: InstrumentIntel, side: "buy" | "sell") {
  const z = i.zones.find((x) => x.side === side);
  if (!z) return null;
  return `${side === "buy" ? "Potential BUY" : "Potential SELL"} zone ${rng(z, i.digits)} (1H): ${z.reasons[0]}. Confirmation: ${z.confirmation.split(", then ")[1] ?? z.confirmation} Invalidation: ${z.invalidation.text}`;
}
const eventLine = (w: WriterInput) => {
  const e = w.events.find((x) => x.importance === "high");
  return e ? `Event risk: ${e.title} at ${e.at.slice(11, 16)} UTC can move all of this.` : null;
};

export function writePost(a: Analyst, w: WriterInput, hourSeed: number): { body: string; instruments: string[] } | null {
  const g = w.gold, x = w.dxy;
  const open = OPEN[a.voice][hourSeed % OPEN[a.voice].length]!;
  const lines: (string | null)[] = [];
  let instruments = ["XAUUSD"];
  const biasLine = (i: InstrumentIntel, name: string) => `${name} reads ${i.bias.toUpperCase()} (score ${signed(i.score)}, ${i.confidence ?? "no"} confidence).`;
  if (g.bias === "insufficient" && a.specialty !== "dxy") return null;

  switch (a.specialty) {
    case "gold-structure": {
      const ev = g.structure.find((s) => s.tf === "4H")?.events.at(-1);
      if (!ev) return null;
      lines.push(biasLine(g, "Gold"), `Last 4H event: ${ev.direction} ${ev.kind} through ${p(ev.level, g.digits)}.`, g.invalidation, zoneLine(g, g.bias === "bearish" ? "sell" : "buy"));
      break;
    }
    case "dxy": {
      if (x.bias === "insufficient") return null;
      instruments = ["DXY", "XAUUSD"];
      const ev = x.structure.find((s) => s.tf === "1H")?.events.at(-1);
      lines.push(biasLine(x, "DXY"), ev ? `1H printed a ${ev.direction} ${ev.kind} at ${p(ev.level, x.digits)}.` : "No fresh 1H structure break.", x.invalidation,
        `For Gold this ${x.bias === "bearish" ? "may be supportive" : x.bias === "bullish" ? "may be a headwind" : "is not adding a clear push either way"}.`);
      break;
    }
    case "fibonacci": {
      const f = g.fib;
      if (!f) return null;
      const lv = f.levels.filter((l) => [0.382, 0.5, 0.618, 0.786].includes(l.ratio)).map((l) => `${(l.ratio * 100).toFixed(1)}% ${p(l.price, g.digits)}`).join(", ");
      lines.push(`1H ${f.direction === "up" ? "up" : "down"}-leg anchored ${p(f.from.price, g.digits)} → ${p(f.to.price, g.digits)} (from the swing before the latest structure break).`, `Retracements: ${lv}.`,
        `The 61.8–78.6% band is where I watch for a reaction, only with 5M structure confirming. A close beyond ${p(f.from.price, g.digits)} voids the leg.`);
      break;
    }
    case "liquidity": {
      const sw = g.sweeps.at(-1); const pools = g.liquidity.slice(0, 2);
      if (!sw && !pools.length) return null;
      if (sw) lines.push(`15M swept ${sw.side === "sell" ? "sell-side liquidity below" : "buy-side liquidity above"} ${p(sw.level, g.digits)} and closed back inside: ${sw.direction} reaction context.`);
      for (const pl of pools) lines.push(`Untaken ${pl.side === "buy" ? "equal highs" : "equal lows"} (${pl.swings} touches) around ${p(pl.price, g.digits)}: resting orders likely sit ${pl.side === "buy" ? "above" : "below"}.`);
      lines.push("A sweep alone isn’t an entry. I want structure to shift after it.");
      break;
    }
    case "london": case "new-york": case "asia": {
      const want = a.specialty === "london" ? "london" : a.specialty === "new-york" ? "newYork" : "asia";
      if (w.session !== want) return null;
      const label = want === "newYork" ? "New York" : want === "london" ? "London" : "Asia";
      lines.push(`${label} session is open.`, biasLine(g, "Gold"), zoneLine(g, "buy"), zoneLine(g, "sell"), eventLine(w));
      break;
    }
    case "macro": {
      const ev = w.events.slice(0, 3);
      if (!ev.length) return null;
      instruments = ["XAUUSD", "DXY"];
      lines.push(`On the calendar: ${ev.map((e) => `${e.title} (${e.at.slice(11, 16)} UTC, ${e.importance})`).join("; ")}.`, `Into it: Gold ${g.bias}, DXY ${x.bias}.`,
        "Around high-impact releases, spreads widen and levels get overrun. I treat structure as provisional until the data is out.");
      break;
    }
    case "risk": {
      const z = g.zones[0];
      if (!z) return null;
      lines.push(`If you are working the ${z.side.toUpperCase()} zone ${rng(z, g.digits)}, the invalidation is defined: ${z.invalidation.text}`, `4H volatility: ${g.volatility ?? "not available"}.`, "Size the position so that invalidation costs a fixed, small share of the account. No setup is worth breaking that rule.", eventLine(w));
      break;
    }
    case "silver": {
      const s = w.silver;
      if (s.bias === "insufficient") return null;
      instruments = ["XAGUSD", "XAUUSD"];
      lines.push(biasLine(s, "Silver"), `Gold for comparison: ${g.bias} (${signed(g.score)}).`, s.bias !== g.bias ? "The metals disagree, which usually means less conviction on both." : "Both metals point the same way.", zoneLine(s, s.bias === "bearish" ? "sell" : "buy"));
      break;
    }
    case "alignment": {
      const t = g.trends;
      lines.push(`Gold structure by timeframe: 4H ${t["4H"] ?? "n/a"}, 1H ${t["1H"] ?? "n/a"}, 15M ${t["15M"] ?? "n/a"}, 5M ${t["5M"] ?? "n/a"}.`,
        t["4H"] && t["4H"] === t["1H"] && t["1H"] === t["15M"] ? "4H, 1H and 15M agree: pullbacks into zones are the cleaner idea." : "The timeframes are not aligned: expect chop and wait for lower timeframes to rejoin the 4H.");
      break;
    }
    case "volatility": {
      if (!g.volatility) return null;
      lines.push(`Gold 4H volatility is ${g.volatility}.`, "Elevated volatility means wider invalidations and smaller size; quiet regimes often end with a range expansion.");
      break;
    }
    case "zones": {
      const b = zoneLine(g, "buy"), s = zoneLine(g, "sell");
      if (!b && !s) return null;
      lines.push(b, s, `Last price ${g.lastPrice !== null ? p(g.lastPrice, g.digits) : "n/a"}.`);
      break;
    }
    case "momentum": {
      const m = g.components.find((c) => c.id === "momentum"), t = g.components.find((c) => c.id === "trend");
      if (!m?.value && !t?.value) return null;
      lines.push(m?.detail ?? null, t?.detail ?? null, "Momentum describes the push behind price, not where it will turn.");
      break;
    }
    case "correlation": {
      const c = g.components.find((k) => k.id === "dxy");
      if (!c || c.value === null) return null;
      instruments = ["XAUUSD", "DXY"];
      lines.push(c.detail, "Correlation describes how they have moved together recently; it is not a cause and it breaks down around news.");
      break;
    }
    case "confirmation": {
      const z = g.zones.find((k) => k.status !== "watching");
      if (!z) return null;
      lines.push(z.status === "confirmed" ? `5M has printed ${z.side === "buy" ? "bullish" : "bearish"} structure inside the ${z.side.toUpperCase()} zone ${rng(z, g.digits)}.` : `Price is inside the ${z.side.toUpperCase()} zone ${rng(z, g.digits)} but 5M has not confirmed yet.`,
        z.status === "confirmed" ? `The idea stays valid only while ${z.invalidation.text.toLowerCase()}` : "Until it does, this is a level, not a setup.");
      break;
    }
  }
  const body = [open, ...lines.filter((l): l is string => !!l), UNCERTAIN].join(" ");
  return { body, instruments };
}
