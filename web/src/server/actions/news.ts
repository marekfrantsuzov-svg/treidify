"use server";

import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { INSTRUMENT_LIST } from "@/lib/markets/registry";
import { reportError } from "@/lib/monitoring";
import { rateLimit } from "@/lib/rate-limit";
import { aiStatus, explainHeadline } from "../ai/claude";
import { requireFeature } from "../entitlements";
import type { NewsBrief } from "../ai/schema";
import { latestHeadlines } from "../news/service";
import { requireUser } from "../session";

export type BriefResult = { ok: true; brief: NewsBrief; generatedAt: string } | { ok: false; error: string };

const cachedBrief = unstable_cache(
  async (_key: string, h: { title: string; summary: string; source: string; publishedAt: string }) => ({ brief: await explainHeadline(h, INSTRUMENT_LIST.map((i) => i.symbol)), generatedAt: new Date().toISOString() }),
  ["ai-news-brief-v1"], { revalidate: 86_400 },
);

/**
 * AI explanation of one headline. The story is looked up again on the server from the provider feed by id, so the
 * model only ever sees text the provider published, never text sent from the browser. Cached per story for 24 hours.
 */
export async function explainNews(id: string): Promise<BriefResult> {
  const s = await requireUser();
  const gate = await requireFeature(s.user.id, "news.global");
  if (!gate.ok) return { ok: false, error: gate.error };
  if (!aiStatus().configured) return { ok: false, error: "AI explanations are not available right now." };
  if (!rateLimit(`news-brief:${s.user.id}`, 30, 3600_000).ok) return { ok: false, error: "Hourly limit for AI explanations reached. Try again later." };
  const feed = await latestHeadlines(80);
  if (!feed.ok) return { ok: false, error: feed.message };
  const h = feed.data.find((x) => x.id === id);
  if (!h) return { ok: false, error: "That story is no longer in the latest feed, so it was not explained." };
  try {
    const key = createHash("sha256").update(`${h.id}|${h.title}|${h.summary}`).digest("hex");
    const r = await cachedBrief(key, { title: h.title, summary: h.summary, source: h.source, publishedAt: h.publishedAt });
    return r.brief ? { ok: true, brief: r.brief, generatedAt: r.generatedAt } : { ok: false, error: "The AI declined or returned an incomplete explanation for this story." };
  } catch (e) {
    reportError(e, { where: "action.explainNews", userId: s.user.id });
    return { ok: false, error: "The AI service did not respond. Please try again." };
  }
}
