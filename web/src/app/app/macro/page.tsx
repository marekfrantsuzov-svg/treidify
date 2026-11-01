import { CalendarClock, Crosshair, Map as MapIcon, Radar, Waves } from "lucide-react";
import { PageHeader } from "@/components/app/status";
import { MarketCard, ScenarioCard, SentimentGrid, ZoneCard } from "@/components/macro/desk";
import { SectionHead, SourceChip } from "@/components/macro/parts";
import { Reveal, RevealItem } from "@/components/motion/reveal";
import { Flag } from "@/components/ui/flags";
import { dxyRelation, goldImpact, headlinesAbout, releases, scenarios, silverRelation, tradeSetup, zoneBrief, type SentHeadline } from "@/lib/intelligence";
import { cn } from "@/lib/cn";
import { deskNote } from "@/server/ai/notes";
import { loadIntel } from "@/server/market/load";
import { economicCalendar, latestHeadlines, type EconEvent } from "@/server/news/service";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Macro Desk" };

const DAY = 86_400_000;

/**
 * Macro Desk. Presentation of the existing engine: Gold, DXY and Silver cards, Gold's key zones under the 50-pip
 * rule, three scenarios, and a sentiment section that separates verified data from model interpretation.
 */
export default async function Macro() {
  const s = await requireOnboarded("/app/macro");
  const now = new Date(), nowMs = now.getTime();
  const tz = s.profile.timezone;
  const [snap, news, cal] = await Promise.all([loadIntel(), latestHeadlines(40), economicCalendar(new Date(nowMs - 45 * DAY), new Date(nowMs + 7 * DAY))]);
  const live = snap.mode === "live", sample = snap.mode === "sample";
  const upcoming: EconEvent[] = cal.ok ? cal.data.filter((e) => Date.parse(e.at) >= nowMs && e.importance === "high").sort((a, b) => Date.parse(a.at) - Date.parse(b.at)) : [];
  const evFacts = upcoming.slice(0, 6).map((e) => `Upcoming: ${e.country} ${e.title} at ${e.at}`);
  const [gNote, dNote, sNote] = await Promise.all([snap.gold, snap.dxy, snap.silver].map((i) => deskNote(i, live, evFacts)));

  const g = snap.gold;
  const setup = tradeSetup(g);
  const buyZ = g.zones.find((z) => z.side === "buy"), sellZ = g.zones.find((z) => z.side === "sell");
  const heads: SentHeadline[] = news.ok ? news.data : [];
  const impact = goldImpact(g, snap.dxy, heads, cal.ok ? cal.data.filter((e) => Date.parse(e.at) >= nowMs - 3600_000 && e.importance !== "low") : [], now);
  const asOf = new Date(snap.asOf).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <PageHeader title="Macro Desk" subtitle="Gold, the dollar and silver: direction, the levels that matter, and what would change the view.">
        <div className="flex flex-wrap items-center gap-2">
          {live ? <SourceChip kind="fact" label={`Live · ${snap.vendor ?? "market data"} · ${asOf}`} /> : sample ? <SourceChip kind="sample" label={`Sample bars · ${asOf}`} /> : <SourceChip kind="na" label="Market data error" />}
          <SourceChip kind={news.ok ? "fact" : "na"} label={news.ok ? `News · ${news.vendor}` : "News not connected"} />
        </div>
      </PageHeader>
      {snap.message && <p className="mb-4 rounded-2xl bg-warn-soft px-4 py-2.5 text-[13px] leading-snug text-ink">{snap.message}</p>}

      <SectionHead id="markets" icon={<Radar />} title="Market intelligence" sub="Structure on 4H, 1H, 15M and 5M. Dots: green bullish, red bearish, grey no confirmed structure." />
      <Reveal className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RevealItem><MarketCard i={g} quote={snap.quotes.XAUUSD} sample={sample} note={gNote} /></RevealItem>
        <RevealItem><MarketCard i={snap.dxy} quote={snap.quotes.DXY} sample={sample} note={dNote} relation={{ title: "Relationship with Gold", ...dxyRelation(g, snap.dxy) }} /></RevealItem>
        <RevealItem className="md:col-span-2 xl:col-span-1"><MarketCard i={snap.silver} quote={snap.quotes.XAGUSD} sample={sample} note={sNote} relation={{ title: "Versus Gold", ...silverRelation(g, snap.silver) }} /></RevealItem>
      </Reveal>

      <SectionHead id="zones" icon={<Crosshair />} title="Key zones · XAUUSD" sub="1H zones with their stop measured at structural invalidation. 1 pip = $0.10 (10 pips = $1.00); a stop over 50 pips ($5.00) means WAIT, and it is never tightened." />
      <Reveal className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <RevealItem><ZoneCard side="buy" digits={g.digits} b={buyZ ? zoneBrief(g, buyZ, setup) : null} /></RevealItem>
        <RevealItem><ZoneCard side="sell" digits={g.digits} b={sellZ ? zoneBrief(g, sellZ, setup) : null} /></RevealItem>
      </Reveal>

      <SectionHead id="scenarios" icon={<MapIcon />} title="Scenarios · XAUUSD" sub="What has to happen before a buy or a sell, and why the answer may be to wait." />
      <Reveal className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        {scenarios(g, setup).map((sc) => <RevealItem key={sc.id} className="h-full"><ScenarioCard s={sc} /></RevealItem>)}
      </Reveal>

      <SectionHead id="sentiment" icon={<Waves />} title="Market sentiment" sub="Verified data and headlines are labelled as such. Model interpretation is labelled separately. Missing sources stay empty." />
      <SentimentGrid
        newsOk={news.ok} newsNeeds={news.ok ? undefined : news.needs} calOk={cal.ok} calNeeds={cal.ok ? undefined : cal.needs}
        risk={heads.filter((h) => /\b(risk[- ]?(on|off)|stocks|equities|wall street|selloff|sell-off|vix|volatility)\b/i.test(h.title)).slice(0, 3)}
        geo={headlinesAbout(heads, "geo")} cb={headlinesAbout(heads, "cb")} yld={headlinesAbout(heads, "yld")}
        relevant={heads.filter((h) => h.instruments.includes("XAUUSD") || h.instruments.includes("DXY"))}
        rates={releases(cal.ok ? cal.data.filter((e) => e.country === "US") : [], ["FOMC", "Rate decision"], nowMs)}
        inflation={releases(cal.ok ? cal.data.filter((e) => e.country === "US") : [], ["CPI", "PCE", "PPI"], nowMs)}
        dxy={snap.dxy} sample={sample} impact={impact} tz={tz} now={nowMs}
      />

      <SectionHead id="drivers" icon={<CalendarClock />} title="This week's drivers" sub="High-impact scheduled events in the next 7 days." />
      <div className="dcard dcard-pad">
        {!cal.ok ? <p className="text-[13px] text-ink-2">{cal.message}{cal.needs?.length ? ` Needs: ${cal.needs.join(", ")}.` : ""}</p> : upcoming.length === 0 ? <p className="text-[13px] text-ink-3">No high-impact events in the next 7 days.</p> : (
          <ul className="divide-y divide-[var(--border)]">
            {upcoming.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <Flag code={e.country} size={22} />
                <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold text-ink">{e.title}</p><p className="num text-[12px] text-ink-3">{e.forecast ? `Forecast ${e.forecast}` : ""}{e.forecast && e.previous ? " · " : ""}{e.previous ? `Previous ${e.previous}` : ""}</p></div>
                <span className={cn("num shrink-0 text-right text-[12.5px] text-ink-2")}>{new Date(e.at).toLocaleString("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-4 text-[11.5px] text-ink-3">Analysis computed from market structure at {asOf}{sample ? " on sample bars" : ""}. It is analysis, not advice, and not a prediction.</p>
    </>
  );
}
