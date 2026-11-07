import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { boundOwnerId } from "../owner-binding";
import { ownerConfig } from "../owner";
import type { AccessState } from "./rules";

/**
 * Read models for the Members admin panel. The per-member state is computed in SQL with the same rule as
 * rules.ts accessFor() (kept in step by queries.db.test.ts), so lists, filters and counts are fast at any size.
 */
export const PAGE_SIZE = 25;

const ownerIdNow = async () => ownerConfig().id ?? (await boundOwnerId()) ?? "";

/** Newest open grant per user. */
const openGrants = sql`(select distinct on (user_id) id, user_id, kind, plan, starts_at, ends_at from access_grant where ended_at is null order by user_id, created_at desc)`;

const stateSql = (ownerId: string) => sql<AccessState>`case
  when u.id = ${ownerId} and u.email_verified then 'owner'
  when m.status = 'suspended' then 'suspended'
  when m.status = 'revoked' then 'revoked'
  when e.source = 'stripe' and e.premium_until > now() and e.plan in ('essential','premium') then 'active'
  when m.status = 'approved' and g.user_id is not null and g.starts_at <= now() and (g.ends_at is null or g.ends_at > now()) then 'active'
  when m.status = 'approved' and e.source = 'trial' and e.trial_ends_at > now() then 'active'
  when m.status = 'approved' then 'expired'
  else 'pending' end`;

const sourceSql = sql<string>`case
  when e.source = 'stripe' and e.premium_until > now() then 'subscription'
  when g.user_id is not null and g.starts_at <= now() and (g.ends_at is null or g.ends_at > now()) then g.kind
  else null end`;

const base = (ownerId: string) => sql`
  from "user" u
  left join membership m on m.user_id = u.id
  left join profile p on p.user_id = u.id
  left join entitlement e on e.user_id = u.id
  left join ${openGrants} g on g.user_id = u.id`;

export async function memberStats() {
  const ownerId = await ownerIdNow();
  const rows = await db.execute<{ total: number; pending: number; active: number; trials: number; complimentary: number; expired: number; suspended: number; revoked: number }>(sql`
    select count(*)::int as total,
      count(*) filter (where st = 'pending')::int as pending,
      count(*) filter (where st in ('active','owner'))::int as active,
      count(*) filter (where st = 'active' and src = 'trial')::int as trials,
      count(*) filter (where st = 'active' and src = 'complimentary')::int as complimentary,
      count(*) filter (where st = 'expired')::int as expired,
      count(*) filter (where st = 'suspended')::int as suspended,
      count(*) filter (where st = 'revoked')::int as revoked
    from (select ${stateSql(ownerId)} as st, ${sourceSql} as src ${base(ownerId)}) s`);
  return rows[0]!;
}

export type MemberTab = "all" | "pending" | "active" | "inactive";
export interface MemberQuery { tab: MemberTab; q?: string; state?: string; plan?: string; sort?: "registered" | "expires"; dir?: "asc" | "desc"; page?: number }

export interface MemberRow {
  id: string; name: string; email: string; country: string | null; selectedPlan: string | null; state: AccessState; source: string | null;
  endsAt: Date | null; createdAt: Date; role: string | null;
}

const TAB_STATES: Record<MemberTab, AccessState[] | null> = {
  all: null, pending: ["pending"], active: ["active", "owner"], inactive: ["expired", "suspended", "revoked"],
};

