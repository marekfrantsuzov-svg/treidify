"use server";

import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { db, schema } from "../db";
import { requireMember } from "../session";

export type FeedbackResult = { ok: true; message: string } | { ok: false; error: string };

const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IN = 5 * 1024 * 1024;
const Body = z.object({
  category: z.enum(["bug", "feature", "general"], { error: "Choose a feedback type." }),
  message: z.string().trim().min(5, "Write at least a few words.").max(4000, "Keep it under 4,000 characters."),
});

/** Early-tester feedback from members with access. The optional screenshot is re-encoded to WebP (metadata stripped). */
export async function submitFeedback(form: FormData): Promise<FeedbackResult> {
  const s = await requireMember();
  if (!rateLimit(`feedback:${s.user.id}`, 10, 3600_000).ok) return { ok: false, error: "That's a lot of feedback in an hour. Please try again later." };
  const p = Body.safeParse({ category: form.get("category"), message: form.get("message") });
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the form." };
  const f = form.get("screenshot");
  let shot: Buffer | null = null;
  if (f instanceof File && f.size > 0) {
    if (!TYPES.includes(f.type)) return { ok: false, error: "Use a PNG, JPG or WebP image." };
    if (f.size > MAX_IN) return { ok: false, error: "Images must be 5 MB or smaller." };
    try {
      const sharp = (await import("sharp")).default;
      shot = await sharp(Buffer.from(await f.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    } catch {
      return { ok: false, error: "That file could not be read as an image." };
    }
  }
  await db.insert(schema.feedback).values({ userId: s.user.id, category: p.data.category, message: p.data.message, screenshot: shot, screenshotMime: shot ? "image/webp" : null });
  return { ok: true, message: "Thank you. Your feedback was sent to the Treidify team." };
}
