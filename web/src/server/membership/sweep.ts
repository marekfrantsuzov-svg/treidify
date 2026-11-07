import "server-only";
import { and, eq, gt, isNotNull, isNull, lte } from "drizzle-orm";
import { db, schema } from "../db";
import { notify, retryNotifications } from "./notify";

const HOUR = 3_600_000;

/**
 * Scheduled membership upkeep. Access itself is enforced on every request from the stored end time, so this job
 * never decides who gets in; it only keeps statuses tidy and sends notifications:
 * 1. "ends soon" reminder once, 24 h before a grant ends (grants longer than 36 h only, so a 1-day grant isn't nagged);
 * 2. closes grants whose end time passed (endReason "expired") and sends the "access expired" email once;
 * 3. retries recent emails that failed.
 * Safe to run concurrently or repeatedly: every email has a unique dedupe key and closing uses a guarded update.
 */
export async function membershipSweep(now = new Date()) {
  const G = schema.accessGrant;
  const soon = await db.select({ g: G, email: schema.user.email, name: schema.user.name }).from(G)
    .innerJoin(schema.user, eq(schema.user.id, G.userId))
    .where(and(isNull(G.endedAt), isNotNull(G.endsAt), gt(G.endsAt, now), lte(G.endsAt, new Date(now.getTime() + 24 * HOUR))));
  let reminders = 0;
  for (const r of soon) {
    if (r.g.endsAt!.getTime() - r.g.startsAt.getTime() < 36 * HOUR) continue;
    const s = await notify({ userId: r.g.userId, to: r.email, kind: "access_expiring", dedupeKey: `access_expiring:${r.g.id}:${r.g.endsAt!.getTime()}`, data: { name: r.name, endsAt: r.g.endsAt, plan: r.g.plan as "premium" } });
    if (s !== "duplicate") reminders++;
  }

  const lapsed = await db.select({ g: G, email: schema.user.email, name: schema.user.name, status: schema.membership.status }).from(G)
    .innerJoin(schema.user, eq(schema.user.id, G.userId)).leftJoin(schema.membership, eq(schema.membership.userId, G.userId))
    .where(and(isNull(G.endedAt), isNotNull(G.endsAt), lte(G.endsAt, now))).limit(200);
  let expired = 0;
  for (const r of lapsed) {
    const closed = await db.transaction(async (tx) => {
      const done = await tx.update(G).set({ endedAt: r.g.endsAt, endReason: "expired" }).where(and(eq(G.id, r.g.id), isNull(G.endedAt))).returning({ id: G.id });
      if (done.length) await tx.insert(schema.auditLog).values({ actorId: null, action: "member.access_expired", targetType: "user", targetId: r.g.userId, meta: { grantId: r.g.id, endsAt: r.g.endsAt!.toISOString() } });
      return done.length > 0;
    });
    if (!closed) continue;
    expired++;
    if (r.status === "approved") await notify({ userId: r.g.userId, to: r.email, kind: "access_expired", dedupeKey: `access_expired:${r.g.id}`, data: { name: r.name, plan: r.g.plan as "premium", kind: r.g.kind as "trial" } });
  }
  const retry = await retryNotifications();
  return { ok: true, reminders, expired, retried: retry.retried, sent: retry.sent };
}

let last = 0;
/** Runs the sweep at most every 10 minutes per server instance; used opportunistically so it works without a cron. */
export async function maybeSweep() {
  if (Date.now() - last < 10 * 60_000) return;
  last = Date.now();
  await membershipSweep().catch((e) => console.error("[membership] sweep failed", e));
}
