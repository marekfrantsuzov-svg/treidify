"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { plans, pricesAreFinal, TRIAL_HOURS } from "@/config/plans";
import { cn } from "@/lib/cn";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { ButtonLink } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { Pill } from "@/components/ui/pill";

export function PricingCards() {
  const [annual, setAnnual] = useState(true);
  return (
    <div>
      <div className={cn("flex justify-center", !pricesAreFinal && "hidden")}>
        <div role="radiogroup" aria-label="Billing period" className="glass relative inline-flex rounded-full p-1">
          <SlidingPill watch={annual} className="bg-brand rounded-full shadow-[0_6px_16px_-6px_var(--accent-glow)]" />
          {[false, true].map((a) => (
            <button key={String(a)} role="radio" aria-checked={annual === a} data-active={annual === a} onClick={() => setAnnual(a)} className={cn("relative z-[1] rounded-full px-5 py-2 text-sm font-medium text-ink-2 transition-[color,transform] duration-200 hover:text-ink active:scale-[0.97]", annual === a && "text-white hover:text-white")}>
              {a ? "Annual" : "Monthly"}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
        {plans.map((p) => {
          const premium = p.id === "premium";
          const price = annual ? p.annual : p.monthly;
          return (
            <Glass key={p.id} className={cn("flex flex-col p-7", premium && "ring-2 ring-[var(--accent)]")}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-ink">{p.name}</h3>
                {premium && <Pill tone="accent">{TRIAL_HOURS}-hour free trial</Pill>}
              </div>
              <p className="mt-2 text-sm text-ink-2">{p.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1">
                {premium && !pricesAreFinal ? (
                  <span className="text-3xl font-semibold tracking-[-0.03em] text-ink">Price announced at launch</span>
                ) : (
                  <>
                    <span className="num text-5xl font-semibold tracking-[-0.03em] text-ink">${price}</span>
                    <span className="text-sm text-ink-3">{premium ? (annual ? "/ year" : "/ month") : "forever"}</span>
                  </>
                )}
              </div>
              {premium && pricesAreFinal && annual && p.monthly && p.annual ? (
                <p className="mt-1 text-xs text-up">Save {Math.round((1 - p.annual / (p.monthly * 12)) * 100)}% versus monthly</p>
              ) : <p className="mt-1 text-xs text-transparent">.</p>}
              <ul className="mt-6 grid flex-1 gap-3">
                {p.highlights.map((h) => (
                  <li key={h} className="flex gap-3 text-sm text-ink">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {h}
                  </li>
                ))}
              </ul>
              <ButtonLink href={premium ? "/signup?trial=1" : "/signup"} variant={premium ? "primary" : "secondary"} className="mt-8 w-full">
                {premium ? `Start ${TRIAL_HOURS}-hour trial, no card` : "Create free account"}
              </ButtonLink>
              {premium && <p className="mt-3 text-center text-xs text-ink-3">The trial ends on its own. Nothing is charged unless you choose a plan.</p>}
            </Glass>
          );
        })}
      </div>
      {!pricesAreFinal && <p className="mt-6 text-center text-xs text-ink-3">Premium pricing is being finalised. You can try every Premium feature now with the 72-hour trial, no card needed.</p>}
    </div>
  );
}
