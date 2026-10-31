import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { GlassIcon, type GlassIconName } from "@/components/icons/glass-icon";
import { cn } from "@/lib/cn";

const account = [
  { title: "MT4 / MT5 sync", body: "Read-only connection keeps balance, positions and history current", href: "/account-health", icon: "link" as GlassIconName },
  { title: "Performance analytics", body: "Server-calculated P&L, win rate, drawdown and Health score", href: "/account-health", icon: "markets" as GlassIconName },
  { title: "Automatic journal", body: "Every trade logged, tagged and filterable", href: "/journal", icon: "journal" as GlassIconName },
];
const market = [
  { title: "Macro Desk + global news", body: "Gold, DXY, yields and sourced events with scenarios", href: "/macro-desk", icon: "macro" as GlassIconName },
  { title: "Key zones engine", body: "Multi-timeframe structure, zones and liquidity", href: "/market-intelligence", icon: "coach" as GlassIconName },
];

function Node({ title, body, href, icon, side }: (typeof account)[number] & { side: "l" | "r" }) {
  return (
    <Link href={href} className="glass group relative flex items-start gap-3 rounded-3xl p-4 transition-transform duration-300 hover:-translate-y-0.5">
      <GlassIcon name={icon} size={38} />
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{body}</span>
      </span>
      <span aria-hidden className={cn("absolute top-1/2 hidden h-px w-10 bg-[linear-gradient(90deg,transparent,var(--accent))] lg:block", side === "l" ? "-right-10" : "-left-10 rotate-180")} />
    </Link>
  );
}

/** Account data (left) and market context (right) both feed the coach in the centre. */
export function EcosystemDiagram({ className }: { className?: string }) {
  return (
    <div className={cn("grid items-center gap-6 lg:grid-cols-[1fr_1.05fr_1fr] lg:gap-10", className)}>
      <div className="grid gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Your account</p>
        {account.map((n) => <Node key={n.title} {...n} side="l" />)}
      </div>
      <Link href="/ai-coach" className="glass group relative overflow-hidden rounded-[32px] p-7 text-center transition-transform duration-300 hover:-translate-y-1">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(18rem_12rem_at_50%_0%,var(--glow-a),transparent_70%)]" />
        <span className="relative mx-auto block w-fit"><GlassIcon name="coach" size={72} active /></span>
        <div className="relative mt-5 text-xl font-semibold tracking-[-0.02em] text-ink">AI Trading Coach</div>
        <p className="relative mx-auto mt-2 max-w-xs text-sm text-ink-2">Reads your verified trades in the context of structure and macro events, then turns them into reviews, rules and a personal improvement plan.</p>
        <span className="relative mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent">See the coach <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
      </Link>
      <div className="grid gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3 lg:text-right">The market</p>
        {market.map((n) => <Node key={n.title} {...n} side="r" />)}
      </div>
    </div>
  );
}
