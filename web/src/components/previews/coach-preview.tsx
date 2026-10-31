"use client";

import { ChevronDown, Sparkles, ThumbsUp, TriangleAlert, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { coachObservations, type Observation } from "@/lib/analytics";
import { sampleTrades } from "@/lib/demo/sample";
import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";
import { Pill, SampleBadge } from "@/components/ui/pill";

const sev: Record<Observation["severity"], { tone: "down" | "warn" | "accent" | "up"; label: string; Icon: typeof Info }> = {
  important: { tone: "down", label: "Important", Icon: TriangleAlert },
  watch: { tone: "warn", label: "Watch", Icon: TriangleAlert },
  info: { tone: "accent", label: "Note", Icon: Info },
  strength: { tone: "up", label: "Doing well", Icon: ThumbsUp },
};

/** Coach observations computed by the real detectors on the sample history (with a rule set to show exceptions). */
export function CoachPreview({ className, limit = 4 }: { className?: string; limit?: number }) {
  const obs = useMemo(() => coachObservations(sampleTrades(), { maxVolumePerTrade: 0.8 }), []);
  const [open, setOpen] = useState<string | null>(obs[0]?.kind ?? null);
  return (
    <Glass className={cn("p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent"><Sparkles className="h-4 w-4" /></span>
          <h3 className="text-[15px] font-semibold text-ink">Weekly coaching review</h3>
        </div>
        <SampleBadge label="Sample account" />
      </div>
      <ul className="mt-4 grid gap-2">
        {obs.slice(0, limit).map((o) => {
          const s = sev[o.severity];
          const isOpen = open === o.kind;
          return (
            <li key={o.kind} className="inset overflow-hidden rounded-2xl">
              <button className="flex w-full items-start gap-3 p-3.5 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.kind)}>
                <s.Icon className={cn("mt-0.5 h-4 w-4 shrink-0", `text-${s.tone === "accent" ? "accent" : s.tone}`)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{o.title}</span>
                    <Pill tone={s.tone}>{s.label}</Pill>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-2">{o.finding}</p>
                </div>
                <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-ink-3 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="border-t border-line px-3.5 pb-3.5 pl-10 pt-3 text-[13px]">
                  <ul className="grid gap-1 text-ink-2">{o.evidence.map((e) => <li key={e}>• {e}</li>)}</ul>
                  <p className="mt-2 text-ink"><span className="font-semibold">Suggestion:</span> {o.suggestion}</p>
                  <p className="mt-2 text-xs text-ink-3">Method: {o.methodology} Sample: {o.sampleSize} trades.</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Glass>
  );
}
