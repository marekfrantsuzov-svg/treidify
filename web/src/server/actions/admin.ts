"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { isStaff } from "../membership/access";
import * as svc from "../membership/service";
import { MAX_GRANT_DAYS } from "../membership/rules";
import { requireMember } from "../session";

/**
 * Members admin panel actions. Each one: signed-in member with access, owner or admin (re-checked here and again with
 * the exact permission inside the service), rate-limited, input parsed with zod. The browser only sends IDs and
 * choices; who acts is always the session user.
 */
export type AdminResult = { ok: true; message: string } | { ok: false; error: string };

async function staff() {
  const s = await requireMember();
  if (!isStaff(s.access)) throw new Error("Not allowed.");
  if (!rateLimit(`admin:${s.user.id}`, 120, 60_000).ok) throw new Error("Too many changes in a minute. Wait a moment and try again.");
  return s.user.id;
}

async function run(fn: (actorId: string) => Promise<svc.OpResult>): Promise<AdminResult> {
  try {
    const actorId = await staff();
    const r = await fn(actorId);
    if (r.ok) revalidatePath("/app/settings/members");
    return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.error };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // let redirects through
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

const id = z.string().min(1).max(64);
const duration = z.discriminatedUnion("type", [
  z.object({ type: z.literal("days"), days: z.number().int().min(1).max(MAX_GRANT_DAYS) }),
  z.object({ type: z.literal("until"), until: z.string().datetime({ offset: true }) }),
  z.object({ type: z.literal("unlimited") }),
]);
const grantSchema = z.object({ userId: id, kind: z.enum(["trial", "complimentary"]), plan: z.enum(["essential", "premium"]), duration, note: z.string().max(500).optional().nullable() });

export async function grantAccess(input: z.input<typeof grantSchema>): Promise<AdminResult> {
  const p = grantSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the duration." };
  return run((a) => svc.approveAndGrant(a, p.data.userId, p.data));
}

export async function extendAccess(input: { userId: string; duration: z.input<typeof duration> }): Promise<AdminResult> {
  const p = z.object({ userId: id, duration }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the duration." };
  return run((a) => svc.extendAccess(a, p.data.userId, p.data.duration));
}

export async function changePlan(input: { userId: string; choice: svc.PlanChoice }): Promise<AdminResult> {
  const p = z.object({ userId: id, choice: z.enum(["essential_paid", "premium_paid", "complimentary_premium", "trial_premium"]) }).safeParse(input);
  if (!p.success) return { ok: false, error: "Choose a plan." };
  return run((a) => svc.changePlan(a, p.data.userId, p.data.choice));
}

const withReason = z.object({ userId: id, reason: z.string().max(500).optional().nullable() });

export async function endAccess(userId: string): Promise<AdminResult> {
  const p = id.safeParse(userId);
  return p.success ? run((a) => svc.endAccess(a, p.data)) : { ok: false, error: "Unknown member." };
}
export async function revokeAccess(input: z.input<typeof withReason>): Promise<AdminResult> {
  const p = withReason.safeParse(input);
  return p.success ? run((a) => svc.revokeAccess(a, p.data.userId, p.data.reason)) : { ok: false, error: "Unknown member." };
}
export async function suspendMember(input: z.input<typeof withReason>): Promise<AdminResult> {
  const p = withReason.safeParse(input);
  return p.success ? run((a) => svc.suspendMember(a, p.data.userId, p.data.reason)) : { ok: false, error: "Unknown member." };
}
export async function reinstateMember(userId: string): Promise<AdminResult> {
  const p = id.safeParse(userId);
  return p.success ? run((a) => svc.reinstateMember(a, p.data)) : { ok: false, error: "Unknown member." };
}
export async function cancelSubscription(input: { userId: string; atPeriodEnd: boolean }): Promise<AdminResult> {
  const p = z.object({ userId: id, atPeriodEnd: z.boolean() }).safeParse(input);
  return p.success ? run((a) => svc.cancelMemberSubscription(a, p.data.userId, p.data.atPeriodEnd)) : { ok: false, error: "Unknown member." };
}
export async function setRole(input: { userId: string; role: "member" | "admin" }): Promise<AdminResult> {
  const p = z.object({ userId: id, role: z.enum(["member", "admin"]) }).safeParse(input);
  return p.success ? run((a) => svc.setRole(a, p.data.userId, p.data.role)) : { ok: false, error: "Unknown role." };
}
export async function saveNotes(input: { userId: string; notes: string }): Promise<AdminResult> {
  const p = z.object({ userId: id, notes: z.string().max(5000) }).safeParse(input);
  return p.success ? run((a) => svc.saveNotes(a, p.data.userId, p.data.notes)) : { ok: false, error: "Notes are limited to 5,000 characters." };
}
export async function deleteMember(input: { userId: string; confirmEmail: string }): Promise<AdminResult> {
  const p = z.object({ userId: id, confirmEmail: z.string().max(320) }).safeParse(input);
  return p.success ? run((a) => svc.deleteMember(a, p.data.userId, p.data.confirmEmail)) : { ok: false, error: "Unknown member." };
}
export async function setFeedbackStatus(input: { id: string; status: "new" | "reviewing" | "resolved" }): Promise<AdminResult> {
  const p = z.object({ id: z.string().uuid(), status: z.enum(["new", "reviewing", "resolved"]) }).safeParse(input);
  return p.success ? run((a) => svc.setFeedbackStatus(a, p.data.id, p.data.status)) : { ok: false, error: "Unknown feedback." };
}
export async function announceSubscriptions(): Promise<AdminResult> {
  return run((a) => svc.announceSubscriptions(a));
}

