import { ArrowRight, Crown } from "lucide-react";
import Link from "next/link";
import type { Feature } from "@/config/plans";
import { getPlanState, planHas } from "@/server/entitlements";
import { requireOnboarded } from "@/server/session";

const WHAT: Partial<Record<Feature, { title: string; body: string }>> = {
  coach: { title: "AI Coach is part of Premium", body: "Daily, weekly and monthly reviews of your real synced trades, with the patterns that cost you most." },
  "charts.ai": { title: "AI chart analysis is part of Premium", body: "Upload a chart screenshot and get structure, zones and the risk rules read back to you." },
  "news.global": { title: "News intelligence is part of Premium", body: "Headlines that matter for gold and the dollar, with what each one means for your instruments." },
  "macro.advanced": { title: "Macro Desk is part of Premium", body: "Rates, inflation and growth from official US sources, and how they lean for gold." },
};

/**
 * Server-side plan gate for a whole section (used in section layouts). Without the feature the section's content is
 * never rendered or fetched; the person sees what the feature does and how to get it.
 */
export async function PlanGate({ feature, path, children }: { feature: Feature; path: string; children: React.ReactNode }) {
  const s = await requireOnboarded(path);
  const p = await getPlanState(s.user.id);
  if (planHas(p.plan, feature)) return <>{children}</>;
  const w = WHAT[feature] ?? { title: "This is part of a Treidify plan", body: "Start a 3-day trial to use it." };
  return (
    <section className="dcard mx-auto mt-6 max-w-xl p-7 text-center sm:p-9" aria-labelledby="gate-title">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft"><Crown className="h-7 w-7 text-[#f5b301]" fill="currentColor" strokeWidth={1.5} /></span>
      <h1 id="gate-title" className="mt-4 text-[24px] font-semibold tracking-[-0.02em] text-ink">{w.title}</h1>
      <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-2">{w.body}</p>
      <Link href="/app/settings/plan" className="press bg-brand mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white">
        {p.plan === "free" ? "Start 3-day trial" : "Upgrade to Premium"}<ArrowRight className="h-4 w-4" />
      </Link>
      <p className="mt-3 text-[12.5px] text-ink-3">Card required for the trial. Cancel before it ends and nothing is charged.</p>
    </section>
  );
}
