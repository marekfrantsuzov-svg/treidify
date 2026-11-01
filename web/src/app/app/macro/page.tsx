import { Activity, CalendarClock, Crosshair, Map as MapIcon, Radar, Waves } from "lucide-react";
import { PageHeader } from "@/components/app/status";
import Link from "next/link";
import { MarketCard, ScenarioCard, SentimentGrid, ZoneCard } from "@/components/macro/desk";
import { SectionHead, SourceChip } from "@/components/macro/parts";
import { DeskPulse } from "@/components/terminal/macro-pulse";
import { DeskSlot } from "@/components/markets/instrument-picker";
import { Reveal, RevealItem } from "@/components/motion/reveal";
import { Flag } from "@/components/ui/flags";
import { dxyRelation, goldImpact, headlinesAbout, releases, scenarios, silverRelation, tradeSetup, zoneBrief, type SentHeadline } from "@/lib/intelligence";
import { cn } from "@/lib/cn";
import { deskNote } from "@/server/ai/notes";
import { loadDesk } from "@/server/market/load";
import { instrumentCatalog } from "@/server/market/catalog";
import { marketPrefs } from "@/server/market/prefs";
import { INSTRUMENTS } from "@/lib/markets/registry";
import { economicCalendar, latestHeadlines, type EconEvent } from "@/server/news/service";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Macro Desk" };

const DAY = 86_400_000;

/**
 * Macro Desk. Three instrument cards (Gold, DXY and Silver by default) that each user can change; the choice is saved
 * to their account. Every card runs the same engine on its own instrument's bars and conventions. Key zones and
 * scenarios follow the card picked under "Key zones"; the 50-pip stop rule applies to Gold only.
 */
