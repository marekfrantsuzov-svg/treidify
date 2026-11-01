import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import type { InstrumentIntel } from "@/lib/intelligence";
import { reportError } from "@/lib/monitoring";
import { aiStatus, explainFacts } from "./claude";

/** The facts block handed to the AI: computed values only. */
export function factsFor(i: InstrumentIntel, extra: string[] = []) {
  const d = i.digits;
  return [
    `Instrument: ${i.symbol}. Bias: ${i.bias}. Score: ${i.score ?? "none"} (bullish ≥ +25, bearish ≤ −25). Confidence: ${i.confidence ?? "none"}.`,
    `Structure by timeframe: ${Object.entries(i.trends).map(([k, v]) => `${k} ${v ?? "n/a"}`).join(", ")}.`,
    ...i.components.map((c) => `${c.label}: ${c.detail}`),
    ...i.zones.map((z) => `Potential ${z.side} zone ${z.lower.toFixed(d)}–${z.upper.toFixed(d)} (1H): ${z.reasons.join(" ")} Confirmation: ${z.confirmation} Invalidation: ${z.invalidation.text}`),
    i.invalidation ?? "",
    ...i.limitations,
    ...extra,
  ].filter(Boolean).join("\n");
}

const cached = unstable_cache(async (_key: string, facts: string) => explainFacts(facts), ["ai-desk-note-v1"], { revalidate: 1800 });

/** AI desk note for live data only, cached per unique facts for 30 minutes. Null when AI is off or fails. */
export async function deskNote(i: InstrumentIntel, live: boolean, extra: string[] = []): Promise<string | null> {
  if (!live || !aiStatus().configured || i.bias === "insufficient") return null;
  const facts = factsFor(i, extra);
  try { return await cached(createHash("sha256").update(facts).digest("hex"), facts); }
  catch (e) { reportError(e, { where: "ai.deskNote" }); return null; }
}
