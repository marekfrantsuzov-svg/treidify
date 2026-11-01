import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { Alert } from "@/components/auth/auth-ui";
import { PageHeader } from "@/components/app/status";
import { biasText, biasTone } from "@/components/intel/bias";
import { HeadlineList } from "@/components/intel/news-list";
import { Glass } from "@/components/ui/glass";
import type { InstrumentIntel } from "@/lib/intelligence";
import { cn } from "@/lib/cn";
import { deskNote } from "@/server/ai/notes";
import { loadIntel } from "@/server/market/load";
import { economicCalendar, latestHeadlines, type EconEvent } from "@/server/news/service";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Macro Desk" };

const NAMES: Record<string, string> = { XAUUSD: "Gold", DXY: "DXY", XAGUSD: "Silver" };

function summaryLine(i: InstrumentIntel) {
  if (i.bias === "insufficient") return "Not enough verified data for a reading.";
  const top = [...i.components].filter((c) => c.contribution !== null && c.contribution !== 0).sort((a, b) => Math.abs(b.contribution!) - Math.abs(a.contribution!)).slice(0, 2);
  return `${NAMES[i.symbol]} is ${biasText[i.bias].toLowerCase()} mainly because: ${top.map((c) => c.detail.replace(/\.$/, "")).join("; ") || "no input is pushing strongly"}.`;
}
function plan(i: InstrumentIntel) {
  if (i.bias === "insufficient") return null;
  const withTrend = i.zones.find((z) => z.withTrend);
  if (i.bias === "neutral" || !withTrend) return "Conditions are mixed. Favour patience: wait for 4H and 1H structure to agree before considering either side.";
  return `Conditions favour monitoring ${withTrend.side.toUpperCase()} opportunities on confirmed pullbacks into ${withTrend.lower.toFixed(i.digits)}–${withTrend.upper.toFixed(i.digits)} rather than chasing extended moves.`;
}

