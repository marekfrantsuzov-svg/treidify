import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { stripeStatus, cancelSubscription as stripeCancel } from "../billing/stripe";
import { deleteConnectedAccount } from "../sync/service";
import { boundOwnerId } from "../owner-binding";
import { ownerConfig } from "../owner";
import { appUrl, notify } from "./notify";
import { canAct, extendEnd, grantActive, resolveEnd, type Actor, type AdminAction, type DurationInput, type GrantKind, type GrantPlan, type MemberRole, type Target } from "./rules";

/**
 * Owner/admin membership operations. Every function:
 * - re-checks permission on the server with canAct() (the UI hiding a button is never the guard),
 * - validates its input again (the action layer already parsed it with zod),
 * - runs the change and its audit record in ONE database transaction, with the member's row locked,
 * - sends email only after the transaction committed, and records whether the provider accepted it.
 */
export type OpResult = { ok: true; message: string } | { ok: false; error: string };
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function ownerId() {
  return ownerConfig().id ?? (await boundOwnerId());
}

/** The acting person, read from the database. */
export async function actorFor(userId: string): Promise<Actor> {
  const [oid, [m]] = await Promise.all([ownerId(), db.select({ role: schema.membership.role }).from(schema.membership).where(eq(schema.membership.userId, userId))]);
  return { id: userId, owner: oid === userId, role: oid === userId ? null : ((m?.role ?? "member") as MemberRole) };
}

async function targetFor(userId: string): Promise<(Target & { email: string; name: string; status: string; approvedAt: Date | null }) | null> {
  const [oid, [u]] = await Promise.all([
    ownerId(),
    db.select({ id: schema.user.id, email: schema.user.email, name: schema.user.name, role: schema.membership.role, status: schema.membership.status, approvedAt: schema.membership.approvedAt })
      .from(schema.user).leftJoin(schema.membership, eq(schema.membership.userId, schema.user.id)).where(eq(schema.user.id, userId)),
  ]);
  if (!u) return null;
  return { id: u.id, owner: u.id === oid, role: (u.role ?? "member") as MemberRole, email: u.email, name: u.name, status: u.status ?? "pending", approvedAt: u.approvedAt };
}

/** Loads actor + target and applies the permission rule. */
async function authorize(actorId: string, action: AdminAction, targetId: string) {
  const [actor, target] = await Promise.all([actorFor(actorId), targetFor(targetId)]);
  if (!target) return { ok: false as const, error: "Member not found." };
  const c = canAct(actor, action, target);
  if (!c.ok) return c;
  return { ok: true as const, actor, target };
}

/** Locks the member's membership row for the rest of the transaction (creating it if an old account has none). */
async function lockMember(tx: Tx, userId: string) {
  await tx.insert(schema.membership).values({ userId }).onConflictDoNothing();
  const [m] = await tx.select().from(schema.membership).where(eq(schema.membership.userId, userId)).for("update");
  return m!;
}

async function openGrant(tx: Tx, userId: string) {
  const [g] = await tx.select().from(schema.accessGrant).where(and(eq(schema.accessGrant.userId, userId), isNull(schema.accessGrant.endedAt))).orderBy(desc(schema.accessGrant.createdAt)).limit(1);
  return g ?? null;
}

const auditTx = (tx: Tx, actorId: string, action: string, targetId: string, meta: Record<string, unknown>) =>
  tx.insert(schema.auditLog).values({ actorId, action, targetType: "user", targetId, meta });

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/* ───────────── Approve / grant ───────────── */

export interface GrantInput { kind: GrantKind; plan: GrantPlan; duration: DurationInput; note?: string | null }

/**
 * Approves the member (if pending or revoked) and gives them access for an exact window. Any current grant is closed
 * as "replaced", so durations never stack by accident and each member's window is independent.
 * Complimentary and trial grants create no subscription and no payment record.
 */
