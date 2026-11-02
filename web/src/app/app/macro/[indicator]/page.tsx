import { ArrowLeft, CalendarClock, ExternalLink, Landmark, Layers, Percent } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/status";
import { SourceChip } from "@/components/macro/parts";
import { MacroChart } from "@/components/macro/macro-chart";
import { macroIndicators, type MacroIndicator } from "@/server/macro/service";
import { requireOnboarded } from "@/server/session";

const META = {
  rates: { title: "US interest rates", icon: Landmark, chart: "step" as const, period: "month" as const },
  inflation: { title: "US inflation (CPI)", icon: Percent, chart: "line" as const, period: "month" as const },
  gdp: { title: "US economic growth (GDP)", icon: Layers, chart: "bar" as const, period: "quarter" as const },
};

export async function generateMetadata({ params }: { params: Promise<{ indicator: string }> }) {
  const { indicator } = await params;
  return { title: META[indicator as keyof typeof META]?.title ?? "Macro Desk" };
}

const num = (s: string | null) => (s ? Number.parseFloat(s.replace(/[^0-9.\-]/g, "")) : NaN);

/** Plain-language, rule-based implications. Scenario text, not a forecast or a confirmed market reaction. */
function implications(m: MacroIndicator): { now: string | null; usd: string[]; gold: string[] } {
  const v = num(m.value?.split("–").at(-1) ?? null), p = num(m.previous?.split("–").at(-1) ?? null);
  const dir = Number.isFinite(v) && Number.isFinite(p) ? (v > p ? "up" : v < p ? "down" : "flat") : null;
  if (m.id === "rates") return {
    now: dir === null ? null : dir === "flat" ? "The Fed left its target range unchanged at the last meeting." : dir === "down" ? "The Fed lowered its target range at the last meeting." : "The Fed raised its target range at the last meeting.",
    usd: ["Higher US policy rates, or a market that expects them, tend to make dollar deposits and bonds more attractive, which usually supports the dollar.", "Cuts, or signals that cuts are coming sooner, usually work the other way. What moves markets is the decision compared with what was already priced in, and the statement and press conference that follow."],
    gold: ["Gold pays no interest, so lower rates reduce the cost of holding it; this has historically tended to support gold, especially through lower real (inflation-adjusted) yields.", "A more hawkish Fed than expected has tended to weigh on gold through a firmer dollar and higher real yields. These are tendencies, not rules: geopolitical demand and central-bank buying can dominate."],
  };
  if (m.id === "inflation") return {
    now: dir === null ? null : dir === "flat" ? "Annual CPI inflation was unchanged from the previous month." : dir === "up" ? "Annual CPI inflation rose from the previous month." : "Annual CPI inflation fell from the previous month.",
    usd: ["Inflation above expectations can push markets to expect a tighter Fed, which tends to lift Treasury yields and the dollar on the day.", "A softer print tends to do the opposite. The surprise against consensus matters more than the level, and forecasts are not shown here because no free official source publishes them."],
    gold: ["Over long periods gold is often held as an inflation hedge, but on release day the rate channel usually dominates: a hot CPI can hit gold through higher real yields and a stronger dollar.", "A cooler print has tended to help gold through lower yields. Core CPI (excluding food and energy) is watched closely by the Fed."],
  };
  return {
    now: dir === null ? null : `Real GDP growth was ${dir === "up" ? "faster than" : dir === "down" ? "slower than" : "the same as"} the previous quarter.`,
    usd: ["Stronger US growth than expected can support the dollar by keeping the Fed cautious about cuts.", "Weak growth, or a contraction, can weaken the dollar as markets price in easier policy. Advance estimates are revised twice, so early prints carry more uncertainty."],
    gold: ["Weak growth and recession worries have tended to support gold as a safe haven and through expected rate cuts.", "Strong growth tends to be mildly negative for gold via yields and the dollar, unless it comes with rising inflation."],
  };
}

