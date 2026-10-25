"use server";

import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { isTimeZone, usernameSchema } from "@/lib/validation";
import { experienceChoices, instrumentChoices, ONBOARDING_STEPS } from "@/config/onboarding";
import { audit } from "../audit";
import { auth } from "../auth";
import { db, schema } from "../db";
import { startTrial } from "../entitlements";
import { requireUser } from "../session";

const instrumentIds = instrumentChoices.map((i) => i.id) as [string, ...string[]];
const experienceIds = experienceChoices.map((e) => e.id) as [(typeof experienceChoices)[number]["id"], ...(typeof experienceChoices)[number]["id"][]];


const stepSchema = z.discriminatedUnion("step", [
  z.object({ step: z.literal(1), name: z.string().trim().min(1, "Enter your name.").max(60), username: usernameSchema }),
  z.object({ step: z.literal(2), experience: z.enum(experienceIds) }),
  z.object({ step: z.literal(3), instruments: z.array(z.enum(instrumentIds)).min(1, "Choose at least one market.").max(instrumentIds.length) }),
  z.object({ step: z.literal(4), timezone: z.string().refine(isTimeZone, "Unknown time zone.") }),
  z.object({ step: z.literal(5), density: z.enum(["comfortable", "compact"]), defaultTimeframe: z.enum(["4H", "1H", "15M"]), showSessions: z.boolean(), startPage: z.enum(["dashboard", "markets", "journal"]) }),
  z.object({ step: z.literal(6), choice: z.literal("later") }),
  z.object({ step: z.literal(7), riskAcknowledged: z.literal(true, { error: "Please confirm the risk acknowledgement." }), aiConsent: z.boolean(), startTrial: z.boolean() }),
]);

export type StepInput = z.input<typeof stepSchema>;
export type StepResult = { ok: true; next: number; done?: boolean } | { ok: false; error: string; field?: string };

export async function saveOnboardingStep(input: StepInput): Promise<StepResult> {
  const s = await requireUser("/onboarding");
  const parsed = stepSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Please check this step.", field: issue?.path[0]?.toString() };
  }
  const d = parsed.data;
  const uid = s.user.id;
  const P = schema.profile;
  const advance = (n: number) => db.update(P).set({ onboardingStep: sql`greatest(${P.onboardingStep}, ${n})` }).where(eq(P.userId, uid));

  switch (d.step) {
    case 1: {
      const lower = d.username.toLowerCase();
      if (lower !== s.user.username) {
        const avail = await auth.api.isUsernameAvailable({ body: { username: d.username } });
        if (!avail.available) return { ok: false, error: "That username is taken.", field: "username" };
      }
      await auth.api.updateUser({ headers: await headers(), body: { name: d.name, username: d.username } });
      break;
    }
    case 2: await db.update(P).set({ experience: d.experience }).where(eq(P.userId, uid)); break;
    case 3: await db.update(P).set({ instruments: [...new Set(d.instruments)] }).where(eq(P.userId, uid)); break;
    case 4: await db.update(P).set({ timezone: d.timezone }).where(eq(P.userId, uid)); break;
    case 5: {
      const { step: _s, ...prefs } = d;
      await db.update(P).set({ dashboardPrefs: prefs }).where(eq(P.userId, uid));
      break;
    }
    case 6: break;
    case 7: {
      const now = new Date();
      await db.update(P).set({ riskAcknowledgedAt: now, aiConsentAt: d.aiConsent ? now : null, onboardedAt: now, onboardingStep: ONBOARDING_STEPS }).where(eq(P.userId, uid));
      if (d.startTrial) await startTrial(uid);
      await audit("onboarding.completed", { actorId: uid, targetType: "user", targetId: uid, meta: { aiConsent: d.aiConsent, trial: d.startTrial } });
      return { ok: true, next: ONBOARDING_STEPS, done: true };
    }
  }
  await advance(d.step);
  return { ok: true, next: d.step + 1 };
}
