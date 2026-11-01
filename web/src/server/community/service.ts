import "server-only";
import { and, count, desc, eq, inArray, gte, sql } from "drizzle-orm";
import { ANALYSTS, analystEmail, type Analyst } from "@/lib/community/analysts";
import { writePost } from "@/lib/community/writer";
import { marketStatus, sessionAt } from "@/lib/analytics/sessions";
import { db, schema } from "../db";
import { marketIntelligence } from "../market/intelligence";
import { upcomingEvents } from "../news/service";

export const VIRTUAL_ROLE = "virtual_analyst";

/** Creates the 30 analyst rows once. They have no credentials and are banned from signing in. */
export async function ensureAnalystUsers() {
  const existing = await db.select({ username: schema.user.username }).from(schema.user).where(eq(schema.user.role, VIRTUAL_ROLE));
  const have = new Set(existing.map((e) => e.username));
  const missing = ANALYSTS.filter((a) => !have.has(a.handle));
  if (missing.length) {
    await db.insert(schema.user).values(missing.map((a) => ({
      id: `va_${a.id}`, name: a.name, email: analystEmail(a), emailVerified: false, username: a.handle, displayUsername: a.handle,
      role: VIRTUAL_ROLE, banned: true, banReason: "Virtual analyst account: automated, cannot sign in.",
    }))).onConflictDoNothing();
  }
}

const toSession = (s: ReturnType<typeof sessionAt>): "asia" | "london" | "newYork" | null => (s === "sydney" || s === "tokyo" ? "asia" : s);
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * One scheduler tick (run hourly). Posts from at most `maxPosts` analysts whose session is active and who have not
 * posted in the last 6 hours, only on LIVE data while the market is open, and never repeats an unchanged post.
 */
export async function communityTick(now = new Date(), maxPosts = 2) {
  if (marketStatus(now) !== "open") return { posted: 0, reason: "market closed" };
  const events = await upcomingEvents(now);
  const intel = await marketIntelligence(events, now);
  if (intel.mode !== "live") return { posted: 0, reason: `market data ${intel.mode}` };
  await ensureAnalystUsers();
  const session = toSession(sessionAt(now));
  const since = new Date(now.getTime() - 6 * 3600_000);
  const recent = await db.select({ authorId: schema.post.authorId }).from(schema.post).where(and(gte(schema.post.createdAt, since), sql`${schema.post.authorId} like 'va\\_%'`));
  const busy = new Set(recent.map((r) => r.authorId));
  const hourSeed = Math.floor(now.getTime() / 3600_000);
  const candidates = ANALYSTS.filter((a) => !busy.has(`va_${a.id}`) && (!session || a.sessions.includes(session)))
    .sort((x, y) => hash(`${hourSeed}${x.id}`) - hash(`${hourSeed}${y.id}`));
  let posted = 0;
  for (const a of candidates) {
    if (posted >= maxPosts) break;
    const w = writePost(a, { gold: intel.gold, dxy: intel.dxy, silver: intel.silver, overall: intel.overall, events: events.map((e) => ({ title: e.title, at: e.at.toISOString(), importance: e.importance })), session, vendor: intel.vendor ?? "" }, hourSeed);
    if (!w) continue;
    const [last] = await db.select({ body: schema.post.body }).from(schema.post).where(eq(schema.post.authorId, `va_${a.id}`)).orderBy(desc(schema.post.createdAt)).limit(1);
    if (last?.body === w.body) continue;
    await db.insert(schema.post).values({ authorId: `va_${a.id}`, room: "general", body: w.body, instruments: w.instruments });
    posted++;
  }
  return { posted };
}

export interface FeedPost { id: string; body: string; createdAt: string; instruments: string[]; author: { id: string; name: string; handle: string | null; virtual: boolean; analyst: Analyst | null; image: string | null }; likes: number; liked: boolean; comments: { id: string; body: string; createdAt: string; author: { name: string; handle: string | null; virtual: boolean } }[] }

export async function feed(viewerId: string, limit = 40): Promise<FeedPost[]> {
  const rows = await db.select({ p: schema.post, u: { id: schema.user.id, name: schema.user.name, username: schema.user.username, role: schema.user.role, image: schema.user.image } })
    .from(schema.post).innerJoin(schema.user, eq(schema.user.id, schema.post.authorId))
    .where(and(eq(schema.post.room, "general"), eq(schema.post.status, "visible"))).orderBy(desc(schema.post.createdAt)).limit(limit);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.p.id);
  const [likes, mine, comments] = await Promise.all([
    db.select({ postId: schema.reaction.postId, n: count() }).from(schema.reaction).where(inArray(schema.reaction.postId, ids)).groupBy(schema.reaction.postId),
    db.select({ postId: schema.reaction.postId }).from(schema.reaction).where(and(inArray(schema.reaction.postId, ids), eq(schema.reaction.userId, viewerId))),
    db.select({ c: schema.comment, u: { name: schema.user.name, username: schema.user.username, role: schema.user.role } }).from(schema.comment).innerJoin(schema.user, eq(schema.user.id, schema.comment.authorId))
      .where(and(inArray(schema.comment.postId, ids), eq(schema.comment.status, "visible"))).orderBy(schema.comment.createdAt),
  ]);
  const likeMap = new Map(likes.map((l) => [l.postId, l.n])), mineSet = new Set(mine.map((m) => m.postId));
  return rows.map(({ p, u }) => ({
    id: p.id, body: p.body, createdAt: p.createdAt.toISOString(), instruments: p.instruments,
    author: { id: u.id, name: u.name, handle: u.username, virtual: u.role === VIRTUAL_ROLE, analyst: u.role === VIRTUAL_ROLE ? ANALYSTS.find((a) => `va_${a.id}` === u.id) ?? null : null, image: u.image },
    likes: likeMap.get(p.id) ?? 0, liked: mineSet.has(p.id),
    comments: comments.filter((c) => c.c.postId === p.id).map((c) => ({ id: c.c.id, body: c.c.body, createdAt: c.c.createdAt.toISOString(), author: { name: c.u.name, handle: c.u.username, virtual: c.u.role === VIRTUAL_ROLE } })),
  }));
}