export default async function Macro() {
  const s = await requireOnboarded("/app/macro");
  const now = new Date();
  const [snap, news, cal] = await Promise.all([loadIntel(), latestHeadlines(30), economicCalendar(now, new Date(now.getTime() + 7 * 86_400_000))]);
  const live = snap.mode === "live";
  const events: EconEvent[] = cal.ok ? cal.data.filter((e) => e.importance === "high" && (e.country === "US" || e.kind)).slice(0, 6) : [];
  const evFacts = events.map((e) => `Upcoming: ${e.country} ${e.title} at ${e.at}`);
  const instruments = [snap.gold, snap.dxy, snap.silver];
  const notes = await Promise.all(instruments.map((i) => deskNote(i, live, evFacts)));
  const tz = s.profile.timezone;
  return (
    <>
      <PageHeader title="Macro Desk" subtitle="What each market is doing, why, the levels that matter and what would change the view." />
      {snap.message && <div className="mb-4"><Alert tone="warn">{snap.message}</Alert></div>}
      <Glass strong className="mb-4 p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Daily market summary</p>
        <div className="mt-2 grid gap-1.5 text-[14.5px] leading-relaxed text-ink">
          {instruments.map((i) => <p key={i.symbol}><b className={biasTone[i.bias]}>{NAMES[i.symbol]} — {biasText[i.bias].toUpperCase()}.</b> <span className="text-ink-2">{summaryLine(i)}</span></p>)}
          <p className="mt-1"><b>XAUUSD plan.</b> <span className="text-ink-2">{plan(snap.gold) ?? "No plan without data."}</span></p>
          {events.length > 0 && <p className="text-ink-2"><b className="text-ink">Event risk.</b> {events.slice(0, 3).map((e) => `${e.country} ${e.title} (${new Date(e.at).toLocaleString("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit" })})`).join(", ")}.</p>}
        </div>
        <p className="mt-3 text-[11px] text-ink-3">Generated from computed market structure at {new Date(snap.asOf).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{snap.mode === "sample" ? " on SAMPLE bars" : ""}. Analysis, not advice.</p>
      </Glass>
      <div className="grid gap-4 xl:grid-cols-3">
        {instruments.map((i, k) => {
          const related = news.ok ? { ...news, data: news.data.filter((n) => n.instruments.includes(i.symbol as never)) } : news;
          const buy = i.zones.find((z) => z.side === "buy"), sell = i.zones.find((z) => z.side === "sell");
          return (
            <Glass key={i.symbol} className="flex flex-col p-5">
              <div className="flex items-baseline justify-between"><h2 className="text-[17px] font-semibold text-ink">{NAMES[i.symbol]}</h2><span className={cn("text-[15px] font-semibold", biasTone[i.bias])}>{biasText[i.bias]}{i.score !== null ? ` ${i.score > 0 ? "+" : ""}${i.score}` : ""}</span></div>
              <p className="mt-2 text-[13.5px] text-ink-2">{summaryLine(i)}</p>
              {notes[k] && <div className="mt-3 rounded-2xl bg-accent-soft p-3.5 text-[13.5px] text-ink"><span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-accent"><Sparkles className="h-3.5 w-3.5" />AI explanation of the computed facts</span>{notes[k]}</div>}
              <dl className="mt-3 grid gap-2 text-[13px]">
                <div className="inset rounded-2xl px-3.5 py-2.5"><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Structure</dt><dd className="mt-0.5 text-ink">4H {i.trends["4H"] ?? "n/a"} · 1H {i.trends["1H"] ?? "n/a"} · 15M {i.trends["15M"] ?? "n/a"}</dd></div>
                <div className="inset rounded-2xl px-3.5 py-2.5"><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Momentum</dt><dd className="mt-0.5 text-ink">{i.components.find((c) => c.id === "momentum")?.detail} {i.components.find((c) => c.id === "trend")?.detail}</dd></div>
                <div className="inset rounded-2xl px-3.5 py-2.5"><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Scenarios</dt>
                  <dd className="mt-1 grid gap-1.5">
                    {buy && <p className="flex gap-1.5 text-ink"><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-up" />Bullish if price holds {buy.lower.toFixed(i.digits)}–{buy.upper.toFixed(i.digits)} and 5M confirms. Invalid on {buy.invalidation.text.replace("A 1H close", "a 1H close").replace(" invalidates the zone.", "")}.</p>}
                    {sell && <p className="flex gap-1.5 text-ink"><ArrowDownRight className="mt-0.5 h-4 w-4 shrink-0 text-down" />Bearish if price rejects {sell.lower.toFixed(i.digits)}–{sell.upper.toFixed(i.digits)} and 5M confirms. Invalid on {sell.invalidation.text.replace("A 1H close", "a 1H close").replace(" invalidates the zone.", "")}.</p>}
                    {!buy && !sell && <p className="text-ink-3">No qualified zone near price.</p>}
                  </dd></div>
                {i.invalidation && <div className="rounded-2xl bg-warn-soft px-3.5 py-2.5 text-ink"><dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">What invalidates the outlook</dt><dd className="mt-0.5">{i.invalidation}</dd></div>}
              </dl>
              <h3 className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-ink-3">Relevant news</h3>
              <div className="mt-1"><HeadlineList r={related} limit={3} nowMs={now.getTime()} compact /></div>
            </Glass>
          );
        })}
      </div>
      <Glass className="mt-4 p-5">
        <h2 className="text-[15px] font-semibold text-ink">Macro drivers this week</h2>
        {!cal.ok ? <p className="mt-2 text-sm text-ink-2">{cal.message}{cal.needs?.length ? ` Needs: ${cal.needs.join(", ")}.` : ""}</p> : events.length === 0 ? <p className="mt-2 text-sm text-ink-3">No high-impact events in the next 7 days.</p> : (
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{events.map((e) => <li key={e.id} className="inset rounded-2xl px-3.5 py-2.5 text-[13px]"><b className="text-ink">{e.kind ?? e.title}</b> <span className="text-ink-2">· {e.country} {e.title}</span><div className="text-[11.5px] text-ink-3">{new Date(e.at).toLocaleString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{e.forecast ? ` · forecast ${e.forecast}` : ""}{e.previous ? ` · previous ${e.previous}` : ""}</div></li>)}</ul>
        )}
        <p className="mt-2 text-[11px] text-ink-3">US 10-year and real yields will join this desk when a yields source (for example FRED) is connected.</p>
      </Glass>
    </>
  );
}
