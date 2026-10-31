import { cn } from "@/lib/cn";
import { fmtMoney, fmtNumber, fmtSignedMoney } from "@/lib/format";
import type { Group } from "@/lib/analytics";
import { Glass } from "@/components/ui/glass";

export function Panel({ title, note, children, className }: { title: string; note?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Glass className={cn("@container min-w-0 p-4 sm:p-5", className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {note && <span className="text-xs text-ink-3">{note}</span>}
      </div>
      {children}
    </Glass>
  );
}

export function Tile({ label, value, tone, sub }: { label: string; value: string; tone?: "up" | "down"; sub?: string }) {
  return (
    <div className="inset min-w-0 rounded-2xl p-3.5">
      <div className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className={cn("num mt-1 truncate text-lg font-semibold tracking-[-0.02em] text-ink", tone === "up" && "text-up", tone === "down" && "text-down")}>{value}</div>
      {sub && <div className="num mt-0.5 truncate text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

/** Drawdown from peak as a filled area. Server-rendered; values are percentages at or below zero. */
export function DrawdownChart({ points, height = 120 }: { points: { t: number; dd: number }[]; height?: number }) {
  if (points.length < 2) return <p className="text-sm text-ink-3">Not enough trades in this period.</p>;
  const min = Math.min(-0.5, ...points.map((p) => p.dd));
  const x = (i: number) => (i / (points.length - 1)) * 100;
  const y = (v: number) => (v / min) * 100;
  const line = points.map((p, i) => `${x(i)},${y(p.dd)}`).join(" ");
  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label={`Drawdown from peak, worst ${fmtNumber(min, 1)}%`}>
        <polygon points={`0,0 ${line} 100,0`} fill="color-mix(in oklab, var(--down) 18%, transparent)" />
        <polyline points={line} fill="none" stroke="var(--down)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-ink-3"><span>0%</span><span className="num">Worst {fmtNumber(min, 1)}%</span></div>
    </div>
  );
}

export function MonthBars({ months, currency }: { months: { month: string; label: string; net: number; trades: number }[]; currency: string }) {
  if (!months.length) return <p className="text-sm text-ink-3">No closed trades yet.</p>;
  const max = Math.max(...months.map((m) => Math.abs(m.net))) || 1;
  // Only split the chart around zero when both profitable and losing months exist.
  const hasUp = months.some((m) => m.net > 0), hasDown = months.some((m) => m.net < 0);
  return (
    <div className="flex h-44 items-stretch gap-1.5" role="list" aria-label="Net profit by month">
      {months.map((m) => (
        <div key={m.month} role="listitem" className="group flex min-w-0 flex-1 flex-col items-center" title={`${m.label}: ${fmtSignedMoney(m.net, currency, 0)} over ${m.trades} trades`}>
          <div className="flex w-full flex-1 flex-col">
            {hasUp && <div className="flex flex-1 items-end">{m.net > 0 && <div className="w-full rounded-t-md bg-up/80 group-hover:bg-up" style={{ height: `${(m.net / max) * 100}%` }} />}</div>}
            {hasDown && <div className={cn("flex flex-1 items-start", hasUp && "border-t border-line")}>{m.net < 0 && <div className="w-full rounded-b-md bg-down/80 group-hover:bg-down" style={{ height: `${(-m.net / max) * 100}%` }} />}</div>}
          </div>
          <span className="mt-1 truncate text-[10px] text-ink-3">{m.label}</span>
          <span className="sr-only">{fmtSignedMoney(m.net, currency, 0)}</span>
        </div>
      ))}
    </div>
  );
}

export function GroupTable({ groups, currency, first }: { groups: Group[]; currency: string; first: string }) {
  if (!groups.length) return <p className="text-sm text-ink-3">No trades in this period.</p>;
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-[0.08em] text-ink-3">
          <th className="px-1 py-1.5 font-medium">{first}</th><th className="px-1 py-1.5 text-right font-medium">Trades</th><th className="px-1 py-1.5 text-right font-medium">Win rate</th><th className="px-1 py-1.5 text-right font-medium">PF</th><th className="px-1 py-1.5 text-right font-medium">Net</th>
        </tr></thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.key} className="border-t border-line">
              <td className="px-1 py-2 font-medium text-ink">{g.label}</td>
              <td className="num px-1 py-2 text-right text-ink-2">{g.metrics.tradeCount}</td>
              <td className="num px-1 py-2 text-right text-ink-2">{g.metrics.winRate === null ? "—" : `${Math.round(g.metrics.winRate * 100)}%`}</td>
              <td className="num px-1 py-2 text-right text-ink-2">{g.metrics.profitFactor === null ? "—" : fmtNumber(g.metrics.profitFactor)}</td>
              <td className={cn("num px-1 py-2 text-right font-medium", g.metrics.netProfit >= 0 ? "text-up" : "text-down")}>{fmtSignedMoney(g.metrics.netProfit, currency, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const money0 = (v: number | null, c: string) => (v === null ? "—" : fmtMoney(v, c, 0));
