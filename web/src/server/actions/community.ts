"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { db, schema } from "../db";
import { requireUser } from "../session";
import type { ActionResult } from "./settings";

const body = z.string().trim().min(2, "Write a little more.").max(2000, "Keep it under 2,000 characters.");
// Claims of results are only allowed through verified account data, never typed into a post.
const PROFIT_CLAIM = /\b(\+?\$?\d[\d,.]*\s?(k|usd|\$|dollars|pips)\b.*\b(profit|made|banked|won)\b|\b(profit|made|banked|won)\b.*\$\d)/i;

export async function createPost(text: string): Promise<ActionResult> {
  const s = await requireUser();
  const p = body.safeParse(text);
  if (!p.success) return { ok: false, error: p.error.issues[0]!.message };
  if (PROFIT_CLAIM.test(p.data)) return { ok: false, error: "Posts can’t include profit claims. Verified results come from a synced account." };
  if (!rateLimit(`post:${s.user.id}`, 10, 3600_000).ok) return { ok: false, error: "You’re posting quickly. Try again in a little while." };
  await db.insert(schema.post).values({ authorId: s.user.id, room: "general", body: p.data });
  revalidatePath("/app/community");
  return { ok: true, message: "Posted." };
}

export async function addComment(postId: string, text: string): Promise<ActionResult> {
  const s = await requireUser();
  const p = body.safeParse(text);
  if (!p.success || !z.uuid().safeParse(postId).success) return { ok: false, error: p.success ? "Post not found." : p.error.issues[0]!.message };
  if (PROFIT_CLAIM.test(p.data)) return { ok: false, error: "Replies can’t include profit claims." };
  if (!rateLimit(`comment:${s.user.id}`, 30, 3600_000).ok) return { ok: false, error: "Too many replies. Try again later." };
  const [post] = await db.select({ id: schema.post.id }).from(schema.post).where(and(eq(schema.post.id, postId), eq(schema.post.status, "visible")));
  if (!post) return { ok: false, error: "Post not found." };
  await db.insert(schema.comment).values({ postId, authorId: s.user.id, body: p.data });
  revalidatePath("/app/community");
  return { ok: true, message: "Replied." };
}

export async function toggleLike(postId: string): Promise<ActionResult> {
  const s = await requireUser();
  if (!z.uuid().safeParse(postId).success) return { ok: false, error: "Post not found." };
  const where = and(eq(schema.reaction.postId, postId), eq(schema.reaction.userId, s.user.id), eq(schema.reaction.kind, "like"));
  const [had] = await db.select().from(schema.reaction).where(where);
  if (had) await db.delete(schema.reaction).where(where);
  else await db.insert(schema.reaction).values({ postId, userId: s.user.id, kind: "like" }).onConflictDoNothing();
  revalidatePath("/app/community");
  return { ok: true };
}
