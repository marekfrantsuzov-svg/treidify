import type { InstrumentIntel } from "@/lib/intelligence";
import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";
import { biasText, biasTone } from "./gauge";

const NAME: Record<string, string> = { XAUUSD: "Gold · XAUUSD", DXY: "US Dollar Index · DXY", XAGUSD: "Silver · XAGUSD" };
const trendCls = (t: string | null) => (t === "bullish" ? "bg-up-soft text-up" : t === "bearish" ? "bg-down-soft text-down" : "bg-inset text-ink-3");

/** Full, evidence-first breakdown of one instrument: every number here comes from the engine. */
export function InstrumentBreakdown({ i, sample }: { i: InstrumentIntel; sample?: boolean }) {
  const d = i.digits;
  return (
    <Glass className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">{NAME[i.symbol] ?? i.symbol}</h2>
          <p className="text-xs text-ink-3">Engine {i.engine} · calculated {new Date(i.asOf).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}{sample ? " · SAMPLE BARS" : ""}</p>
        </div>
        <div className="text-right"><div className={cn("text-[22px] font-semibold tracking-[-0.02em]", biasTone[i.bias])}>{biasText[i.bias]}</div>
          <div className="num text-xs text-ink-3">{i.score !== null ? `Score ${i.score > 0 ? "+" : ""}${i.score}` : "No score"}{i.confidence ? ` · ${i.confidence} confidence` : ""}</div></div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {(["4H", "1H", "15M", "5M"] as const).map((tf) => (
          <div key={tf} className="inset rounded-2xl px-3 py-2.5 text-center">
            <div className="text-[11px] font-semibold text-ink-3">{tf} · {tf === "4H" ? "Bias" : tf === "1H" ? "Zones" : tf === "15M" ? "Setup" : "Confirm"}</div>
            <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[11.5px] font-semibold capitalize", trendCls(i.trends[tf]))}>{i.trends[tf] === null ? "n/a" : i.trends[tf] === "none" ? "no break" : i.trends[tf]}</span>
          </div>
        ))}
      </div>

      <h3 className="mt-5 text-[13px] font-semibold text-ink">Why: score inputs</h3>
      <ul className="mt-2 grid gap-1.5">
        {i.components.map((c) => (
          <li key={c.id} className="flex gap-3 text-[13px]">
            <span className={cn("num w-12 shrink-0 text-right font-semibold", c.contribution === null ? "text-ink-3" : c.contribution > 0 ? "text-up" : c.contribution < 0 ? "text-down" : "text-ink-2")}>{c.contribution === null ? "—" : `${c.contribution > 0 ? "+" : ""}${c.contribution.toFixed(0)}`}</span>
            <span className="min-w-0 text-ink-2"><b className="font-medium text-ink">{c.label}.</b> {c.detail}</span>
          </li>
        ))}
      </ul>

      {i.zones.length > 0 && (
        <>
          <h3 className="mt-5 text-[13px] font-semibold text-ink">Important zones (1H)</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {i.zones.map((z) => (
              <div key={z.id} className={cn("rounded-2xl border p-3.5 text-[13px]", z.side === "buy" ? "border-[color-mix(in_oklab,var(--up)_28%,transparent)] bg-up-soft" : "border-[color-mix(in_oklab,var(--down)_28%,transparent)] bg-down-soft")}>
                <div className={cn("font-semibold", z.side === "buy" ? "text-up" : "text-down")}>Potential {z.side.toUpperCase()} · <span className="num">{z.lower.toFixed(d)}–{z.upper.toFixed(d)}</span></div>
                <p className="mt-1 text-ink-2">{z.reasons.join(" ")}</p>
                <p className="mt-1.5 text-ink"><b className="font-medium">Confirm:</b> {z.confirmation}</p>
                <p className="mt-1 text-ink"><b className="font-medium">Invalid:</b> {z.invalidation.text}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="inset rounded-2xl p-3.5 text-[13px]">
          <h3 className="font-semibold text-ink">Fibonacci (1H)</h3>
          {i.fib ? (<><p className="mt-1 text-ink-3">Leg {i.fib.from.price.toFixed(d)} → {i.fib.to.price.toFixed(d)} ({i.fib.direction})</p>
            <ul className="num mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-ink-2">{i.fib.levels.map((l) => <li key={l.ratio}>{(l.ratio * 100).toFixed(1)}% · {l.price.toFixed(d)}</li>)}</ul></>)
            : <p className="mt-1 text-ink-3">No structural leg: no Fibonacci is drawn without a confirmed trend.</p>}
        </div>
        <div className="inset rounded-2xl p-3.5 text-[13px]">
          <h3 className="font-semibold text-ink">Liquidity and structure</h3>
          <ul className="mt-1 grid gap-0.5 text-ink-2">
            {i.liquidity.slice(0, 3).map((p) => <li key={p.price}>{p.side === "buy" ? "Equal highs" : "Equal lows"} <span className="num">{p.price.toFixed(d)}</span> ({p.swings} touches, untaken)</li>)}
            {i.sweeps.slice(-2).map((s) => <li key={s.t}>15M sweep of {s.side === "sell" ? "lows" : "highs"} at <span className="num">{s.level.toFixed(d)}</span>: {s.direction}</li>)}
            {i.structure.find((x) => x.tf === "1H")?.events.slice(-2).map((e) => <li key={e.t}>1H {e.kind} {e.direction} at <span className="num">{e.level.toFixed(d)}</span></li>)}
            {!i.liquidity.length && !i.sweeps.length && <li className="text-ink-3">No untaken equal highs/lows or recent sweeps.</li>}
          </ul>
          {i.volatility && <p className="mt-1.5 text-ink-3">Volatility: {i.volatility}</p>}
        </div>
      </div>

      {i.invalidation && <p className="mt-4 rounded-2xl bg-warn-soft px-4 py-2.5 text-[13px] text-ink"><b>Invalidation:</b> {i.invalidation}</p>}
      {i.limitations.length > 0 && <ul className="mt-2 grid gap-0.5 text-[12px] text-ink-3">{i.limitations.map((l, k) => <li key={k}>• {l}</li>)}</ul>}
    </Glass>
  );
}
