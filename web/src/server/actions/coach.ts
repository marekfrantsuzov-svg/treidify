"use server";

import { revalidatePath } from "next/cache";
import { coachFacts, type CoachPeriod } from "@/lib/analytics";
import { reportError } from "@/lib/monitoring";
import { rateLimit } from "@/lib/rate-limit";
import { aiStatus, AI_MODEL, coachReview } from "../ai/claude";
import { accountOverview } from "../account-data";
import { db, schema } from "../db";
import { requireOnboarded } from "../session";
import type { ActionResult } from "./settings";

const PERIODS: CoachPeriod[] = ["daily", "weekly", "monthly"];

/** Generates and saves an AI coaching review for one period from the user's own closed trades. */
export async function generateCoachReview(period: CoachPeriod, accountId?: string): Promise<ActionResult> {
  const s = await requireOnboarded("/app/coach");
  if (!PERIODS.includes(period)) return { ok: false, error: "Unknown period." };
  if (!aiStatus().configured) return { ok: false, error: "AI coaching is not connected yet (ANTHROPIC_API_KEY is not set). The computed patterns above still work." };
  if (!rateLimit(`coach:${s.user.id}`, 10, 3600_000).ok) return { ok: false, error: "Hourly limit for coaching reviews reached. Try again later." };
  const o = await accountOverview(s.user.id, accountId);
  if (!o) return { ok: false, error: "Connect a trading account first: the coach only reviews real synced trades." };
  const now = new Date();
  const { facts, tradeCount } = coachFacts({ trades: o.trades, allTrades: o.trades, period, now, tz: s.profile.timezone, currency: o.account.currency });
  if (tradeCount === 0) return { ok: false, error: "No trades closed in this period, so there is nothing to review. Nothing was generated." };
  try {
    const review = await coachReview(facts);
    if (!review) return { ok: false, error: "The AI declined or returned an incomplete review. Please try again." };
    await db.insert(schema.aiReport).values({
      userId: s.user.id, kind: period, periodStart: new Date(now.getTime() - ({ daily: 1, weekly: 7, monthly: 30 }[period]) * 86_400_000), periodEnd: now,
      input: { facts, accountId: o.account.id, accountLabel: o.account.label, sample: o.account.source === "sample", tradeCount }, output: review, model: AI_MODEL,
    });
    revalidatePath("/app/coach");
    return { ok: true, message: "Review generated." };
  } catch (e) {
    reportError(e, { where: "action.generateCoachReview", userId: s.user.id });
    return { ok: false, error: "The AI service did not respond. Please try again in a moment." };
  }
}
