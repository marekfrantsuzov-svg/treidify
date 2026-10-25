"use client";

import { Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { TRIAL_HOURS, plans } from "@/config/plans";
import { beginTrial, type ActionResult } from "@/server/actions/settings";
import { Alert, Spinner } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Section } from "./ui";

export function PlanPanel({ plan, source, trialAvailable, trialEndsAt, billing, pricesFinal, timezone }: {
  plan: "free" | "premium"; source: string; trialAvailable: boolean; trialEndsAt: string | null; billing: boolean; pricesFinal: boolean; timezone: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [r, setR] = useState<ActionResult | null>(null);
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    if (source !== "trial" || !trialEndsAt) return;
    const tick = () => { const ms = new Date(trialEndsAt).getTime() - Date.now(); setLeft(ms > 0 ? `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m` : null); };
    tick(); const t = setInterval(tick, 30_000); return () => clearInterval(t);
  }, [source, trialEndsAt]);
  const premium = plans.find((p) => p.id === "premium")!;

  return (
    <div className="grid gap-4">
      <Section title="Your plan">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-semibold tracking-[-0.02em] text-ink">{plan === "premium" ? "Premium" : "Free"}</span>
          {source === "trial" && <Pill tone="accent">Trial</Pill>}
        </div>
        {source === "trial" && trialEndsAt && (
          <p className="mt-2 text-sm text-ink-2">
            {left ? <><span className="num font-medium text-ink">{left}</span> left. </> : null}
            Ends {new Date(trialEndsAt).toLocaleString("en-GB", { timeZone: timezone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. Your account then returns to Free automatically. Nothing is charged and there is nothing to cancel.
          </p>
        )}
        {plan === "free" && trialAvailable && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={() => start(async () => { const x = await beginTrial(); setR(x); if (x.ok) router.refresh(); })} disabled={pending}>{pending ? <Spinner /> : <Sparkles className="h-4 w-4" />}Start {TRIAL_HOURS}-hour Premium trial</Button>
            <span className="text-sm text-ink-3">Free, no card, one per account.</span>
          </div>
        )}
        {plan === "free" && !trialAvailable && <p className="mt-2 text-sm text-ink-3">Your Premium trial has been used.</p>}
        {r && <div className="mt-3"><Alert tone={r.ok ? "up" : "down"}>{r.ok ? r.message : r.error}</Alert></div>}
      </Section>

      <Section title="Premium" description={premium.tagline}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {premium.highlights.map((h) => <li key={h} className="flex gap-2.5 text-sm text-ink-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{h}</li>)}
        </ul>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="num text-xl font-semibold text-ink">${premium.monthly}<span className="text-sm font-normal text-ink-3"> / month</span></span>
          <span className="num text-sm text-ink-2">or ${premium.annual} / year</span>
          {!pricesFinal && <Pill tone="warn">Proposed price</Pill>}
        </div>
        <p className="mt-3 text-sm text-ink-3">
          {billing ? "Upgrade from here once checkout opens." : "Paid upgrades open when secure checkout is connected. Nobody is ever charged without choosing a plan and confirming payment."}
        </p>
      </Section>
    </div>
  );
}
