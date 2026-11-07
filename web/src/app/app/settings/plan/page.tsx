import { desc, eq } from "drizzle-orm";
import { PlanPanel } from "@/components/settings/plan-panel";
import { stripeStatus } from "@/server/billing/stripe";
import { db, schema } from "@/server/db";
import { getPlanState } from "@/server/entitlements";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Plan" };

export default async function Plan({ searchParams }: { searchParams: Promise<{ checkout?: string; start?: string }> }) {
  const s = await requireOnboarded("/app/settings/plan");
  const sp = await searchParams;
  const [p, [sub]] = await Promise.all([
    getPlanState(s.user.id),
    db.select().from(schema.subscription).where(eq(schema.subscription.userId, s.user.id)).orderBy(desc(schema.subscription.updatedAt)).limit(1),
  ]);
  const notice = sp.checkout === "success" ? "Thank you. Your plan is being activated; this page updates within a few seconds." : sp.checkout === "cancelled" ? "Checkout was cancelled. Nothing was charged." : sp.start ? "Pick a plan to start your 3-day trial." : null;
  return (
    <PlanPanel plan={p.plan} source={p.source} trialEndsAt={p.trialEndsAt?.toISOString() ?? null} accessEndsAt={p.accessEndsAt?.toISOString() ?? null}
      renewsAt={sub?.currentPeriodEnd?.toISOString() ?? null} cancelAtPeriodEnd={sub?.cancelAtPeriodEnd ?? false}
      billing={stripeStatus().configured} timezone={s.profile.timezone} notice={notice} />
  );
}
