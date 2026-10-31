"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import sharp from "sharp";
import { z } from "zod";
import { instrumentChoices } from "@/config/onboarding";
import { audit } from "../audit";
import { auth } from "../auth";
import { db, schema } from "../db";
import { startTrial } from "../entitlements";
import { requireUser } from "../session";
import { isTimeZone, usernameSchema } from "@/lib/validation";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });
const first = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form.";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(60),
  username: usernameSchema,
  bio: z.string().trim().max(280, "Keep your bio under 280 characters.").optional().default(""),
  country: z.string().trim().max(56).optional().default(""),
});

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const s = await requireUser();
  const p = profileSchema.safeParse(input);
  if (!p.success) return fail(first(p.error));
  const { name, username, bio, country } = p.data;
  if (username.toLowerCase() !== s.user.username) {
    const avail = await auth.api.isUsernameAvailable({ body: { username } });
    if (!avail.available) return fail("That username is taken.");
  }
  await auth.api.updateUser({ headers: await headers(), body: { name, username } });
  await db.update(schema.profile).set({ bio: bio || null, country: country || null }).where(eq(schema.profile.userId, s.user.id));
  revalidatePath("/app", "layout");
  return { ok: true, message: "Profile saved." };
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** Re-encodes every upload (strips metadata such as GPS, defeats polyglot files) to a 256px WebP. */
export async function uploadAvatar(form: FormData): Promise<ActionResult> {
  const s = await requireUser();
  const file = form.get("avatar");
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image.");
  if (file.size > MAX_AVATAR_BYTES) return fail("Images must be 5 MB or smaller.");
  if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"].includes(file.type)) return fail("Use a JPEG, PNG, WebP, HEIC or AVIF image.");
  let out: Buffer;
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate().resize(256, 256, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
  } catch {
    return fail("That file could not be read as an image.");
  }
  await db.update(schema.profile).set({ avatar: `data:image/webp;base64,${out.toString("base64")}` }).where(eq(schema.profile.userId, s.user.id));
  await audit("profile.avatar_updated", { actorId: s.user.id, targetType: "user", targetId: s.user.id });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Photo updated." };
}

export async function removeAvatar(): Promise<ActionResult> {
  const s = await requireUser();
  await db.update(schema.profile).set({ avatar: null }).where(eq(schema.profile.userId, s.user.id));
  revalidatePath("/app", "layout");
  return { ok: true, message: "Photo removed." };
}

const privacySchema = z.object({
  profilePublic: z.boolean(),
  showMonthlyPnl: z.boolean(),
  showWinRate: z.boolean(),
  showHistory: z.boolean(),
  showOpenPositions: z.boolean(),
  showEntryPrices: z.boolean(),
  showPositionSizes: z.boolean(),
  showBalance: z.boolean(),
  positionDelayMinutes: z.number().int().refine((n) => [0, 15, 60, 240, 1440].includes(n), "Choose a listed delay."),
});
export type PrivacyInput = z.infer<typeof privacySchema>;

export async function updatePrivacy(input: PrivacyInput): Promise<ActionResult> {
  const s = await requireUser();
  const p = privacySchema.safeParse(input);
  if (!p.success) return fail(first(p.error));
  // Details of open positions are meaningless without the positions themselves; keep the toggles coherent.
  const v = { ...p.data };
  if (!v.showOpenPositions) { v.showEntryPrices = false; v.showPositionSizes = false; }
  await db.insert(schema.privacySettings).values({ userId: s.user.id, ...v }).onConflictDoUpdate({ target: schema.privacySettings.userId, set: v });
  await audit("privacy.updated", { actorId: s.user.id, targetType: "user", targetId: s.user.id, meta: v });
  revalidatePath("/app/settings/profile");
  return { ok: true, message: "Privacy saved." };
}

const instrumentIds = instrumentChoices.map((i) => i.id) as [string, ...string[]];
const prefsSchema = z.object({
  timezone: z.string().refine(isTimeZone, "Unknown time zone."),
  instruments: z.array(z.enum(instrumentIds)).min(1, "Choose at least one market."),
  density: z.enum(["comfortable", "compact"]),
  defaultTimeframe: z.enum(["4H", "1H", "15M"]),
  showSessions: z.boolean(),
  startPage: z.enum(["dashboard", "markets", "journal"]),
  aiConsent: z.boolean(),
});

export async function updatePreferences(input: z.input<typeof prefsSchema>): Promise<ActionResult> {
  const s = await requireUser();
  const p = prefsSchema.safeParse(input);
  if (!p.success) return fail(first(p.error));
  const { timezone, instruments, aiConsent, ...dashboardPrefs } = p.data;
  const [cur] = await db.select({ ai: schema.profile.aiConsentAt }).from(schema.profile).where(eq(schema.profile.userId, s.user.id));
  await db.update(schema.profile).set({ timezone, instruments: [...new Set(instruments)], dashboardPrefs, aiConsentAt: aiConsent ? (cur?.ai ?? new Date()) : null }).where(eq(schema.profile.userId, s.user.id));
  revalidatePath("/app", "layout");
  return { ok: true, message: "Preferences saved." };
}

export async function beginTrial(): Promise<ActionResult> {
  const s = await requireUser();
  const r = await startTrial(s.user.id);
  revalidatePath("/app", "layout");
  return r.ok ? { ok: true, message: "Your Premium trial has started." } : fail("The Premium trial has already been used on this account.");
}
