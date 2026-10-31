"use server";

import { aiConfigured } from "../providers";
import { requireUser } from "../session";

export type AnalysisResult = { ok: true; text: string } | { ok: false; error: string };

const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX = 10 * 1024 * 1024;

/**
 * Validates an uploaded chart. The vision analysis itself is enabled in the AI phase, once an
 * Anthropic key is configured; until then this answers honestly instead of producing a guess.
 */
export async function analyseChart(form: FormData): Promise<AnalysisResult> {
  await requireUser();
  const f = form.get("chart");
  if (!(f instanceof File) || f.size === 0) return { ok: false, error: "Choose a chart screenshot first." };
  if (!TYPES.includes(f.type)) return { ok: false, error: "Use a PNG, JPG or WebP screenshot." };
  if (f.size > MAX) return { ok: false, error: "Screenshots must be 10 MB or smaller." };
  if (!aiConfigured()) return { ok: false, error: "AI chart analysis isn’t connected yet. Your screenshot was checked but not analysed or stored." };
  return { ok: false, error: "AI chart analysis is being enabled. Please try again shortly." };
}
