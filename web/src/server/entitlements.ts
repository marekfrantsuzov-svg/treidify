import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { TRIAL_HOURS, plans, type Feature } from "@/config/plans";
import { audit } from "./audit";
import { db, schema } from "./db";

export type Entitlement = typeof schema.entitlement.$inferSelect;

export interface PlanState {
  plan: "free" | "premium";
  source: "none" | "trial" | "stripe" | "grant";
  trialAvailable: boolean;
  trialEndsAt: Date | null;
  /** Milliseconds of trial left, 0 when not on an active trial. */
  trialRemainingMs: number;
}

/** The single source of truth for access. Computed on the server from stored timestamps, never from the client. */
export function planState(e: Entitlement | undefined, now = new Date()): PlanState {
  if (!e) return { plan: "free", source: "none", trialAvailable: true, trialEndsAt: null, trialRemainingMs: 0 };
  const trialActive = e.source === "trial" && !!e.trialEndsAt && e.trialEndsAt > now;
  const paidActive = (e.source === "stripe" || e.source === "grant") && !!e.premiumUntil && e.premiumUntil > now;
  return {
    plan: trialActive || paidActive ? "premium" : "free",
    source: trialActive ? "trial" : paidActive ? (e.source as "stripe" | "grant") : "none",
    trialAvailable: !e.trialStartedAt,
    trialEndsAt: e.trialEndsAt,
    trialRemainingMs: trialActive ? e.trialEndsAt!.getTime() - now.getTime() : 0,
  };
}

export async function getPlanState(userId: string) {
  const [e] = await db.select().from(schema.entitlement).where(eq(schema.entitlement.userId, userId));
  return planState(e);
}

export async function hasFeature(userId: string, f: Feature) {
  const s = await getPlanState(userId);
  return plans.find((p) => p.id === s.plan)!.features.includes(f);
}

/**
 * Starts the one-time 72-hour trial. No card is taken and nothing renews: when the window ends the
 * account simply returns to Free. The conditional update makes a second start impossible, even concurrently.
 */
export async function startTrial(userId: string) {
  const now = new Date();
  const ends = new Date(now.getTime() + TRIAL_HOURS * 3_600_000);
  await db.insert(schema.entitlement).values({ userId }).onConflictDoNothing();
  const updated = await db
    .update(schema.entitlement)
    .set({ plan: "premium", source: "trial", trialStartedAt: now, trialEndsAt: ends })
    .where(and(eq(schema.entitlement.userId, userId), isNull(schema.entitlement.trialStartedAt)))
    .returning();
  if (updated.length === 0) return { ok: false as const, reason: "used" as const };
  await audit("trial.started", { actorId: userId, targetType: "user", targetId: userId, meta: { endsAt: ends.toISOString() } });
  return { ok: true as const, endsAt: ends };
}
