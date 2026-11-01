"use server";

import { aiStatus, readChart } from "../ai/claude";
import type { ChartReading } from "../ai/schema";
import { requireUser } from "../session";
import { reportError } from "@/lib/monitoring";
import { rateLimit } from "@/lib/rate-limit";

export type AnalysisResult = { ok: true; reading: ChartReading; analysedAt: string } | { ok: false; error: string };

const TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX = 10 * 1024 * 1024;

/** Reads a chart screenshot with Claude. The image is analysed in memory and not stored. */
export async function analyseChart(form: FormData): Promise<AnalysisResult> {
  const s = await requireUser();
  const f = form.get("chart");
  const question = typeof form.get("question") === "string" ? String(form.get("question")) : undefined;
  if (!(f instanceof File) || f.size === 0) return { ok: false, error: "Choose a chart screenshot first." };
  if (!(TYPES as readonly string[]).includes(f.type)) return { ok: false, error: "Use a PNG, JPG or WebP screenshot." };
  if (f.size > MAX) return { ok: false, error: "Screenshots must be 10 MB or smaller." };
  if (!aiStatus().configured) return { ok: false, error: "AI chart analysis isn’t connected yet (ANTHROPIC_API_KEY is not set). Your screenshot was checked but not analysed or stored." };
  if (!rateLimit(`chart:${s.user.id}`, 20, 3600_000).ok) return { ok: false, error: "You have reached the hourly limit for chart analyses. Try again later." };
  try {
    const r = await readChart({ base64: Buffer.from(await f.arrayBuffer()).toString("base64"), mime: f.type as (typeof TYPES)[number] }, question);
    return r.ok ? { ok: true, reading: r.reading, analysedAt: new Date().toISOString() } : r;
  } catch (e) {
    reportError(e, { where: "action.analyseChart", userId: s.user.id });
    return { ok: false, error: "The analysis service did not respond. Please try again in a moment." };
  }
}
