"use client";

import { ArrowRight, Check, Minus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { annualPerMonth, paidPlans, TRIAL_DAYS, type BillingInterval, type PaidPlanId } from "@/config/plans";
import { cn } from "@/lib/cn";
import { SlidingPill } from "@/components/ui/sliding-pill";

const usd = (v: number) => `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`;

const COMPARE: { label: string; essential: boolean | string; premium: boolean | string }[] = [
  { label: "Connected MT4 / MT5 accounts", essential: "1", premium: "2" },
  { label: "Account analytics and equity curve", essential: true, premium: true },
  { label: "Account Health score", essential: true, premium: true },
  { label: "Trading journal and calendar", essential: true, premium: true },
  { label: "Markets, charts, supply and demand zones", essential: true, premium: true },
  { label: "AI market analysis", essential: false, premium: true },
  { label: "AI Coach and AI chat", essential: false, premium: true },
  { label: "AI chart screenshot analysis", essential: false, premium: true },
  { label: "News intelligence", essential: false, premium: true },
  { label: "Macro Desk", essential: false, premium: true },
];

/**
 * Essential and Premium with a monthly / annual switch, a comparison and the trial disclosure. On the website the
 * buttons lead to sign-up with the choice kept; inside the app (`onChoose`) they start secure checkout.
 */
export function PricingCards({ onChoose, busy, current, compare = true }: { onChoose?: (plan: PaidPlanId, interval: BillingInterval) => void; busy?: string | null; current?: string; compare?: boolean }) {
  const [interval, setInterval] = useState<BillingInterval>("annual");
  return (
    <div>
      <div className="flex justify-center">
        <div role="radiogroup" aria-label="Billing period" className="glass relative inline-flex rounded-full p-1">
          <SlidingPill watch={interval} className="pill-violet rounded-full" />
          {(["monthly", "annual"] as const).map((a) => (
            <button key={a} role="radio" aria-checked={interval === a} data-active={interval === a} onClick={() => setInterval(a)} className={cn("relative z-[1] min-h-11 rounded-full px-5 text-sm font-medium text-ink-2 transition-[color,transform] duration-200 hover:text-ink active:scale-[0.97]", interval === a && "text-white hover:text-white")}>
              {a === "annual" ? <>Annual <span className={cn("ml-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold", interval === a ? "bg-white/20" : "bg-accent-soft text-accent")}>−32%</span></> : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2 md:gap-5">
        {paidPlans.map((p) => {
          const featured = p.id === "premium";
          const annual = interval === "annual";
          const key = `${p.id}:${interval}`;
          const isCurrent = current === p.id;
          return (
            <article key={p.id} className={cn("dcard price-card flex flex-col p-6 sm:p-7", featured && "grad-border price-featured")}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{p.name}</h3>
                {featured && <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent">Most complete</span>}
              </div>
              <p className="mt-1 text-[14px] text-ink-2">{p.tagline}</p>
              <div className="mt-5 flex items-end gap-2">
                <span className="num text-[44px] font-semibold leading-none tracking-[-0.03em] text-ink">{usd(annual ? annualPerMonth(p) : p.monthly)}</span>
                <span className="pb-1 text-[14px] text-ink-3">/ month</span>
              </div>
              <p className="num mt-1.5 min-h-5 text-[13px] text-ink-3">{annual ? <>{usd(p.annual)} billed yearly · save {usd(Math.round((p.monthly * 12 - p.annual) * 100) / 100)}</> : "Billed monthly"}</p>
              <ul className="mt-5 grid gap-2.5">
                {p.highlights.map((h) => <li key={h} className="flex gap-2.5 text-[14px] text-ink-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{h}</li>)}
                {p.excluded.map((h) => <li key={h} className="flex gap-2.5 text-[14px] text-ink-3"><Minus className="mt-0.5 h-4 w-4 shrink-0" />{h}</li>)}
              </ul>
              <div className="mt-auto pt-6">
                {onChoose ? (
                  <button type="button" disabled={!!busy || isCurrent} onClick={() => onChoose(p.id, interval)} className={cn("press inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold disabled:opacity-60", featured ? "bg-brand text-white" : "border border-line text-ink hover:bg-[var(--surface-inset)]")}>
                    {isCurrent ? "Current plan" : busy === key ? "Opening checkout…" : <>Start {TRIAL_DAYS}-day trial<ArrowRight className="h-4 w-4" /></>}
                  </button>
                ) : (
                  <Link href={`/signup?plan=${p.id}&interval=${interval}`} className={cn("press inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold", featured ? "bg-brand ed-cta text-white" : "border border-line text-ink hover:bg-[var(--surface-inset)]")}>
                    Start {TRIAL_DAYS}-day trial<ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="mx-auto mt-5 max-w-2xl text-center text-[12.5px] leading-relaxed text-ink-3">
        Every plan starts with a {TRIAL_DAYS}-day trial. A card is required. You are not charged during the trial; after {TRIAL_DAYS} days the plan you chose renews automatically
        {" "}({interval === "annual" ? "yearly" : "monthly"}) until you cancel. Cancel any time before the trial ends and you pay nothing. One trial per person. Prices in USD; taxes may apply.
      </p>

      {compare && (
        <div className="mx-auto mt-10 max-w-4xl overflow-x-auto">
          <table className="dcard w-full min-w-[520px] text-left text-[14px]">
            <caption className="sr-only">Compare Essential and Premium</caption>
            <thead><tr className="text-ink-3"><th className="px-5 py-3.5 font-medium">Included</th><th className="px-5 py-3.5 text-center font-medium">Essential</th><th className="px-5 py-3.5 text-center font-medium text-ink">Premium</th></tr></thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <td className="px-5 py-3 text-ink-2">{r.label}</td>
                  {(["essential", "premium"] as const).map((k) => (
                    <td key={k} className="px-5 py-3 text-center">{typeof r[k] === "string" ? <span className="num font-semibold text-ink">{r[k]}</span> : r[k] ? <Check className="mx-auto h-4 w-4 text-accent" aria-label="Included" /> : <Minus className="mx-auto h-4 w-4 text-ink-3" aria-label="Not included" />}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
