"use client";

import { ChevronLeft, ChevronRight, Eye, Link2, NotebookPen, TrendingDown, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { pnlCalendar, tradedMonths } from "@/lib/analytics/calendar";
import { sessionAt, SESSIONS } from "@/lib/analytics/sessions";
import { netProfit, type ClosedTrade } from "@/lib/analytics/types";
import { mulberry32 } from "@/lib/demo/sample";
import { cn } from "@/lib/cn";
import { fmtSignedMoney } from "@/lib/format";
import { Modal } from "@/components/intel/modal";

export interface CalNote { notes: string; lessons: string; setupTags: string[]; mistakeTags: string[] }
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Clearly labelled demo trades for the optional preview. Generated in the browser; never saved, never mixed with real data. */
function demoTrades(year: number, month: number): ClosedTrade[] {
  const rnd = mulberry32(year * 100 + month);
  const out: ClosedTrade[] = [];
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let price = 4050;
  for (let d = 1; d <= days; d++) {
    const wd = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    if (wd === 0 || wd === 6 || rnd() < 0.25) continue;
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const open = Date.UTC(year, month - 1, d, 7 + Math.floor(rnd() * 10), Math.floor(rnd() * 60)) / 1000;
      const side = rnd() < 0.5 ? "buy" : "sell";
      const move = (rnd() - 0.42) * 9;
      const vol = [0.1, 0.2, 0.5][Math.floor(rnd() * 3)]!;
      const entry = price + (rnd() - 0.5) * 6, exit = entry + (side === "buy" ? move : -move);
      out.push({ id: `demo-${d}-${k}`, symbol: "XAUUSD", side, volume: vol, openTime: open, closeTime: open + 900 + Math.floor(rnd() * 7200), profit: Math.round(move * 100 * vol * 100) / 100, commission: -Math.round(vol * 7 * 100) / 100, swap: 0, fees: 0, openPrice: Math.round(entry * 100) / 100, closePrice: Math.round(exit * 100) / 100 });
      price = exit;
    }
  }
  return out;
}

