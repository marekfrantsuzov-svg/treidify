"use client";

import { Gauge, Link2, Percent, Scale, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { healthScore, inRange, performanceMetrics, periodRange } from "@/lib/analytics";
import { zonedMidnight } from "@/lib/analytics/periods";
import { cn } from "@/lib/cn";
import { fmtMoney, fmtNumber, fmtSignedMoney } from "@/lib/format";
import { CountUp } from "@/components/ui/count-up";
import type { AccountOverviewProps } from "./account-overview";
import { useLiveAccount } from "@/components/app/live/live-account";

const GRADE_NOTE: Record<string, string> = {
  Strong: "Consistent performance",
  Stable: "Sound, with room to tighten",
  "Needs attention": "Risk or consistency slipping",
  "At risk": "Drawdown or losses need action",
};
const GRADE_CLS: Record<string, string> = { Strong: "bg-up-soft text-up", Stable: "bg-accent-soft text-accent", "Needs attention": "bg-warn-soft text-warn", "At risk": "bg-down-soft text-down" };

/** Gradient ring, violet to pink, with the score and "/100" set in tabular figures. */
function ScoreRing({ score, size = 104 }: { score: number | null; size?: number }) {
  const sw = size * 0.085, r = size / 2 - sw / 2 - 1, c = 2 * Math.PI * r, v = score ?? 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={score === null ? "Health score not available yet" : `Health score ${score} out of 100`} className="shrink-0">
      <defs><linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--grad-a, #6a3df5)" /><stop offset="1" stopColor="var(--grad-b, #fe85d0)" /></linearGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-inset)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-g)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 700ms var(--ease-spring)" }} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="num" fill="var(--text)">
        <tspan fontSize={size * 0.27} fontWeight="700" letterSpacing="-0.02em">{score ?? "—"}</tspan>
        <tspan fontSize={size * 0.12} fontWeight="500" fill="var(--text-3)">/100</tspan>
      </text>
    </svg>
  );
}

