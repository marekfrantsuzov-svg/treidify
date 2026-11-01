import { ArrowDownRight, ArrowUpRight, CircleAlert, Layers, Magnet, Ruler, ShieldAlert } from "lucide-react";
import type { ChartReading } from "@/server/ai/schema";
import { cn } from "@/lib/cn";

const trendTone = { bullish: "text-up", bearish: "text-down", ranging: "text-ink-2", unclear: "text-ink-3" } as const;

/** Structured report for one AI chart reading. Everything here came from the image; nothing is presented as live data. */
export function ChartReport({ r, at }: { r: ChartReading; at: string }) {
  if (!r.legible) return <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-ink">This image doesn’t look like a readable price chart, so nothing was analysed. Try a clearer screenshot with the price axis visible.</p>;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <span className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">AI analysis of your screenshot</span>
        {r.instrument && <span>{r.instrument}</span>}{r.timeframe && <span>· {r.timeframe}</span>}
        <span>· {new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <p className="text-[15px] leading-relaxed text-ink">{r.summary}</p>
      <section className="inset rounded-2xl p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><Layers className="h-4 w-4 text-accent" />Structure: <span className={cn("capitalize", trendTone[r.structure.trend])}>{r.structure.trend}</span></h3>
        <ul className="mt-2 grid gap-1 text-sm text-ink-2">{r.structure.evidence.map((e, i) => <li key={i}>• {e}</li>)}</ul>
      </section>
      {r.levels.length > 0 && (
        <section className="inset rounded-2xl p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><Ruler className="h-4 w-4 text-accent" />Visible levels</h3>
          <ul className="mt-2 grid gap-1.5 text-sm">{r.levels.map((l, i) => (
            <li key={i} className="flex items-baseline gap-2"><span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-3">{l.kind}</span><span className="num w-20 shrink-0 font-medium text-ink">{l.price ?? "not legible"}</span><span className="text-ink-2">{l.description}</span></li>
          ))}</ul>
        </section>
      )}
      {(r.liquidity.length > 0 || r.fibonacci) && (
        <section className="inset rounded-2xl p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><Magnet className="h-4 w-4 text-accent" />Liquidity and Fibonacci</h3>
          <ul className="mt-2 grid gap-1 text-sm text-ink-2">{r.liquidity.map((e, i) => <li key={i}>• {e}</li>)}{r.fibonacci && <li>• {r.fibonacci}</li>}</ul>
        </section>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {r.scenarios.map((s, i) => (
          <section key={i} className={cn("rounded-2xl border p-4", s.bias === "bullish" ? "border-[color-mix(in_oklab,var(--up)_30%,transparent)] bg-up-soft" : "border-[color-mix(in_oklab,var(--down)_30%,transparent)] bg-down-soft")}>
            <h3 className={cn("flex items-center gap-1.5 text-sm font-semibold", s.bias === "bullish" ? "text-up" : "text-down")}>{s.bias === "bullish" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{s.bias === "bullish" ? "Bullish scenario" : "Bearish scenario"}</h3>
            <dl className="mt-2 grid gap-1.5 text-sm"><div><dt className="text-xs text-ink-3">Confirmation</dt><dd className="text-ink">{s.trigger}</dd></div><div><dt className="text-xs text-ink-3">Next area</dt><dd className="text-ink">{s.target}</dd></div><div><dt className="flex items-center gap-1 text-xs text-ink-3"><ShieldAlert className="h-3 w-3" />Invalidation</dt><dd className="text-ink">{s.invalidation}</dd></div></dl>
          </section>
        ))}
      </div>
      <section className="rounded-2xl bg-warn-soft p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><CircleAlert className="h-4 w-4 text-warn" />What the screenshot can’t tell us</h3>
        <ul className="mt-2 grid gap-1 text-sm text-ink-2">{r.uncertainty.map((e, i) => <li key={i}>• {e}</li>)}</ul>
      </section>
      <p className="text-xs text-ink-3">Analysis, not advice. It describes the image you uploaded and was not checked against live prices.</p>
    </div>
  );
}