export async function approveAndGrant(actorId: string, targetId: string, input: GrantInput): Promise<OpResult & { grantId?: string; endsAt?: Date | null; email?: string }> {
  const a = await authorize(actorId, "grant", targetId);
  if (!a.ok) return a;
  if (a.target.status === "suspended") return { ok: false, error: "This member is suspended. Reinstate them first." };
  const now = new Date();
  const end = resolveEnd(input.duration, now);
  if (!end.ok) return end;
  const res = await db.transaction(async (tx) => {
    const m = await lockMember(tx, targetId);
    if (m.status === "suspended") return { ok: false as const, error: "This member is suspended. Reinstate them first." };
    const prev = await openGrant(tx, targetId);
    if (prev) await tx.update(schema.accessGrant).set({ endedAt: now, endedBy: actorId, endReason: "replaced" }).where(eq(schema.accessGrant.id, prev.id));
    const [g] = await tx.insert(schema.accessGrant).values({ userId: targetId, kind: input.kind, plan: input.plan, startsAt: now, endsAt: end.endsAt, grantedBy: actorId, note: input.note?.trim() || null }).returning();
    const wasApproved = m.status === "approved";
    await tx.update(schema.membership).set({ status: "approved", approvedAt: m.approvedAt ?? now, approvedBy: m.approvedBy ?? actorId, suspendedAt: null, suspendedBy: null, suspendReason: null }).where(eq(schema.membership.userId, targetId));
    await auditTx(tx, actorId, wasApproved ? "member.access_granted" : "member.approved", targetId, {
      previousStatus: m.status, kind: input.kind, plan: input.plan, startsAt: iso(now), endsAt: iso(end.endsAt), unlimited: end.endsAt === null, replacedGrant: prev?.id ?? null,
    });
    return { ok: true as const, grant: g! };
  });
  if (!res.ok) return res;
  const delivery = await notify({ userId: targetId, to: a.target.email, kind: "access_approved", dedupeKey: `access_approved:${res.grant.id}`, data: { name: a.target.name, endsAt: res.grant.endsAt, plan: input.plan, kind: input.kind } });
  const mail = delivery === "sent" ? "Approval email accepted by the email provider." : delivery === "not_configured" ? "No approval email: email is not configured." : delivery === "failed" ? "The approval email failed and will be retried." : "";
  const until = res.grant.endsAt ? `until ${res.grant.endsAt.toISOString().slice(0, 16).replace("T", " ")} UTC` : "with no end date";
  return { ok: true, message: `${a.target.name} has ${input.kind === "trial" ? "a free trial" : "complimentary"} ${input.plan === "premium" ? "Premium" : "Essential"} access ${until}. ${mail}`.trim(), grantId: res.grant.id, endsAt: res.grant.endsAt, email: a.target.email };
}

/* ───────────── Extend ───────────── */

export async function extendAccess(actorId: string, targetId: string, duration: DurationInput): Promise<OpResult> {
  const a = await authorize(actorId, "extend", targetId);
  if (!a.ok) return a;
  const now = new Date();
  return db.transaction(async (tx) => {
    const m = await lockMember(tx, targetId);
    if (m.status !== "approved") return { ok: false as const, error: "Only approved members with access can be extended. Use Grant access." };
    const g = await openGrant(tx, targetId);
    if (!g) return { ok: false as const, error: "There is no manual access to extend. Use Grant access." };
    if (g.endsAt === null && duration.type === "days") return { ok: false as const, error: "This access is already unlimited." };
    const end = duration.type === "unlimited" ? { ok: true as const, endsAt: null } : extendEnd(g.endsAt, duration, now);
    if (!end.ok) return end;
    await tx.update(schema.accessGrant).set({ endsAt: end.endsAt, startsAt: g.startsAt > now ? now : g.startsAt }).where(eq(schema.accessGrant.id, g.id));
    await auditTx(tx, actorId, "member.access_extended", targetId, { grantId: g.id, previousEndsAt: iso(g.endsAt), endsAt: iso(end.endsAt), wasLapsed: !grantActive(g, now) });
    return { ok: true as const, message: end.endsAt ? `Access now ends ${end.endsAt.toISOString().slice(0, 16).replace("T", " ")} UTC.` : "Access is now unlimited." };
  });
}

/* ───────────── Plan ───────────── */

export type PlanChoice = "essential_paid" | "premium_paid" | "complimentary_premium" | "trial_premium";

/**
 * Standard/Essential and Premium (paid) only record the plan the member will subscribe to: they never grant access
 * and never charge. Complimentary Premium and Free Trial change the member's current manual access in place.
 */
