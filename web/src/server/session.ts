import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { db, schema } from "./db";
import { isStaff, memberAccess } from "./membership/access";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** For authenticated pages: redirects to sign-in when there is no session. */
export async function requireUser(next?: string) {
  const s = await getSession();
  if (!s) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return s;
}

/**
 * For every page inside the application: signed in, onboarded, AND allowed in by membership (owner, approved with
 * current access, or a paid subscription). Pending, expired, suspended and revoked accounts go to /waitlist.
 * Checked on every request from the database, so expiry and suspension apply immediately.
 */
export async function requireOnboarded(next?: string) {
  const s = await requireUser(next);
  const [p] = await db.select().from(schema.profile).where(eq(schema.profile.userId, s.user.id));
  if (!p?.onboardedAt) redirect("/onboarding");
  const access = await memberAccess(s.user.id);
  if (!access.allowed) redirect("/waitlist");
  return { ...s, profile: p, access };
}

/** For server actions that change or read member data: same gate as pages, without needing the profile. */
export async function requireMember() {
  const s = await requireUser();
  const access = await memberAccess(s.user.id);
  if (!access.allowed) redirect("/waitlist");
  return { ...s, access };
}

/**
 * For API routes: the session when the caller is a member with current access, otherwise the HTTP status to return
 * (401 signed out, 403 waiting for approval, expired or suspended).
 */
export async function apiMember(): Promise<{ ok: true; session: NonNullable<Awaited<ReturnType<typeof getSession>>> } | { ok: false; status: 401 | 403; error: string }> {
  const s = await getSession();
  if (!s) return { ok: false, status: 401, error: "Sign in first." };
  const access = await memberAccess(s.user.id);
  if (!access.allowed) return { ok: false, status: 403, error: "Your Treidify access is not active." };
  return { ok: true, session: s };
}

/** Owner or admin (the Members panel). Everyone else is sent back to the app; the server actions check again. */
export async function requireStaff() {
  const s = await requireOnboarded("/app/settings/members");
  if (!isStaff(s.access)) redirect("/app");
  return s;
}


