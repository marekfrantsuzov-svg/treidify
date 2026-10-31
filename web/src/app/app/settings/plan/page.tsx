import { PlanPanel } from "@/components/settings/plan-panel";
import { pricesAreFinal } from "@/config/plans";
import { getPlanState } from "@/server/entitlements";
import { billingConfigured } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Plan" };

export default async function Plan() {
  const s = await requireOnboarded("/app/settings/plan");
  const p = await getPlanState(s.user.id);
  return <PlanPanel plan={p.plan} source={p.source} trialAvailable={p.trialAvailable} trialEndsAt={p.trialEndsAt?.toISOString() ?? null} billing={billingConfigured()} pricesFinal={pricesAreFinal} timezone={s.profile.timezone} />;
}