export async function changePlan(actorId: string, targetId: string, choice: PlanChoice): Promise<OpResult> {
  const a = await authorize(actorId, "plan", targetId);
  if (!a.ok) return a;
  return db.transaction(async (tx) => {
    const m = await lockMember(tx, targetId);
    if (choice === "essential_paid" || choice === "premium_paid") {
      const plan = choice === "essential_paid" ? "essential" : "premium";
      await tx.update(schema.membership).set({ selectedPlan: plan }).where(eq(schema.membership.userId, targetId));
      await auditTx(tx, actorId, "member.plan_selected", targetId, { previous: m.selectedPlan, plan });
      return { ok: true as const, message: `Selected plan set to ${plan === "premium" ? "Premium ($49/month)" : "Essential ($24/month)"}. Nothing is charged until payments are connected.` };
    }
    const g = await openGrant(tx, targetId);
    if (!g || !grantActive(g) || m.status !== "approved") return { ok: false as const, error: "This member has no current access to convert. Use Grant access." };
    const kind: GrantKind = choice === "trial_premium" ? "trial" : "complimentary";
    await tx.update(schema.accessGrant).set({ kind, plan: "premium" }).where(eq(schema.accessGrant.id, g.id));
    await auditTx(tx, actorId, "member.access_type_changed", targetId, { grantId: g.id, from: { kind: g.kind, plan: g.plan }, to: { kind, plan: "premium" } });
    return { ok: true as const, message: kind === "trial" ? "Access is now a free Premium trial (same end date)." : "Access is now complimentary Premium (same end date)." };
  });
}

/* ───────────── End, revoke, suspend, reinstate ───────────── */

/** Ends the current manual access now (the member stays approved and sees the expired screen). */
export async function endAccess(actorId: string, targetId: string): Promise<OpResult> {
  const a = await authorize(actorId, "end", targetId);
  if (!a.ok) return a;
  const now = new Date();
  return db.transaction(async (tx) => {
    await lockMember(tx, targetId);
    const g = await openGrant(tx, targetId);
    if (!g) return { ok: false as const, error: "There is no manual access to end." };
    await tx.update(schema.accessGrant).set({ endedAt: now, endedBy: actorId, endReason: "ended" }).where(eq(schema.accessGrant.id, g.id));
    await auditTx(tx, actorId, "member.access_ended", targetId, { grantId: g.id, scheduledEnd: iso(g.endsAt) });
    return { ok: true as const, message: "Manual access ended. The account and its data are kept." };
  });
}

/** Removes the entitlement (ends manual access, status revoked) without deleting the account or its data. */
export async function revokeAccess(actorId: string, targetId: string, reason?: string | null): Promise<OpResult> {
  const a = await authorize(actorId, "revoke", targetId);
  if (!a.ok) return a;
  const now = new Date();
  return db.transaction(async (tx) => {
    const m = await lockMember(tx, targetId);
    const g = await openGrant(tx, targetId);
    if (g) await tx.update(schema.accessGrant).set({ endedAt: now, endedBy: actorId, endReason: "revoked" }).where(eq(schema.accessGrant.id, g.id));
    await tx.update(schema.membership).set({ status: "revoked" }).where(eq(schema.membership.userId, targetId));
    await auditTx(tx, actorId, "member.access_revoked", targetId, { previousStatus: m.status, grantId: g?.id ?? null, reason: reason?.trim() || null });
    return { ok: true as const, message: "Access revoked. The account and its data are kept." };
  });
}

/** Blocks the account immediately (and signs it out everywhere). Data and any running grant are kept for reinstatement. */
export async function suspendMember(actorId: string, targetId: string, reason?: string | null): Promise<OpResult> {
  const a = await authorize(actorId, "suspend", targetId);
  if (!a.ok) return a;
  const now = new Date();
  return db.transaction(async (tx) => {
    const m = await lockMember(tx, targetId);
    if (m.status === "suspended") return { ok: false as const, error: "Already suspended." };
    await tx.update(schema.membership).set({ status: "suspended", suspendedAt: now, suspendedBy: actorId, suspendReason: reason?.trim() || null }).where(eq(schema.membership.userId, targetId));
    const ended = await tx.delete(schema.session).where(eq(schema.session.userId, targetId)).returning({ id: schema.session.id });
    await auditTx(tx, actorId, "member.suspended", targetId, { previousStatus: m.status, reason: reason?.trim() || null, sessionsEnded: ended.length });
    return { ok: true as const, message: "Suspended. They were signed out and cannot use Treidify; their data is kept." };
  });
}

