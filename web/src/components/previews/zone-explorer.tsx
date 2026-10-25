"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, CircleSlash, Compass, History, Info, Landmark, Magnet, Ruler, X } from "lucide-react";
import { useMemo, useState } from "react";
import { explainZone, zoneLabel, type PriceZone } from "@/lib/analytics";
import { MTF, digitsFor, sampleAnalysis, type SampleSymbol, type SampleTf } from "@/lib/demo/markets";
import { fmtNumber, fmtPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CandleChart } from "@/components/charts/candle-chart";
import { Glass } from "@/components/ui/glass";
import { Pill, SampleBadge } from "@/components/ui/pill";
import { BiasChip, InstrumentIcon } from "./parts";

const TFS: SampleTf[] = ["4H", "1H", "15M"];
const names: Record<SampleSymbol, string> = { XAUUSD: "Gold", DXY: "US Dollar Index", XAGUSD: "Silver" };

export function InstrumentCard({ symbol, defaultTf = "4H", height = 300, explorable = true, showMtf = true, className }: {
  symbol: SampleSymbol; defaultTf?: SampleTf; height?: number; explorable?: boolean; showMtf?: boolean; className?: string;
}) {
  const [tf, setTf] = useState<SampleTf>(defaultTf);
  const [zone, setZone] = useState<PriceZone | null>(null);
  const a = useMemo(() => sampleAnalysis(symbol, tf), [symbol, tf]);
  const mtf = useMemo(() => MTF.map(({ tf: t, role }) => ({ tf: t, role, bias: sampleAnalysis(symbol, t).bias.bias })), [symbol]);
  const d = digitsFor(symbol);
  const explanation = useMemo(
    () => zone && explainZone(zone, a.candles, { symbol, timeframe: tf, digits: d, atr: a.levels.atr, bias: a.bias, others: a.levels.zones }),
    [zone, a, symbol, tf, d],
  );
  const up = a.change >= 0;
  const buy = a.levels.zones.filter((z) => z.kind === "support").sort((x, y) => y.upper - x.upper)[0];
  const sell = a.levels.zones.filter((z) => z.kind === "resistance").sort((x, y) => x.lower - y.lower)[0];

  return (
    <Glass className={cn("relative overflow-hidden p-4 sm:p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <InstrumentIcon symbol={symbol} className="h-9 w-9 text-xs" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-ink">{symbol}</h3>
              <span className="text-xs text-ink-3">{names[symbol]}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="num text-2xl font-semibold tracking-[-0.02em] text-ink">{fmtNumber(a.last, d)}</span>
              <span className={cn("num text-sm font-medium", up ? "text-up" : "text-down")}>
                {up ? "+" : "−"}{fmtNumber(Math.abs(a.change), d)} ({fmtPct(a.changePct, 2, true)})
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SampleBadge />
          <div role="tablist" aria-label="Timeframe" className="inset flex rounded-full p-0.5">
            {TFS.map((t) => (
              <button key={t} role="tab" aria-selected={tf === t} onClick={() => { setTf(t); setZone(null); }} className={cn("rounded-full px-2.5 py-1 text-xs font-medium text-ink-3 hover:text-ink", tf === t && "bg-accent text-white hover:text-white")}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <Pill tone={a.bias.bias === "bullish" ? "up" : a.bias.bias === "bearish" ? "down" : "neutral"}>{tf} bias: {a.bias.bias === "insufficientData" ? "insufficient data" : a.bias.bias}</Pill>
        {buy && <Pill tone="up">Next buy area {fmtNumber(buy.lower, d)}–{fmtNumber(buy.upper, d)}</Pill>}
        {sell && <Pill tone="down">Next sell area {fmtNumber(sell.lower, d)}–{fmtNumber(sell.upper, d)}</Pill>}
      </div>

      <div className="mt-3">
        <CandleChart
          candles={a.candles}
          zones={a.levels.zones}
          height={height}
          digits={d}
          label={`${symbol} ${tf} sample chart`}
          onZoneSelect={explorable ? setZone : undefined}
          selectedZoneId={zone?.id}
          timeLabel={(t) => new Date(t * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        />
      </div>
      {explorable && <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3"><Info className="h-3.5 w-3.5" /> Tap a zone to see why it matters, what confirms it and what invalidates it.</p>}

      {showMtf && (
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {mtf.map((m) => (
            <BiasChip key={m.tf} tf={m.tf} bias={m.bias} role={m.role} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {explanation && zone && (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="glass glass-strong absolute inset-x-3 bottom-3 top-16 z-10 overflow-y-auto rounded-3xl p-5 shadow-[var(--shadow-lg)] sm:inset-x-auto sm:right-3 sm:w-[400px]"
            role="dialog"
            aria-label={explanation.title}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Pill tone={explanation.favours === "buyers" ? "up" : explanation.favours === "sellers" ? "down" : "accent"}>
                  {zoneLabel[zone.kind]} · {zone.touches} touches
                </Pill>
                <h4 className="mt-2 text-base font-semibold leading-snug text-ink">{explanation.title}</h4>
              </div>
              <button onClick={() => setZone(null)} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-inset text-ink-2 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-4 grid gap-3.5 text-[13px] leading-relaxed">
              {[
                [Compass, "Why it matters", explanation.why],
                [Ruler, "How it was identified", explanation.method],
                [History, "What happened previously", explanation.history],
                [CheckCircle2, "Confirmation to wait for", explanation.confirmation],
                [CircleSlash, "What invalidates it", explanation.invalidation],
                [Magnet, "Nearby liquidity", explanation.liquidity],
                [Landmark, "Macro factors", explanation.macro],
              ].map(([Icon, k, v]) => {
                const I = Icon as typeof Compass;
                return (
                  <div key={k as string} className="flex gap-3">
                    <I className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <dt className="font-semibold text-ink">{k as string}</dt>
                      <dd className="text-ink-2">{v as string}</dd>
                    </div>
                  </div>
                );
              })}
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">Favours: {explanation.favours}. {explanation.disclaimer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Glass>
  );
}
