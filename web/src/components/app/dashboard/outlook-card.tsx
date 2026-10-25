import type { OutlookLine } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { GlassIcon } from "@/components/icons/glass-icon";
import { Glass } from "@/components/ui/glass";
import { SampleBadge } from "@/components/ui/pill";

const dot: Record<OutlookLine["tone"], string> = { up: "bg-up", down: "bg-down", warn: "bg-warn", neutral: "bg-[var(--accent)]" };

/** Today's outlook: clock, structure and the user's own trades. Deterministic, never a price prediction. */
export function OutlookCard({ lines, date, sample }: { lines: OutlookLine[]; date: string; sample: string | null }) {
  return (
    <Glass className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <GlassIcon name="spark" size={32} />
        <h2 className="text-[15px] font-semibold text-ink">Today’s outlook</h2>
        <span className="text-xs text-ink-3">{date}</span>
        {sample && <SampleBadge label={sample} className="ml-auto" />}
      </div>
      <ul className="mt-3 grid gap-x-6 gap-y-2.5 md:grid-cols-2">
        {lines.map((l) => (
          <li key={l.label} className="flex gap-2.5 text-sm leading-snug">
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot[l.tone])} aria-hidden />
            <span><span className="font-semibold text-ink">{l.label}. </span><span className="text-ink-2">{l.text}</span></span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-ink-3">Educational analysis from the clock, market structure and your own trades. Not financial advice and not a forecast.</p>
    </Glass>
  );
}