/** Five ascending bars, lit by the score (20 points per bar). */
function ScoreBars({ score }: { score: number | null }) {
  const lit = score === null ? 0 : Math.round(score / 20);
  return (
    <svg width="64" height="48" viewBox="0 0 64 48" aria-hidden className="shrink-0">
      <defs><linearGradient id="bars-g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="var(--grad-a, #6a3df5)" /><stop offset="1" stopColor="var(--grad-b, #fe85d0)" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((i) => { const h = 12 + i * 9; return <rect key={i} x={i * 13} y={48 - h} width="9" height={h} rx="4.5" fill={i < lit ? "url(#bars-g)" : "var(--surface-inset)"} />; })}
    </svg>
  );
}

/** One figure in the metrics panel: a quiet label over a tabular number. The first figure (balance) leads. */
function Metric({ label, value, tone, primary, icon: Icon, sub }: { label: string; value: React.ReactNode; tone?: "up" | "down" | "muted"; primary?: boolean; icon: LucideIcon; sub?: React.ReactNode }) {
  return (
    <div className={cn("d-metric", primary && "is-primary")}>
      <span className="d-metric-label truncate"><span className="d-metric-icon" aria-hidden><Icon /></span>{label}</span>
      <span className={cn("d-metric-value num truncate", tone === "up" ? "text-up-ink" : tone === "down" ? "text-down-ink" : tone === "muted" ? "text-ink-3" : "text-ink")}>{value}</span>
      {sub && <span className="d-metric-sub num truncate">{sub}</span>}
    </div>
  );
}

/** "+$120.00" in profit green, "−$80.00" in loss red, for the small today / all-time lines. */
function Signed({ v, currency }: { v: number; currency: string }) {
  return <span className={v > 0 ? "text-up-ink" : v < 0 ? "text-down-ink" : "text-ink-2"}>{fmtSignedMoney(v, currency)}</span>;
}

/**
 * Account Health and the four headline metrics (reference 1 top row). With no account every figure is an honest
 * empty state and the card offers Connect MT5; nothing is invented.
 */
export function HealthStrip(props: AccountOverviewProps) {
  const live = useLiveAccount()?.live;
  const p = live && live.balance !== null ? { ...props, balance: live.balance } : props;
  const none = p.state === "none";
  const now = useMemo(() => new Date(p.nowIso), [p.nowIso]);
  const range = useMemo(() => periodRange(p.period, now, p.timezone, p.custom), [p.period, now, p.timezone, p.custom]);
  const inPeriod = useMemo(() => p.trades.filter((t) => inRange(t, range)), [p.trades, range]);
  const m = useMemo(() => performanceMetrics(inPeriod), [inPeriod]);
  const all = useMemo(() => performanceMetrics(p.trades, p.startingEquity || null), [p.trades, p.startingEquity]);
  const health = useMemo(() => healthScore(p.trades, p.startingEquity, all), [p.trades, p.startingEquity, all]);
  // Today in the person's own time zone, from the same closed trades as every other figure.
  const today = useMemo(() => {
    const [y, mo, d] = new Intl.DateTimeFormat("en-CA", { timeZone: p.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now).split("-").map(Number);
    return performanceMetrics(p.trades.filter((t) => inRange(t, { from: zonedMidnight(y!, mo!, d!, p.timezone), to: Math.floor(now.getTime() / 1000) + 1 })));
  }, [p.trades, p.timezone, now]);
  const money = (v: number) => fmtMoney(v, p.currency, 2);
  const sample = p.state === "sample";
  const periodLabel = p.period === "CUSTOM" ? "range" : p.period === "ALL" ? "all" : p.period;
  const [narrowRing, setNarrowRing] = useState(false);
  useEffect(() => { const mq = window.matchMedia("(max-width: 639px), (min-width: 1024px) and (max-width: 1599.98px)"); const on = () => setNarrowRing(mq.matches); on(); mq.addEventListener("change", on); return () => mq.removeEventListener("change", on); }, []);
  const dash = <span className="text-ink-3">—</span>;

  return (
    <>
      <section aria-labelledby="health-title" className="dcard d-health flex items-center gap-3 p-3.5 sm:gap-3.5 sm:p-4 xl:gap-4">
        <ScoreRing score={none ? null : health.score} size={narrowRing ? 80 : 104} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="health-title" className="title-grad whitespace-nowrap text-[17px] font-semibold tracking-[-0.02em] sm:text-[20px]">Account Health</h2>
            {health.grade && !none && <span className={cn("rounded-lg px-2 py-0.5 text-[12.5px] font-semibold", GRADE_CLS[health.grade])}>{health.grade}</span>}
            {sample && <span className="rounded-lg bg-warn-soft px-2 py-0.5 text-[12px] font-semibold text-warn">Sample</span>}
          </div>
          <p className="mt-1 text-[13px] leading-snug text-ink-2 sm:text-[14px]">
            {none ? "Connect MetaTrader 4 or 5 to score your account." : health.grade ? GRADE_NOTE[health.grade] : health.reason}
          </p>
          {none && <Link href="/app/accounts" className="press bg-brand mt-3 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white shadow-[0_10px_22px_-10px_var(--accent-glow)]"><Link2 className="h-4 w-4" />Connect MT4/MT5</Link>}
          {!none && p.state !== "sample" && <p className="mt-1 truncate text-[12px] text-ink-3">{p.label}</p>}
        </div>
        <span className="block max-[379px]:hidden lg:hidden min-[1600px]:block"><ScoreBars score={none ? null : health.score} /></span>
      </section>

      <div className="d-metrics dcard" role="group" aria-label="Account metrics">
        <Metric primary icon={Wallet} label="Balance" tone={none ? "muted" : undefined} value={none || p.balance === null ? dash : <CountUp value={p.balance} format={money} />}
          sub={none ? undefined : <>Overall P&L <Signed v={all.netProfit} currency={p.currency} /></>} />
        <Metric icon={Gauge} label={`P&L (${periodLabel})`} tone={none ? "muted" : m.netProfit < 0 ? "down" : "up"}
          value={none ? dash : <CountUp value={m.netProfit} format={(v) => fmtSignedMoney(v, p.currency)} />}
          sub={none ? undefined : <>Today <Signed v={today.netProfit} currency={p.currency} /></>} />
        <Metric icon={Percent} label="Win rate" tone={none ? "muted" : undefined} value={none || m.winRate === null ? dash : <CountUp value={m.winRate * 100} format={(v) => `${v.toFixed(1)}%`} />}
          sub={none ? undefined : `${m.wins} of ${m.tradeCount} trades`} />
        <Metric icon={Scale} label="Profit factor" tone={none ? "muted" : undefined} value={none || m.profitFactor === null ? dash : fmtNumber(m.profitFactor)}
          sub={none ? undefined : p.state === "connected" ? <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-up" />MT5 connected</span> : p.state === "sample" ? "Sample account" : "MT5 connecting"} />
      </div>
    </>
  );
}
