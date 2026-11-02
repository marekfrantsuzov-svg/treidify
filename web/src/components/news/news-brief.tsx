"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { explainNews, type BriefResult } from "@/server/actions/news";
import { Spinner } from "@/components/auth/auth-ui";

/** "Explain with AI" for one story: reported facts and AI interpretation are labelled separately. */
export function NewsBrief({ id, enabled }: { id: string; enabled: boolean }) {
  const [r, setR] = useState<BriefResult | null>(null);
  const [pending, start] = useTransition();
  if (!enabled) return null;
  if (!r) {
    return (
      <button type="button" disabled={pending} onClick={() => start(async () => setR(await explainNews(id)))} className="press ml-5 mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-accent hover:bg-accent-soft disabled:opacity-60">
        {pending ? <Spinner /> : <Sparkles className="h-3.5 w-3.5" />}Explain with AI
      </button>
    );
  }
  if (!r.ok) return <p className="ml-5 mt-1 text-[12px] text-down" role="status">{r.error}</p>;
  const b = r.brief;
  return (
    <div className="inset ml-5 mt-1.5 grid gap-2 rounded-2xl p-3 text-[12.5px] leading-relaxed text-ink-2">
      <div><span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Reported</span><p className="text-ink">{b.whatHappened}</p></div>
      <div className="grid gap-1.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-accent">AI interpretation · not advice</span>
        <p><b className="font-semibold text-ink">Why it matters.</b> {b.whyItMatters}</p>
        {b.instruments.length > 0 && <p className="flex flex-wrap items-center gap-1"><b className="font-semibold text-ink">May affect</b>{b.instruments.map((i) => <span key={i} className="rounded-full bg-accent-soft px-1.5 py-px text-[11px] font-semibold text-accent">{i}</span>)}</p>}
        <p><b className="font-semibold text-up">Bullish reading.</b> {b.bullishCase}</p>
        <p><b className="font-semibold text-down">Bearish reading.</b> {b.bearishCase}</p>
        {b.uncertain.length > 0 && <p><b className="font-semibold text-ink">Still unknown.</b> {b.uncertain.join(" ")}</p>}
      </div>
      <p className="text-[10.5px] text-ink-3">Written by Claude from the headline and summary only, {new Date(r.generatedAt).toLocaleString()}. Read the original article before acting.</p>
    </div>
  );
}