export function PnlCalendar({ trades: real, notes = {}, currency = "USD", tz, connected, sampleAccount, nowIso }: {
  trades: ClosedTrade[]; notes?: Record<string, CalNote>; currency?: string; tz: string; connected: boolean; sampleAccount?: boolean; nowIso: string;
}) {
  const now = new Date(nowIso);
  const months = useMemo(() => tradedMonths(real, tz), [real, tz]);
  const start = months[0] ?? [Number(nowIso.slice(0, 4)), Number(nowIso.slice(5, 7))] as [number, number];
  const [ym, setYm] = useState<[number, number]>(start);
  const [demo, setDemo] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const trades = useMemo(() => (demo ? demoTrades(ym[0], ym[1]).filter((t) => t.closeTime * 1000 <= now.getTime()) : real), [demo, ym, real, nowIso]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = useMemo(() => pnlCalendar(trades, ym[0], ym[1], tz), [trades, ym, tz]);
  const maxAbs = Math.max(1, ...m.days.map((d) => Math.abs(d.net)));
  const byId = useMemo(() => new Map(trades.map((t) => [t.id, t])), [trades]);
  const step = (k: number) => { const d = new Date(Date.UTC(ym[0], ym[1] - 1 + k, 1)); setYm([d.getUTCFullYear(), d.getUTCMonth() + 1]); };
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const fm = (v: number, digits = 0) => fmtSignedMoney(v, currency, digits);
  const openDay = open ? m.days.find((d) => d.key === open) ?? null : null;
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });

  if (!connected && !demo) {
    return (
      <section className="dcard dcard-pad cal-empty" aria-labelledby="cal-title">
        <div className="cal-ghost" aria-hidden>{Array.from({ length: 35 }, (_, i) => <span key={i} />)}</div>
        <div className="relative mx-auto max-w-md text-center">
          <span className="section-icon mx-auto h-12 w-12 rounded-2xl" aria-hidden><NotebookPen className="h-6 w-6" /></span>
          <h2 id="cal-title" className="mt-3 text-[20px] font-semibold tracking-[-0.02em] text-ink">Your P&amp;L calendar</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">Connect MetaTrader 5 and every closed trade lands on its day: green for profitable days, red for losing ones, with monthly totals, win rate and your best and worst days.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/app/accounts" className="press bg-brand inline-flex h-10 items-center gap-2 rounded-full px-5 text-[13.5px] font-semibold text-white"><Link2 className="h-4 w-4" />Connect MT5</Link>
            <button type="button" onClick={() => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)); setYm([d.getUTCFullYear(), d.getUTCMonth() + 1]); setDemo(true); }} className="press inline-flex h-10 items-center gap-2 rounded-full bg-[var(--surface-inset)] px-5 text-[13.5px] font-semibold text-ink shadow-[inset_0_0_0_1px_var(--border)]"><Eye className="h-4 w-4" />Preview with sample data</button>
          </div>
          <p className="mt-2 text-[11.5px] text-ink-3">The preview uses generated sample trades, clearly labelled. Nothing is saved.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dcard dcard-pad" aria-labelledby="cal-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => step(-1)} aria-label="Previous month" className="cal-nav"><ChevronLeft /></button>
          <h2 id="cal-title" className="min-w-[150px] text-center text-[17px] font-semibold tracking-[-0.015em] text-ink" aria-live="polite">{MONTHS[ym[1] - 1]} {ym[0]}</h2>
          <button type="button" onClick={() => step(1)} aria-label="Next month" className="cal-nav"><ChevronRight /></button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {demo && <span className="rounded-full bg-warn-soft px-3 py-1 text-[11.5px] font-bold text-warn">DEMO PREVIEW · sample trades, not yours</span>}
          {sampleAccount && !demo && <span className="rounded-full bg-warn-soft px-3 py-1 text-[11.5px] font-bold text-warn">Sample account</span>}
          {demo && <button type="button" onClick={() => setDemo(false)} className="rounded-full px-3 py-1 text-[12px] font-semibold text-accent hover:bg-accent-soft">Exit preview</button>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Kpi label="Monthly realized P&L" value={fm(m.net)} tone={m.net > 0 ? "up" : m.net < 0 ? "down" : undefined} big />
        <Kpi label="Win rate" value={m.winRate === null ? "—" : `${(m.winRate * 100).toFixed(0)}%`} sub={`${m.wins}W · ${m.losses}L`} />
        <Kpi label="Total trades" value={String(m.trades)} sub={`${m.tradingDays} trading day${m.tradingDays === 1 ? "" : "s"}`} />
        <Kpi label="Best day" icon={<Trophy />} value={m.best ? fm(m.best.net) : "—"} sub={m.best ? `${m.best.day} ${MONTHS[ym[1] - 1]!.slice(0, 3)}` : undefined} tone={m.best ? "up" : undefined} />
        <Kpi label="Worst day" icon={<TrendingDown />} value={m.worst ? fm(m.worst.net) : "—"} sub={m.worst ? `${m.worst.day} ${MONTHS[ym[1] - 1]!.slice(0, 3)}` : undefined} tone={m.worst ? "down" : undefined} />
      </div>

      <div className="cal-grid mt-4" role="grid" aria-label={`${MONTHS[ym[1] - 1]} ${ym[0]} daily realized P&L`}>
        {WD.map((w) => <div key={w} className="cal-wd" role="columnheader">{w}</div>)}
        {Array.from({ length: m.lead }, (_, i) => <div key={`l${i}`} aria-hidden />)}
        {m.days.map((d) => {
          const tone = d.trades === 0 ? "none" : d.net > 0 ? "up" : d.net < 0 ? "down" : "flat";
          const a = d.trades ? 0.12 + 0.5 * (Math.abs(d.net) / maxAbs) : 0;
          return (
            <button key={d.key} type="button" role="gridcell" disabled={d.trades === 0} onClick={() => setOpen(d.key)}
              aria-label={d.trades ? `${d.day}: ${fm(d.net, 2)}, ${d.trades} trade${d.trades === 1 ? "" : "s"}. Open the day.` : `${d.day}: no trades`}
              className={cn("cal-day", `is-${tone}`, d.key === todayKey && "is-today", (m.best?.key === d.key || m.worst?.key === d.key) && "is-extreme")}
              style={{ ["--a" as string]: a }}>
              <span className="cal-num">{d.day}</span>
              {d.trades > 0 && <><span className="num cal-pnl">{fm(d.net)}</span><span className="cal-count">{d.trades} trade{d.trades === 1 ? "" : "s"}</span></>}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11.5px] text-ink-3">Realized net P&amp;L (profit, commission, swap and fees) booked on each trade&apos;s close date in {tz}. {demo ? "Sample data for preview only." : sampleAccount ? "From the sample account." : "From your synced MT5 history."}</p>

      <Modal open={!!openDay} onClose={() => setOpen(null)} title={openDay ? new Date(`${openDay.key}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}
        subtitle={openDay ? <span className={openDay.net >= 0 ? "text-up" : "text-down"}>{fm(openDay.net, 2)} realized · {openDay.trades} closed trade{openDay.trades === 1 ? "" : "s"}{demo ? " · DEMO PREVIEW" : ""}</span> : undefined}>
        {openDay && (
          <ul className="grid gap-2">
            {openDay.ids.map((id) => byId.get(id)!).sort((a, b) => a.closeTime - b.closeTime).map((t) => {
              const v = netProfit(t), ses = sessionAt(new Date(t.openTime * 1000)), n = notes[t.id];
              return (
                <li key={t.id} className="rounded-2xl bg-[var(--surface-inset)] p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">{t.symbol}<span className={cn("rounded-md px-1.5 py-px text-[10.5px] font-bold uppercase", t.side === "buy" ? "bg-up-soft text-up" : "bg-down-soft text-down")}>{t.side}</span></span>
                    <span className={cn("num text-[15px] font-semibold", v >= 0 ? "text-up" : "text-down")}>{fmtSignedMoney(v, currency)}</span>
                  </div>
                  <dl className="num mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] sm:grid-cols-4">
                    <div><dt className="text-ink-3">Entry</dt><dd className="font-semibold text-ink">{t.openPrice !== undefined ? t.openPrice.toFixed(2) : "—"}</dd></div>
                    <div><dt className="text-ink-3">Exit</dt><dd className="font-semibold text-ink">{t.closePrice !== undefined ? t.closePrice.toFixed(2) : "—"}</dd></div>
                    <div><dt className="text-ink-3">Size</dt><dd className="font-semibold text-ink">{t.volume} lot</dd></div>
                    <div><dt className="text-ink-3">Session</dt><dd className="font-semibold text-ink">{SESSIONS.find((s) => s.id === ses)?.name ?? "Off-session"}</dd></div>
                    <div className="col-span-2 sm:col-span-4"><dt className="sr-only">Times</dt><dd className="text-ink-3">{time.format(new Date(t.openTime * 1000))} → {time.format(new Date(t.closeTime * 1000))}</dd></div>
                  </dl>
                  {n && (n.notes || n.lessons) ? (
                    <div className="mt-2 rounded-xl bg-[var(--surface-strong)] px-3 py-2 text-[12.5px] text-ink-2">{n.notes && <p>{n.notes}</p>}{n.lessons && <p className="mt-1"><b className="font-semibold text-ink">Lesson:</b> {n.lessons}</p>}</div>
                  ) : !demo && <p className="mt-2 text-[11.5px] text-ink-3">No notes yet. Add them in the trade list below.</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </section>
  );
}

function Kpi({ label, value, sub, tone, icon, big }: { label: string; value: string; sub?: string; tone?: "up" | "down"; icon?: React.ReactNode; big?: boolean }) {
  return (
    <div className={cn("cal-kpi", big && "col-span-2 sm:col-span-1")}>
      <div className="flex items-center gap-1 text-[12.5px] font-medium text-ink-3 [&_svg]:hidden">{icon}{label}</div>
      <div className={cn("num mt-1 font-medium leading-none tracking-[-0.03em]", big ? "text-[clamp(24px,2vw,32px)]" : "text-[clamp(20px,1.5vw,24px)]", tone === "up" ? "text-up-ink" : tone === "down" ? "text-down-ink" : "text-ink")}>{value}</div>
      {sub && <div className="mt-1 text-[12px] text-ink-3">{sub}</div>}
    </div>
  );
}
