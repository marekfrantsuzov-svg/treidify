import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { db, schema } from "./db";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** For authenticated pages: redirects to sign-in when there is no session. */
export async function requireUser(next?: string) {
  const s = await getSession();
  if (!s) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return s;
}

export async function requireOnboarded(next?: string) {
  const s = await requireUser(next);
  const [p] = await db.select().from(schema.profile).where(eq(schema.profile.userId, s.user.id));
  if (!p?.onboardedAt) redirect("/onboarding");
  return { ...s, profile: p };
}

export async function requireAdmin() {
  const s = await requireUser("/admin");
  if (s.user.role !== "admin") redirect("/app");
  return s;
}