export async function listMembers(qy: MemberQuery): Promise<{ rows: MemberRow[]; total: number; page: number; pages: number }> {
  const ownerId = await ownerIdNow();
  const page = Math.max(1, Math.floor(qy.page ?? 1));
  const conds = [sql`true`];
  const tabStates = TAB_STATES[qy.tab];
  const states = qy.state && ["owner", "active", "pending", "expired", "suspended", "revoked"].includes(qy.state) ? [qy.state] : tabStates;
  if (states) conds.push(sql`st in ${sql.raw(`(${states.map((s) => `'${s}'`).join(",")})`)}`);
  if (qy.q?.trim()) {
    const like = `%${qy.q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conds.push(sql`(name ilike ${like} or email ilike ${like})`);
  }
  if (qy.plan === "essential" || qy.plan === "premium") conds.push(sql`selected_plan = ${qy.plan}`);
  if (qy.plan === "none") conds.push(sql`selected_plan is null`);
  const where = sql.join(conds, sql` and `);
  const dir = qy.dir === "asc" ? sql`asc` : sql`desc`;
  const order = qy.sort === "expires" ? sql`ends_at ${dir} nulls last, created_at desc` : sql`created_at ${dir}`;
  const inner = sql`select u.id, u.name, u.email, p.country, m.selected_plan, m.role, u.created_at,
      ${stateSql(ownerId)} as st, ${sourceSql} as src,
      case when e.source = 'stripe' and e.premium_until > now() then e.premium_until else g.ends_at end as ends_at
      ${base(ownerId)}`;
  const [rows, [{ n } = { n: 0 }]] = await Promise.all([
    db.execute<{ id: string; name: string; email: string; country: string | null; selected_plan: string | null; role: string | null; created_at: Date | string; st: AccessState; src: string | null; ends_at: Date | string | null }>(
      sql`select * from (${inner}) x where ${where} order by ${order} limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`),
    db.execute<{ n: number }>(sql`select count(*)::int as n from (${inner}) x where ${where}`),
  ]);
  const d = (v: Date | string | null) => (v === null ? null : v instanceof Date ? v : new Date(v));
  return {
    rows: rows.map((r) => ({ id: r.id, name: r.name, email: r.email, country: r.country, selectedPlan: r.selected_plan, state: r.st, source: r.src, endsAt: d(r.ends_at), createdAt: d(r.created_at)!, role: r.role })),
    total: n, page, pages: Math.max(1, Math.ceil(n / PAGE_SIZE)),
  };
}

/** Everything shown in one member's management panel. */
export async function memberDetail(userId: string) {
  const ownerId = await ownerIdNow();
  const [u] = await db.select({ id: schema.user.id, name: schema.user.name, email: schema.user.email, emailVerified: schema.user.emailVerified, createdAt: schema.user.createdAt, username: schema.user.username })
    .from(schema.user).where(eq(schema.user.id, userId));
  if (!u) return null;
  const [[m], [p], [e], grants, [sub], payments, history, mails, [login], [st], accounts] = await Promise.all([
    db.select().from(schema.membership).where(eq(schema.membership.userId, userId)),
    db.select({ country: schema.profile.country, onboardedAt: schema.profile.onboardedAt, experience: schema.profile.experience, timezone: schema.profile.timezone }).from(schema.profile).where(eq(schema.profile.userId, userId)),
    db.select().from(schema.entitlement).where(eq(schema.entitlement.userId, userId)),
    db.select().from(schema.accessGrant).where(eq(schema.accessGrant.userId, userId)).orderBy(desc(schema.accessGrant.createdAt)).limit(20),
    db.select().from(schema.subscription).where(eq(schema.subscription.userId, userId)).orderBy(desc(schema.subscription.createdAt)).limit(1),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.payment).where(eq(schema.payment.userId, userId)),
    db.select({ a: schema.auditLog, actorName: schema.user.name }).from(schema.auditLog).leftJoin(schema.user, eq(schema.user.id, schema.auditLog.actorId))
      .where(and(eq(schema.auditLog.targetType, "user"), eq(schema.auditLog.targetId, userId), sql`${schema.auditLog.action} like 'member.%'`)).orderBy(desc(schema.auditLog.createdAt)).limit(40),
    db.select().from(schema.emailNotification).where(eq(schema.emailNotification.userId, userId)).orderBy(desc(schema.emailNotification.createdAt)).limit(20),
    db.select({ at: sql<Date | null>`max(${schema.auditLog.createdAt})` }).from(schema.auditLog).where(and(eq(schema.auditLog.action, "session.created"), eq(schema.auditLog.actorId, userId))),
    db.execute<{ st: AccessState; src: string | null }>(sql`select ${stateSql(ownerId)} as st, ${sourceSql} as src ${base(ownerId)} where u.id = ${userId}`),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.tradingAccount).where(and(eq(schema.tradingAccount.userId, userId), sql`${schema.tradingAccount.source} <> 'sample'`)),
  ]);
  const open = grants.find((g) => !g.endedAt) ?? null;
  const firstTrial = [...grants].reverse().find((g) => g.kind === "trial") ?? null;
  const lastLogin = login?.at ? new Date(login.at) : null;
  return {
    user: u, owner: u.id === ownerId, membership: m ?? null, profile: p ?? null, entitlement: e ?? null, grants, open, firstTrial,
    subscription: sub ?? null, paymentCount: payments[0]?.n ?? 0, history, mails, lastLogin, state: st?.st ?? "pending", source: st?.src ?? null,
    tradingAccounts: accounts[0]?.n ?? 0,
  };
}

export async function listFeedback(status?: string, page = 1) {
  const conds = status && ["new", "reviewing", "resolved"].includes(status) ? eq(schema.feedback.status, status) : undefined;
  const F = schema.feedback;
  const rows = await db.select({ id: F.id, category: F.category, message: F.message, status: F.status, createdAt: F.createdAt, hasShot: sql<boolean>`${F.screenshot} is not null`, userId: F.userId, name: schema.user.name, email: schema.user.email })
    .from(F).innerJoin(schema.user, eq(schema.user.id, F.userId)).where(conds).orderBy(desc(F.createdAt)).limit(PAGE_SIZE).offset((Math.max(1, page) - 1) * PAGE_SIZE);
  const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(F).where(conds);
  const [{ fresh } = { fresh: 0 }] = await db.select({ fresh: sql<number>`count(*)::int` }).from(F).where(eq(F.status, "new"));
  return { rows, total: n, fresh, pages: Math.max(1, Math.ceil(n / PAGE_SIZE)) };
}

/** Administrative activity (membership and feedback actions, owner binding, expiries), newest first. */
export async function activityLog(page = 1) {
  const A = schema.auditLog;
  const actor = sql<string | null>`(select name from "user" where id = ${A.actorId})`;
  const target = sql<string | null>`(select coalesce(name, email) from "user" where id = ${A.targetId})`;
  const where = sql`(${A.action} like 'member.%' or ${A.action} like 'feedback.%' or ${A.action} like 'membership.%' or ${A.action} = 'owner.bound')`;
  const rows = await db.select({ id: A.id, action: A.action, actorId: A.actorId, actorName: actor, targetId: A.targetId, targetType: A.targetType, targetName: target, meta: A.meta, createdAt: A.createdAt })
    .from(A).where(where).orderBy(desc(A.createdAt)).limit(PAGE_SIZE).offset((Math.max(1, page) - 1) * PAGE_SIZE);
  const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(A).where(where);
  return { rows, total: n, pages: Math.max(1, Math.ceil(n / PAGE_SIZE)) };
}

export async function recentPending(limit = 5) {
  return (await listMembers({ tab: "pending", sort: "registered", dir: "desc" })).rows.slice(0, limit);
}

export async function emailStats() {
  const rows = await db.select({ status: schema.emailNotification.status, n: sql<number>`count(*)::int` }).from(schema.emailNotification).groupBy(schema.emailNotification.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
}

export async function screenshotFor(feedbackId: string) {
  const [r] = await db.select({ mime: schema.feedback.screenshotMime, data: schema.feedback.screenshot }).from(schema.feedback).where(eq(schema.feedback.id, feedbackId));
  return r?.data ? r : null;
}

