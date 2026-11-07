"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import type { BillingInterval, PaidPlanId, PlanId } from "@/config/plans";
import { Alert, Spinner } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Section } from "./ui";

const NAME: Record<PlanId, string> = { free: "No plan", essential: "Essential", premium: "Premium" };

export function PlanPanel({ plan, source, trialEndsAt, accessEndsAt = null, renewsAt, cancelAtPeriodEnd, billing, timezone, notice }: {
  plan: PlanId; source: string; trialEndsAt: string | null; accessEndsAt?: string | null; renewsAt: string | null; cancelAtPeriodEnd: boolean; billing: boolean; timezone: string; notice: string | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: timezone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const go = async (path: string, body?: unknown, key = path) => {
    setErr(null); setBusy(key);
    try {
      const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (j.url) { window.location.assign(j.url); return; }
      setErr(j.error ?? "Something went wrong. Please try again.");
    } catch { setErr("You appear to be offline."); }
    setBusy(null);
  };
  const choose = (p: PaidPlanId, i: BillingInterval) => go("/api/billing/checkout", { plan: p, interval: i }, `${p}:${i}`);

  return (
    <div className="grid gap-4">
      {notice && <Alert tone="accent">{notice}</Alert>}
      <Section title="Your plan">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-semibold tracking-[-0.02em] text-ink">{NAME[plan]}</span>
          {trialEndsAt && <Pill tone="accent">Trial</Pill>}
        </div>
        <p className="mt-2 text-sm text-ink-2">
          {plan === "free" && "Choose Essential or Premium below. Each starts with a 3-day trial."}
          {source === "trial" && trialEndsAt && <>Your free trial ends {fmt(trialEndsAt)}. No card was taken and nothing is charged.</>}
          {source === "stripe" && trialEndsAt && <>Trial until {fmt(trialEndsAt)}. {cancelAtPeriodEnd ? "It will not renew." : "Your card is charged then, unless you cancel before."}</>}
          {source === "stripe" && !trialEndsAt && renewsAt && <>{cancelAtPeriodEnd ? `Ends ${fmt(renewsAt)} and will not renew.` : `Renews ${fmt(renewsAt)}.`}</>}
          {source === "grant" && (accessEndsAt ? <>Complimentary access from Treidify until {fmt(accessEndsAt)}. No payment is taken.</> : "Complimentary access from Treidify, with no end date. No payment is taken.")}
        </p>
        {source === "stripe" && (
          <div className="mt-4">
            <Button onClick={() => go("/api/billing/portal")} disabled={!!busy}>{busy === "/api/billing/portal" ? <Spinner /> : <ExternalLink className="h-4 w-4" />}Manage billing</Button>
            <p className="mt-2 text-[12.5px] text-ink-3">Change plan, update your card, see invoices or cancel, on Stripe&apos;s secure page.</p>
          </div>
        )}
        {err && <div className="mt-3"><Alert tone="down">{err}</Alert></div>}
      </Section>

      {source !== "stripe" && (
        <Section title="Plans">
          {!billing && <p className="mb-4 text-sm text-ink-3">Checkout opens shortly. Nobody is ever charged without choosing a plan and confirming payment.</p>}
          <PricingCards onChoose={billing ? choose : undefined} busy={busy} current={source === "grant" ? plan : undefined} compare={false} />
        </Section>
      )}
    </div>
  );
}
