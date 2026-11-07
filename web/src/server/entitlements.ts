import "server-only";
import { eq } from "drizzle-orm";
import { planById, type Feature, type PlanId } from "@/config/plans";
import { db, schema } from "./db";
import { memberAccess } from "./membership/access";
import type { AccessSource } from "./membership/rules";

export type Entitlement = typeof schema.entitlement.$inferSelect;

export interface PlanState {
  plan: PlanId;
  /** none: no plan · trial: legacy no-card trial (honoured until it ends) · stripe: subscription (incl. its card trial) · grant: given by an admin */
  source: "none" | "trial" | "stripe" | "grant";
  /** True while the person has never had a trial, so checkout may include the 3-day trial. */
  trialAvailable: boolean;
  trialEndsAt: Date | null;
  /** Milliseconds of trial left, 0 when not trialing. */
  trialRemainingMs: number;
  /** When current access ends (manual grant or paid period); null when unlimited or none. */
  accessEndsAt?: Date | null;
  accessSource?: AccessSource;
}

const PAID = new Set(["essential", "premium"]);

/**
 * The single source of truth for access, computed on the server from stored timestamps, never from the client.
 * Stripe webhooks keep the entitlement row current (plan, premiumUntil = paid-through or trial end); nothing else
 * grants paid access. A missing or expired row is "free", which unlocks no paid feature. Manual grants live in access_grant.
 */
export function planState(e: Entitlement | undefined, now = new Date()): PlanState {
  if (!e) return { plan: "free", source: "none", trialAvailable: true, trialEndsAt: null, trialRemainingMs: 0 };
  const legacyTrial = e.source === "trial" && !!e.trialEndsAt && e.trialEndsAt > now;
  const paidActive = (e.source === "stripe" || e.source === "grant") && !!e.premiumUntil && e.premiumUntil > now && PAID.has(e.plan);
  const trialing = paidActive && e.source === "stripe" && !!e.trialEndsAt && e.trialEndsAt > now;
  const plan: PlanId = legacyTrial ? "premium" : paidActive ? (e.plan as PlanId) : "free";
  return {
    plan,
    source: legacyTrial ? "trial" : paidActive ? (e.source as "stripe" | "grant") : "none",
    trialAvailable: !e.trialStartedAt,
    trialEndsAt: legacyTrial || trialing ? e.trialEndsAt : null,
    trialRemainingMs: legacyTrial || trialing ? e.trialEndsAt!.getTime() - now.getTime() : 0,
  };
}

/**
 * The person's effective plan, from membership access (owner, approved manual grant, paid subscription; see
 * membership/rules.ts). Pending, expired, suspended and revoked accounts are "free", which unlocks no paid feature.
 * Selecting a plan at registration never changes this.
 */
export async function getPlanState(userId: string, now = new Date()): Promise<PlanState> {
  const a = await memberAccess(userId);
  const base = planState(a.entitlement ?? undefined, now);
  const trialish = a.source === "trial" || a.source === "legacy_trial";
  const trialEndsAt = trialish ? a.endsAt : a.source === "subscription" ? base.trialEndsAt : null;
  return {
    plan: a.plan,
    source: trialish ? "trial" : a.source === "subscription" ? "stripe" : a.source === "none" ? "none" : "grant",
    trialAvailable: base.trialAvailable,
    trialEndsAt,
    trialRemainingMs: trialEndsAt ? Math.max(0, trialEndsAt.getTime() - now.getTime()) : 0,
    accessEndsAt: a.endsAt,
    accessSource: a.source,
  };
}

export const planHas = (plan: PlanId, f: Feature) => planById(plan).features.includes(f);

export async function hasFeature(userId: string, f: Feature) {
  return planHas((await getPlanState(userId)).plan, f);
}

/** How many trading accounts the person's plan allows (Essential 1, Premium 2; no plan 1 for the read-only overview). */
export async function accountLimit(userId: string) {
  return planById((await getPlanState(userId)).plan).accounts;
}

/** The message every gated action returns, so the wording is consistent. */
export const upgradeMessage = (f: Feature) =>
  f === "coach" || f === "ai.chat" || f === "charts.ai" || f === "news.global" || f === "macro.advanced" || f === "market.advanced" || f === "alerts.advanced"
    ? "This is part of Premium. Start a 3-day trial or upgrade in Settings › Plan."
    : "This needs a Treidify plan. Start a 3-day trial in Settings › Plan.";

/**
 * Server-side guard for actions and routes: `{ ok: true }` or a refusal with the upgrade message.
 * Use before any paid work (AI calls, premium data), never rely on hiding a button.
 */
export async function requireFeature(userId: string, f: Feature): Promise<{ ok: true } | { ok: false; error: string; upgrade: true }> {
  return (await hasFeature(userId, f)) ? { ok: true } : { ok: false, error: upgradeMessage(f), upgrade: true };
}