export default async function Indicator({ params }: { params: Promise<{ indicator: string }> }) {
  const s = await requireOnboarded("/app/macro");
  const { indicator } = await params;
  if (!(indicator in META)) notFound();
  const id = indicator as keyof typeof META;
  const meta = META[id];
  const all = await macroIndicators();
  const m = all[id];
  const tz = s.profile.timezone;
  const imp = implications(m);
  const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <>
      <Link href="/app/macro" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"><ArrowLeft className="h-4 w-4" />Macro Desk</Link>
      <PageHeader title={meta.title} icon={meta.icon} subtitle={m.measure}>
        <SourceChip kind={m.ok ? "fact" : "na"} label={m.ok ? "Official data" : "Unavailable"} />
      </PageHeader>

      {!m.ok ? (
        <div className="dcard dcard-pad"><p className="text-[13.5px] text-ink-2">{m.message}</p></div>
      ) : (
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <section className="dcard dcard-pad flex flex-col" aria-label="Latest value">
            <p className="text-[12.5px] font-medium text-ink-3">{m.period}</p>
            <p className="num mt-1 text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-[48px]">{m.value}</p>
            <dl className="mt-4 grid gap-2 text-[13px]">
              <div className="flex justify-between gap-3 border-t border-line pt-2"><dt className="text-ink-3">{m.previousLabel}</dt><dd className="num text-right font-medium text-ink">{m.previous ?? "—"}</dd></div>
              <div className="flex justify-between gap-3 border-t border-line pt-2"><dt className="text-ink-3">{id === "rates" ? "Decided on" : "Published"}</dt><dd className="text-right font-medium text-ink">{m.releasedOn ? day(m.releasedOn) : <span className="text-ink-3">Needs FRED_API_KEY</span>}</dd></div>
              {m.facts.map((f) => <div key={f.label} className="flex justify-between gap-3 border-t border-line pt-2"><dt className="text-ink-3">{f.label}</dt><dd className="num text-right font-medium text-ink">{f.value}</dd></div>)}
              {m.next && <div className="flex justify-between gap-3 border-t border-line pt-2"><dt className="flex items-center gap-1.5 text-ink-3"><CalendarClock className="h-3.5 w-3.5" />{m.next.label}</dt><dd className="text-right font-medium text-ink">{new Date(m.next.at).toLocaleString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd></div>}
            </dl>
            <p className="mt-auto pt-4 text-[11.5px] leading-snug text-ink-3">
              Source: <a href={m.source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">{m.source.name}<ExternalLink className="ml-0.5 inline h-3 w-3" /></a>. {m.via === "csv" ? "Read from FRED's public download; release dates appear once FRED_API_KEY is set." : "Read from the FRED API."} Checked {new Date(m.fetchedAt).toLocaleString("en-GB", { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} ({tz}). Values change only when the agency publishes.
            </p>
          </section>
          <section className="dcard dcard-pad" aria-label="History">
            <h2 className="dcard-title mb-3">Trend</h2>
            <MacroChart points={m.history} kind={meta.chart} label={m.historyLabel} periodFmt={meta.period} />
            <p className="mt-2 text-[11.5px] text-ink-3">{m.historyLabel}. Latest vintage: past values include later revisions.</p>
          </section>
          <section className="dcard dcard-pad lg:col-span-2" aria-label="What it can mean for USD and gold">
            <div className="flex flex-wrap items-center gap-2"><h2 className="dcard-title">What it can mean for USD and gold</h2><SourceChip kind="model" label="Scenarios, not a forecast" /></div>
            {imp.now && <p className="mt-2 text-[14px] font-medium text-ink">{imp.now}</p>}
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div><h3 className="text-[13px] font-semibold text-ink">US dollar (DXY)</h3><ul className="mt-1.5 grid gap-1.5">{imp.usd.map((t) => <li key={t} className="flex gap-2 text-[13px] leading-relaxed text-ink-2"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent" />{t}</li>)}</ul></div>
              <div><h3 className="text-[13px] font-semibold text-ink">Gold (XAUUSD)</h3><ul className="mt-1.5 grid gap-1.5">{imp.gold.map((t) => <li key={t} className="flex gap-2 text-[13px] leading-relaxed text-ink-2"><span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent" />{t}</li>)}</ul></div>
            </div>
            <p className="mt-3 text-[11.5px] text-ink-3">General relationships described from the data above. They are not a prediction, not a measured market reaction and not advice. See the <Link href="/app/news?tab=calendar" className="font-medium text-accent hover:underline">economic calendar</Link> for upcoming releases.</p>
          </section>
        </div>
      )}
    </>
  );
}