export default async function Macro({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const s = await requireOnboarded("/app/macro");
  const now = new Date(), nowMs = now.getTime();
  const tz = s.profile.timezone;
  const [prefs, sp] = await Promise.all([marketPrefs(s.user.id), searchParams]);
  const desk = prefs.desk;
  const [snap, news, cal, catalog] = await Promise.all([loadDesk([...desk, "XAUUSD"]), latestHeadlines(40), economicCalendar(new Date(nowMs - 45 * DAY), new Date(nowMs + 7 * DAY)), instrumentCatalog()]);
  const live = snap.mode === "live", sample = snap.mode === "sample";
  const upcoming: EconEvent[] = cal.ok ? cal.data.filter((e) => Date.parse(e.at) >= nowMs && e.importance === "high").sort((a, b) => Date.parse(a.at) - Date.parse(b.at)) : [];
  const cards = desk.map((sym) => snap.items.find((i) => i.symbol === sym)!);
  const evFactsFor = (sym: string) => upcoming.filter((e) => (INSTRUMENTS[sym]?.calendar ?? []).includes(e.country)).slice(0, 6).map((e) => `Upcoming: ${e.country} ${e.title} at ${e.at}`);
  const notes = await Promise.all(cards.map((c) => (c.status === "live" ? deskNote(c.intel, live, evFactsFor(c.symbol)) : Promise.resolve(null))));
  const heads: SentHeadline[] = news.ok ? news.data : [];

  const anchor = cards[0]!;
  const nameOf = (sym: string) => (sym === "XAUUSD" ? "Gold" : sym === "XAGUSD" ? "Silver" : INSTRUMENTS[sym]?.short ?? sym);
  const relationFor = (k: number) => {
    if (k === 0) return undefined;
    const c = cards[k]!;
    if (c.symbol === "DXY") return { title: `Relationship with ${nameOf(anchor.symbol)}`, ...dxyRelation(anchor.intel, c.intel) };
    return { title: `Versus ${nameOf(anchor.symbol)}`, ...silverRelation(anchor.intel, c.intel) };
  };

  const focusSym = desk.includes(sp.focus ?? "") ? sp.focus! : desk[0]!;
  const f = snap.items.find((i) => i.symbol === focusSym)!.intel;
  const fDef = INSTRUMENTS[focusSym]!;
  const setup = tradeSetup(f);
  const buyZ = f.zones.find((z) => z.side === "buy"), sellZ = f.zones.find((z) => z.side === "sell");
  const g = snap.items.find((i) => i.symbol === "XAUUSD")!.intel;
  const dxy = snap.dxy ?? snap.items.find((i) => i.symbol === "DXY")?.intel ?? null;
  const impact = goldImpact(g, dxy ?? g, heads, cal.ok ? cal.data.filter((e) => Date.parse(e.at) >= nowMs - 3600_000 && e.importance !== "low") : [], now);
  const asOf = new Date(snap.asOf).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const zoneSub = fDef.maxStop !== null
    ? "1H zones with their stop measured at structural invalidation. 1 pip = $0.10 (10 pips = $1.00); a stop over 50 pips ($5.00) means WAIT, and it is never tightened."
    : `1H zones with their stop measured at structural invalidation, in ${fDef.move.unit}s (1 ${fDef.move.unit} = ${fDef.move.size} ${fDef.quote}). The 50-pip maximum is Gold's rule and does not apply to ${focusSym}.`;
  const focusTabs = (
    <div role="tablist" aria-label="Instrument for key zones and scenarios" className="inset mb-3 inline-flex flex-wrap rounded-full p-1">
      {desk.map((sym) => <Link key={sym} role="tab" aria-selected={sym === focusSym} href={`/app/macro?focus=${sym}#zones`} scroll={false} className={cn("min-h-[32px] rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-3", sym === focusSym && "bg-[var(--surface-strong)] text-ink shadow-[var(--shadow)]")}>{nameOf(sym)}</Link>)}
    </div>
  );

  return (
    <>
      <PageHeader title="Macro Desk" subtitle="Your three markets: direction, the levels that matter, and what would change the view. Tap a market's name to change it.">
        <div className="flex flex-wrap items-center gap-2">
          {live ? <SourceChip kind="fact" label={`Live · ${snap.vendor ?? "market data"} · ${asOf}`} /> : sample ? <SourceChip kind="sample" label={`Sample bars · ${asOf}`} /> : <SourceChip kind="na" label="Market data error" />}
          <SourceChip kind={news.ok ? "fact" : "na"} label={news.ok ? `News · ${news.vendor}` : "News not connected"} />
        </div>
      </PageHeader>
      {snap.message && <p className="mb-4 rounded-2xl bg-warn-soft px-4 py-2.5 text-[13px] leading-snug text-ink">{snap.message}</p>}

      <SectionHead id="pulse" icon={<Activity />} title="At a glance" sub="1H charts with their nearest buy and sell zones, timeframe direction, momentum and the dollar link. Tap a market to open its chart." />
      <DeskPulse key={desk.join(",")} items={cards.map((c) => ({ intel: c.intel, quote: c.quote, status: c.status }))} dxy={dxy} />

      <SectionHead id="markets" icon={<Radar />} title="Market intelligence" sub="Structure on 4H, 1H, 15M and 5M. Dots: green bullish, red bearish, grey no confirmed structure. Tap an instrument's name to replace it." />
      <Reveal className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c, k) => (
          <RevealItem key={`${k}-${c.symbol}`} className={cn(k === 2 && "md:col-span-2 xl:col-span-1")}>
            <DeskSlot slot={k} symbol={c.symbol} desk={desk} catalog={catalog.items} favorites={prefs.favorites}>
              <MarketCard i={c.intel} quote={c.quote} sample={sample} note={notes[k]} relation={relationFor(k)} now={nowMs}
                news={news.ok ? heads.filter((h) => h.instruments.includes(c.symbol)) : null}
                unavailable={c.status === "unavailable" || c.status === "error" ? `${c.message ?? "No data for this instrument."} No analysis is generated without verified bars.` : null} />
            </DeskSlot>
          </RevealItem>
        ))}
      </Reveal>

      <SectionHead id="zones" icon={<Crosshair />} title={`Key zones · ${focusSym}`} sub={zoneSub} />
      {focusTabs}
      <Reveal key={`z-${focusSym}`} className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <RevealItem><ZoneCard side="buy" symbol={focusSym} digits={f.digits} b={buyZ ? zoneBrief(f, buyZ, setup) : null} /></RevealItem>
        <RevealItem><ZoneCard side="sell" symbol={focusSym} digits={f.digits} b={sellZ ? zoneBrief(f, sellZ, setup) : null} /></RevealItem>
      </Reveal>

      <SectionHead id="scenarios" icon={<MapIcon />} title={`Scenarios · ${focusSym}`} sub="What has to happen before a buy or a sell, and why the answer may be to wait." />
      <Reveal key={`s-${focusSym}`} className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        {scenarios(f, setup).map((sc) => <RevealItem key={sc.id} className="h-full"><ScenarioCard s={sc} /></RevealItem>)}
      </Reveal>

      <SectionHead id="sentiment" icon={<Waves />} title="Market sentiment" sub="Verified data and headlines are labelled as such. Model interpretation is labelled separately. Missing sources stay empty." />
      <SentimentGrid
        newsOk={news.ok} newsNeeds={news.ok ? undefined : news.needs} calOk={cal.ok} calNeeds={cal.ok ? undefined : cal.needs}
        risk={heads.filter((h) => /\b(risk[- ]?(on|off)|stocks|equities|wall street|selloff|sell-off|vix|volatility)\b/i.test(h.title)).slice(0, 3)}
        geo={headlinesAbout(heads, "geo")} cb={headlinesAbout(heads, "cb")} yld={headlinesAbout(heads, "yld")}
        relevant={heads.filter((h) => desk.some((d) => h.instruments.includes(d)))} relevantTitle={`Relevant news for ${desk.map(nameOf).join(", ")}`}
        rates={releases(cal.ok ? cal.data.filter((e) => e.country === "US") : [], ["FOMC", "Rate decision"], nowMs)}
        inflation={releases(cal.ok ? cal.data.filter((e) => e.country === "US") : [], ["CPI", "PCE", "PPI"], nowMs)}
        dxy={dxy ?? g} sample={sample} impact={impact} tz={tz} now={nowMs}
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
