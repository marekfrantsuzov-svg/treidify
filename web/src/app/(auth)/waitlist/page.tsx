import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { WaitlistScreen } from "@/components/membership/waitlist-screen";
import { site } from "@/config/site";
import { db, schema } from "@/server/db";
import { loadAccess } from "@/server/membership/access";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Treidify Waitlist", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Where every signed-in account without current access lands: pending (waitlist), expired, suspended or revoked.
 * The state comes from the database on each request; members with access are sent on to the app.
 */
export default async function Waitlist() {
  const s = await requireUser("/waitlist");
  const [p] = await db.select({ onboardedAt: schema.profile.onboardedAt }).from(schema.profile).where(eq(schema.profile.userId, s.user.id));
  if (!p?.onboardedAt) redirect("/onboarding");
  const a = await loadAccess(s.user.id);
  if (a.allowed) redirect("/app");
  const state = a.state === "expired" || a.state === "suspended" || a.state === "revoked" ? a.state : "pending";
  return <WaitlistScreen state={state} email={s.user.email} homeUrl={site.url} />;
}
