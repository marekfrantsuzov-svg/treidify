import type { BiasLabel } from "@/lib/intelligence";

/** Plain constants shared by server and client components (kept out of "use client" modules on purpose). */
export const biasText: Record<BiasLabel, string> = { bullish: "Bullish", bearish: "Bearish", neutral: "Neutral", insufficient: "Insufficient data" };
export const biasTone: Record<BiasLabel, string> = { bullish: "text-up", bearish: "text-down", neutral: "text-ink-2", insufficient: "text-ink-3" };
