import { MessageSquareText } from "lucide-react";
import Link from "next/link";
import { sampleAnalysis } from "@/lib/demo/markets";
import { Sparkline } from "@/components/charts/sparkline";
import { Glass } from "@/components/ui/glass";
import { Pill, SampleBadge } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { InstrumentIcon } from "./parts";

const rows = [
  { s: "XAUUSD", name: "Gold", for: "1H higher highs and lows above EMA(50)", against: "Dollar firm on the day" },
  { s: "DXY", name: "US Dollar Index", for: "Lower highs on 4H", against: "Yields edging higher" },
  { s: "XAGUSD", name: "Silver", for: "Confirms gold's 4H direction", against: "Range-bound on 1H" },
] as const;

export const ASK_EXAMPLES = [
  "Why is gold falling even though DXY is falling?",
  "What would invalidate the current bullish gold scenario?",
  "What is the relationship between rising real yields and gold?",
  "What is the most important macro risk today?",
];

export function MacroPreview({ className }: { className?: string }) {
  return (
    <Glass className={cn("p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-ink">Macro Desk</h3>
        <SampleBadge />
      </div>
      <div className="mt-3 grid gap-2">
        {rows.map((r) => {
          const a = sampleAnalysis(r.s, "4H");
          const b = a.bias.bias;
          return (
            <div key={r.s} className="inset grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl p-3 sm:grid-cols-[auto_1fr_96px_auto]">
              <InstrumentIcon symbol={r.s} />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{r.name}</div>
                <div className="truncate text-xs text-ink-3"><span className="text-up">For:</span> {r.for} · <span className="text-down">Against:</span> {r.against}</div>
              </div>
              <Sparkline values={a.candles.slice(-40).map((c) => c.c)} up={a.change >= 0} className="hidden h-8 w-24 sm:block" width={96} height={32} />
              <Pill tone={b === "bullish" ? "up" : b === "bearish" ? "down" : "neutral"} className="capitalize">{b === "insufficientData" ? "No data" : b}</Pill>
            </div>
          );
        })}
        <div className="grid grid-cols-2 gap-2">
          <div className="inset rounded-2xl p-3"><div className="text-xs text-ink-3">US 10Y yield</div><div className="num text-base font-semibold text-ink">4.12% <span className="text-xs text-down">+3 bp</span></div></div>
          <div className="inset rounded-2xl p-3"><div className="text-xs text-ink-3">US 10Y real yield</div><div className="num text-base font-semibold text-ink">1.78% <span className="text-xs text-down">+2 bp</span></div></div>
        </div>
        <div className="inset rounded-2xl p-3 text-xs text-ink-2"><span className="font-semibold text-ink">Regime:</span> Risk-neutral, dollar firm, real yields slightly higher. Confidence shown as evidence for and against, not as a probability.</div>
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><MessageSquareText className="h-4 w-4 text-accent" /> Ask the Macro Desk</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ASK_EXAMPLES.slice(0, 3).map((q) => (
            <Link key={q} href="/signup" className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-2 transition-colors hover:border-accent hover:text-ink">{q}</Link>
          ))}
        </div>
      </div>
    </Glass>
  );
}
