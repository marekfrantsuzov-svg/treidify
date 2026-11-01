import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/app/status";
import { InstrumentBreakdown } from "@/components/intel/instrument-breakdown";
import { AnalysisBoard } from "@/components/terminal/analysis-board";
import { loadIntel } from "@/server/market/load";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Analysis" };

function Panel({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="more detail-panel" open={open}>
      <summary><span className="min-w-0 flex-1">{title}</span><ChevronDown className="more-chev" aria-hidden /></summary>
      <div className="more-body">{children}</div>
    </details>
  );
}

/** Analysis: visual verdict first; the engine's complete reasoning for Gold, DXY and Silver stays in expandable panels. */
export default async function Analysis() {
  await requireOnboarded("/app/intelligence");
  const s = await loadIntel();
  const sample = s.mode === "sample";
  return (
    <>
      <PageHeader title="Market Intelligence" subtitle="Gold bias, timeframe alignment and setup status first. Every number below is computed and explained." />
      <AnalysisBoard initial={s} details={
        <>
          <Panel title="Gold · full engine breakdown"><InstrumentBreakdown i={s.gold} sample={sample} /></Panel>
          <Panel title="DXY · full engine breakdown"><InstrumentBreakdown i={s.dxy} sample={sample} /></Panel>
          <Panel title="Silver · full engine breakdown"><InstrumentBreakdown i={s.silver} sample={sample} /></Panel>
          <Panel title="How Treidify decides">
            <div className="grid gap-2 text-[13px] leading-relaxed text-ink-2">
              <p>The score is a weighted sum of inputs each scored from −1 to +1: 4H structure (30), 1H structure (20), 4H trend strength versus the EMA(50) in ATR units (15), 1H RSI momentum (10), 15M liquidity sweeps (10) and, for metals, the DXY relationship when the two are measurably inversely correlated (15). Bullish is +25 or more, bearish −25 or less.</p>
              <p>A BUY or SELL setup needs the 4H bias, a qualified 1H zone with the trend, a 5M change of character from inside that zone, a target at least 1R away and a structural stop of at most 50 pips (1 pip = $0.10, so $5.00). Price touching a zone is never enough. The stop is never tightened to fit.</p>
              <p>Timeframe zones are the base candle before a displacement (one candle with a body ≥ 1.2 × ATR, or a 2–3 candle leg moving ≥ 1.8 × ATR). A close through the far edge invalidates a zone. Fibonacci is drawn only on confirmed swing legs. Liquidity levels are estimated from swing highs and lows, never presented as order-book data.</p>
              <p>When an input lacks data it is left out and the limitation is listed. With too little 4H or 1H data the reading is Insufficient Data.</p>
            </div>
          </Panel>
        </>
      } />
    </>
  );
}
