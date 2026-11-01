import { Alert } from "@/components/auth/auth-ui";
import { PageHeader } from "@/components/app/status";
import { Gauge } from "@/components/intel/gauge";
import { InstrumentBreakdown } from "@/components/intel/instrument-breakdown";
import { Glass } from "@/components/ui/glass";
import { loadIntel } from "@/server/market/load";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Market Intelligence" };

export default async function Intelligence() {
  await requireOnboarded("/app/intelligence");
  const s = await loadIntel();
  const sample = s.mode === "sample";
  return (
    <>
      <PageHeader title="Market Intelligence" subtitle="4H bias, 1H zones, 15M setups and 5M confirmation, with every number explained." />
      {s.message && <div className="mb-4"><Alert tone="warn">{s.message}</Alert></div>}
      <Glass strong className="mb-4 grid grid-cols-3 gap-1 p-3 sm:gap-2 sm:p-6">
        <Gauge title="Gold" subtitle="XAUUSD" bias={s.gold.bias} score={s.gold.score} confidence={s.gold.confidence} components={s.gold.components} limitations={s.gold.limitations} invalidation={s.gold.invalidation} asOf={s.asOf} sample={sample} />
        <Gauge title="DXY" subtitle="US Dollar Index" bias={s.dxy.bias} score={s.dxy.score} confidence={s.dxy.confidence} components={s.dxy.components} limitations={s.dxy.limitations} invalidation={s.dxy.invalidation} asOf={s.asOf} sample={sample} />
        <Gauge title="Overall" subtitle="For Gold" bias={s.overall.bias} score={s.overall.score} detail={s.overall.detail} asOf={s.asOf} sample={sample} />
      </Glass>
      <div className="grid gap-4 xl:grid-cols-2">
        <InstrumentBreakdown i={s.gold} sample={sample} />
        <InstrumentBreakdown i={s.dxy} sample={sample} />
        <InstrumentBreakdown i={s.silver} sample={sample} />
        <Glass className="p-5 text-[13px] leading-relaxed text-ink-2 sm:p-6">
          <h2 className="text-[15px] font-semibold text-ink">How Treidify decides</h2>
          <p className="mt-2">The score is a weighted sum of inputs each scored from −1 to +1: 4H structure (30), 1H structure (20), 4H trend strength versus the EMA(50) in ATR units (15), 1H RSI momentum (10), 15M liquidity sweeps (10) and, for metals, the DXY relationship when the two are measurably inversely correlated (15). Bullish is +25 or more, bearish −25 or less.</p>
          <p className="mt-2">Structure breaks need a candle close beyond a confirmed swing. Fibonacci is drawn only on the leg that produced the latest break. Volatility and upcoming high-impact events lower confidence but never flip the direction.</p>
          <p className="mt-2">When an input lacks data it is left out and the limitation is listed. With too little 4H or 1H data the reading is Insufficient Data.</p>
        </Glass>
      </div>
    </>
  );
}