export async function reinstateMember(actorId: string, targetId: string): Promise<OpResult> {
  const a = await authorize(actorId, "reinstate", targetId);
  if (!a.ok) return a;
  return db.transaction(async (tx) => {
    const m = await lockMember(tx, targetId);
    if (m.status !== "suspended" && m.status !== "revoked") return { ok: false as const, error: "This member is not suspended or revoked." };
    const next = m.approvedAt ? "approved" : "pending";
    await tx.update(schema.membership).set({ status: next, suspendedAt: null, suspendedBy: null, suspendReason: null }).where(eq(schema.membership.userId, targetId));
    await auditTx(tx, actorId, "member.reinstated", targetId, { previousStatus: m.status, status: next });
    return { ok: true as const, message: next === "approved" ? "Reinstated. Any access that has not expired applies again." : "Reinstated to the waitlist." };
  });
}

/* ───────────── Subscription (payment provider) ───────────── */

export async function cancelMemberSubscription(actorId: string, targetId: string, atPeriodEnd: boolean): Promise<OpResult> {
  const a = await authorize(actorId, "end", targetId);
  if (!a.ok) return a;
  if (!stripeStatus().configured) return { ok: false, error: "Payments are not connected yet, so there is no subscription to cancel. Use End access for manual access." };
  const [sub] = await db.select().from(schema.subscription).where(eq(schema.subscription.userId, targetId)).orderBy(desc(schema.subscription.createdAt)).limit(1);
  if (!sub?.stripeSubscriptionId) return { ok: false, error: "This member has no paid subscription." };
  try {
    await stripeCancel(sub.stripeSubscriptionId, atPeriodEnd);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? `The payment provider refused: ${e.message}` : "Cancellation failed." };
  }
  await db.insert(schema.auditLog).values({ actorId, action: "member.subscription_cancelled", targetType: "user", targetId, meta: { atPeriodEnd, subscription: sub.stripeSubscriptionId } });
  return { ok: true, message: atPeriodEnd ? "The subscription will end at the close of the paid period." : "The subscription was cancelled immediately." };
}

/* ───────────── Role, notes ───────────── */

export async function setRole(actorId: string, targetId: string, role: MemberRole): Promise<OpResult> {
  const a = await authorize(actorId, "role", targetId);
  if (!a.ok) return a;
  return db.transaction(async (tx) => {
    const m = await lockMember(tx, targetId);
    if (role === "admin" && m.status !== "approved") return { ok: false as const, error: "Only an approved member can be made an admin." };
    await tx.update(schema.membership).set({ role }).where(eq(schema.membership.userId, targetId));
    await auditTx(tx, actorId, role === "admin" ? "member.admin_granted" : "member.admin_revoked", targetId, { previous: m.role });
    return { ok: true as const, message: role === "admin" ? "Admin permissions granted." : "Admin permissions removed." };
  });
}

export async function saveNotes(actorId: string, targetId: string, notes: string): Promise<OpResult> {
  const a = await authorize(actorId, "notes", targetId);
  if (!a.ok) return a;
  return db.transaction(async (tx) => {
    await lockMember(tx, targetId);
    await tx.update(schema.membership).set({ notes: notes.trim() || null }).where(eq(schema.membership.userId, targetId));
    await auditTx(tx, actorId, "member.notes_updated", targetId, { length: notes.trim().length });
    return { ok: true as const, message: "Notes saved." };
  });
}

/* ───────────── Delete ───────────── */

const maskEmail = (e: string) => { const [l, d] = e.split("@"); return `${(l ?? "").slice(0, 1)}***@${d ?? ""}`; };

/**
 * Permanently deletes the member: first removes every connected trading account from MetaApi (so the provider no
 * longer holds their MetaTrader password), then the Treidify user and everything that cascades from it. The audit
 * entry keeps only a masked email.
 */
