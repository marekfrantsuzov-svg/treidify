import { ArrowDownRight, ArrowUpRight, CheckCircle2, CircleDashed, Clock, ExternalLink, Minus } from "lucide-react";
import { Glass } from "@/components/ui/glass";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { InstrumentIcon } from "./parts";

const factors = [
  { label: "Safe-haven demand", state: "supports", note: "Risk assets weaker on the headline" },
  { label: "US dollar (DXY)", state: "conflicts", note: "Dollar also bid as a haven" },
  { label: "US 10Y real yield", state: "neutral", note: "Little change so far" },
  { label: "Already priced in?", state: "unknown", note: "Escalation was partly expected" },
] as const;

const icon = { supports: CheckCircle2, conflicts: ArrowDownRight, neutral: Minus, unknown: CircleDashed };
const tone = { supports: "text-up", conflicts: "text-down", neutral: "text-ink-3", unknown: "text-warn" };

/** A display example of the event-impact card. It is explicitly not a real event. */
export function EventPreview({ className }: { className?: string }) {
  return (
    <Glass className={cn("p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Pill tone="down">Global risk event</Pill>
        <Pill tone="warn" className="uppercase">Display example · not a real event</Pill>
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug tracking-[-0.01em] text-ink">Escalation between two regional powers disrupts a major shipping route</h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Published 09:42 UTC · updated 10:15 UTC</span>
        <span className="flex items-center gap-1"><ExternalLink className="h-3.5 w-3.5" /> 3 linked sources</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { s: "XAUUSD", label: "Strong bullish pressure", Icon: ArrowUpRight, t: "text-up" },
          { s: "DXY", label: "Mild bullish pressure", Icon: ArrowUpRight, t: "text-up" },
          { s: "XAGUSD", label: "Mixed", Icon: Minus, t: "text-ink-2" },
        ].map(({ s, label, Icon, t }) => (
          <div key={s} className="inset flex items-center gap-2.5 rounded-2xl p-3">
            <InstrumentIcon symbol={s} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-ink">{s}</div>
              <div className={cn("flex items-start gap-1 text-xs font-medium leading-snug", t)}><Icon className="mt-px h-3.5 w-3.5 shrink-0" />{label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="inset rounded-xl p-2"><div className="text-ink-3">Horizon</div><div className="font-semibold text-ink">Medium term</div></div>
        <div className="inset rounded-xl p-2"><div className="text-ink-3">Status</div><div className="font-semibold text-warn">Conditional</div></div>
        <div className="inset rounded-xl p-2"><div className="text-ink-3">Uncertainty</div><div className="font-semibold text-ink">High</div></div>
      </div>
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">What the assessment checks</div>
        <ul className="mt-2 grid gap-2">
          {factors.map((f) => {
            const I = icon[f.state];
            return (
              <li key={f.label} className="flex items-start gap-2.5 text-[13px]">
                <I className={cn("mt-0.5 h-4 w-4 shrink-0", tone[f.state])} />
                <span><span className="font-medium text-ink">{f.label}:</span> <span className="text-ink-2">{f.note}</span></span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">Facts, AI interpretation and scenarios are labelled separately on the full event page. A conflict does not automatically mean higher gold.</p>
    </Glass>
  );
}
