import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ChartReadingSchema, type ChartReading } from "./schema";

/**
 * Claude for explanations and chart reading only. It never decides a bias or invents a level: chart reading is
 * limited to what is visible, and market explanations are given the engine's computed output as their only facts.
 * Server-side fallback ("default") lets the API re-run a declined request on another model inside the same call.
 */
export const AI_MODEL = "claude-opus-5-5";
export const aiStatus = () => ({ configured: !!process.env.ANTHROPIC_API_KEY?.trim(), needs: process.env.ANTHROPIC_API_KEY?.trim() ? [] : ["ANTHROPIC_API_KEY"] });
const client = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim(), maxRetries: 2, timeout: 90_000 });

const CHART_SYSTEM = `You read trading chart screenshots for Treidify. Describe only what is visible.
Rules: never state a price unless it is legible on the axis, a label or the price tag; otherwise set price to null and describe the level relative to visible structure ("the last swing low", "the range top").
Never claim a setup is confirmed unless the confirmation is visible. Never predict with certainty or give financial advice. If the image is not a chart, set legible to false.
Use plain English a newer trader understands. Keep each string short.`;

export async function readChart(image: { base64: string; mime: "image/png" | "image/jpeg" | "image/webp" }, question?: string): Promise<{ ok: true; reading: ChartReading } | { ok: false; error: string }> {
  const res = await client().beta.messages.parse({
    model: AI_MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(ChartReadingSchema) },
    system: CHART_SYSTEM,
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: image.mime, data: image.base64 } },
      { type: "text", text: question?.trim() ? `Analyse this chart. The trader asks: ${question.trim().slice(0, 500)}` : "Analyse this chart." },
    ] }],
  });
  if (res.stop_reason === "refusal") return { ok: false, error: "The analysis was declined for this image." };
  if (!res.parsed_output) return { ok: false, error: "The analysis came back incomplete. Please try again." };
  return { ok: true, reading: res.parsed_output };
}

/** Rewrites engine facts into a short desk note. The facts block is the only source; the model must not add numbers. */
export async function explainFacts(facts: string, audience = "a retail Gold trader"): Promise<string | null> {
  const res = await client().beta.messages.create({
    model: AI_MODEL,
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: `You turn Treidify's computed market facts into a clear note for ${audience}. Use ONLY numbers and levels present in the facts. Do not add prices, targets, probabilities or advice. Mention uncertainty and the invalidation. 3 to 5 sentences, no headings, no lists.`,
    messages: [{ role: "user", content: facts }],
  });
  if (res.stop_reason === "refusal") return null;
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
  return text || null;
}