export async function deleteMember(actorId: string, targetId: string, confirmEmail: string): Promise<OpResult> {
  const a = await authorize(actorId, "delete", targetId);
  if (!a.ok) return a;
  if (confirmEmail.trim().toLowerCase() !== a.target.email.toLowerCase()) return { ok: false, error: "Type the member's email exactly to confirm." };
  const accounts = await db.select({ id: schema.tradingAccount.id, source: schema.tradingAccount.source }).from(schema.tradingAccount).where(eq(schema.tradingAccount.userId, targetId));
  for (const acc of accounts.filter((x) => x.source !== "sample")) {
    const r = await deleteConnectedAccount(targetId, acc.id);
    if (!r.ok) return { ok: false, error: `A connected trading account could not be removed from the sync provider (${r.error}). Nothing was deleted; try again.` };
  }
  await db.transaction(async (tx) => {
    await auditTx(tx, actorId, "member.deleted", targetId, { email: maskEmail(a.target.email), tradingAccountsRemoved: accounts.length });
    await tx.delete(schema.user).where(eq(schema.user.id, targetId));
  });
  return { ok: true, message: "Member deleted, including their synced data and connected trading accounts." };
}

/* ───────────── Feedback ───────────── */

export async function setFeedbackStatus(actorId: string, feedbackId: string, status: "new" | "reviewing" | "resolved"): Promise<OpResult> {
  const actor = await actorFor(actorId);
  const c = canAct(actor, "feedback");
  if (!c.ok) return c;
  const r = await db.update(schema.feedback).set({ status }).where(eq(schema.feedback.id, feedbackId)).returning({ id: schema.feedback.id });
  if (!r.length) return { ok: false, error: "Feedback not found." };
  await db.insert(schema.auditLog).values({ actorId, action: "feedback.status", targetType: "feedback", targetId: feedbackId, meta: { status } });
  return { ok: true, message: `Marked ${status}.` };
}

/* ───────────── Subscription-available announcement ───────────── */

/** Emails every pending member once that subscriptions are open. Only when payments are actually connected. */
export async function announceSubscriptions(actorId: string): Promise<OpResult> {
  const actor = await actorFor(actorId);
  const c = canAct(actor, "notify");
  if (!c.ok) return c;
  if (!stripeStatus().configured) return { ok: false, error: "Payments are not connected yet. This email can only go out once subscriptions can actually be bought." };
  const rows = await db.select({ id: schema.user.id, email: schema.user.email, name: schema.user.name }).from(schema.user)
    .innerJoin(schema.membership, eq(schema.membership.userId, schema.user.id)).where(eq(schema.membership.status, "pending"));
  const counts: Record<string, number> = {};
  for (const u of rows) {
    const s = await notify({ userId: u.id, to: u.email, kind: "subscription_available", dedupeKey: `subscription_available:${u.id}`, data: { name: u.name, link: `${appUrl()}/app/settings/plan` } });
    counts[s] = (counts[s] ?? 0) + 1;
  }
  await db.insert(schema.auditLog).values({ actorId, action: "membership.subscriptions_announced", targetType: "system", meta: { recipients: rows.length, ...counts } });
  return { ok: true, message: `${counts.sent ?? 0} emails accepted, ${counts.duplicate ?? 0} already notified, ${counts.failed ?? 0} failed.` };
}

/** Records the plan a person chose at registration (intent only) and confirms their waitlist place by email. */
export async function joinWaitlist(user: { id: string; email: string; name: string }, selectedPlan: GrantPlan | null) {
  await db.insert(schema.membership).values({ userId: user.id, selectedPlan }).onConflictDoUpdate({ target: schema.membership.userId, set: { selectedPlan: sql`coalesce(excluded.selected_plan, ${schema.membership.selectedPlan})` } });
  const [m] = await db.select({ status: schema.membership.status }).from(schema.membership).where(eq(schema.membership.userId, user.id));
  if (m?.status !== "pending") return;
  await notify({ userId: user.id, to: user.email, kind: "waitlist_confirmation", dedupeKey: `waitlist_confirmation:${user.id}`, data: { name: user.name } });
}
