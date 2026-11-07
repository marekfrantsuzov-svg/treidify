"use client";

import { Check, Clock3, Lock, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Glass } from "@/components/ui/glass";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type State = "pending" | "expired" | "suspended" | "revoked";

const COPY: Record<State, { title: string; body: string[]; badge: string }> = {
  pending: {
    title: "You're on the Treidify Waitlist",
    body: [
      "Treidify is currently at full capacity while we prepare for our next group of members.",
      "Your registration has been received. We'll notify you by email when a spot becomes available and you can activate your subscription.",
    ],
    badge: "Registration received",
  },
  expired: {
    title: "Your Treidify Access Has Expired",
    body: ["Your complimentary access period has ended. We'll notify you when subscriptions become available.", "Your account, journal and trading history are kept."],
    badge: "Access ended",
  },
  suspended: {
    title: "Your Treidify access is paused",
    body: ["This account is currently suspended. Your data is kept.", "If you think this is a mistake, please contact Treidify support."],
    badge: "Account suspended",
  },
  revoked: {
    title: "Your Treidify access has ended",
    body: ["Access for this account has been removed. Your account and data are kept.", "We'll notify you by email if your access is renewed."],
    badge: "Access removed",
  },
};

export function WaitlistScreen({ state, email, homeUrl }: { state: State; email: string; homeUrl: string }) {
  const c = COPY[state];
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const Icon = state === "pending" ? Check : state === "expired" ? Clock3 : Lock;
  return (
    <Glass strong className="relative overflow-hidden p-7 text-center shadow-[var(--shadow-lg)] sm:p-9">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent)_32%,transparent),transparent)] blur-2xl" />
      <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-white shadow-[0_10px_30px_-8px_var(--accent-glow)]">
        <Icon className="h-7 w-7" strokeWidth={2.4} aria-hidden />
      </div>
      <p className={cn("relative mt-5 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12px] font-medium", state === "pending" ? "text-up" : "text-ink-2")} data-testid="waitlist-state" data-state={state}>
        <span className={cn("h-1.5 w-1.5 rounded-full", state === "pending" ? "bg-[var(--up)]" : "bg-[var(--text-3)]")} aria-hidden />
        {c.badge}
      </p>
      <h1 className="relative mt-4 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[30px]">{c.title}</h1>
      <div className="relative mx-auto mt-3 grid max-w-[380px] gap-2 text-[15px] leading-relaxed text-ink-2">
        {c.body.map((t) => <p key={t}>{t}</p>)}
      </div>
      <div className="inset relative mx-auto mt-6 w-fit max-w-full rounded-full px-4 py-2 text-[13.5px] text-ink-2">
        Registered email: <span className="font-medium text-ink break-all">{email}</span>
      </div>
      <div className="relative mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
        <a href={homeUrl} className={buttonClass("primary", "md", "w-full sm:w-auto")}>Back to Homepage</a>
        <button
          type="button"
          disabled={busy}
          onClick={async () => { setBusy(true); await authClient.signOut(); router.replace("/login"); router.refresh(); }}
          className={buttonClass("ghost", "md", "w-full sm:w-auto")}
        >
          <LogOut className="h-4 w-4" aria-hidden />Sign out
        </button>
      </div>
    </Glass>
  );
}
