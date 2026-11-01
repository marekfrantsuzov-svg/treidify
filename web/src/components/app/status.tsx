import { ArrowRight, Bell, BookOpen, ChartLine, ChartNoAxesColumn, Globe2, HeartPulse, Inbox, Link2, Newspaper, Settings, Sparkles, UsersRound, WandSparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";
import { Pill } from "@/components/ui/pill";

/** An honest empty or not-connected state: what this card will show, why it is empty, and the next real step. */
export function StatusCard({ title, icon, status, children, action, className }: {
  title: string; icon?: React.ReactNode; status: string; children: React.ReactNode; action?: { href: string; label: string }; className?: string;
}) {
  return (
    <Glass className={cn("lift flex flex-col p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-ink">{icon}{title}</h2>
        <Pill>{status}</Pill>
      </div>
      <div className="mt-3 flex-1 text-sm leading-relaxed text-ink-2">{children}</div>
      {action && (
        <Link href={action.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
          {action.label}<ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </Glass>
  );
}

const PAGE_ICON: Record<string, LucideIcon> = {
  Community: UsersRound, "Trading Journal": BookOpen, "AI Coach": Sparkles, "Macro Desk": Globe2, Markets: ChartNoAxesColumn, "Market Intelligence": ChartLine,
  Performance: HeartPulse, Notifications: Bell, Settings: Settings, "News & Calendar": Newspaper, "AI Chart Analysis": WandSparkles, "Account connections": Link2,
};

/** Page title with its section icon, a one-line purpose and optional actions on the right. Same on every app page. */
export function PageHeader({ title, subtitle, children, icon }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode; icon?: LucideIcon }) {
  const Icon = icon ?? PAGE_ICON[title];
  return (
    <div className="page-head mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div className="flex min-w-0 items-center gap-3.5">
        {Icon && <span className="page-icon" aria-hidden><Icon /></span>}
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-[30px] tracking-[-0.03em] text-ink sm:text-[28px] sm:leading-[34px]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[14px] leading-snug text-ink-2 sm:text-[15px]">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/** One empty / not-connected state for the whole app: icon, what is missing, the credentials it needs, the next step. */
export function EmptyState({ icon: Icon = Inbox, title, children, needs, action, compact }: {
  icon?: LucideIcon; title: string; children?: React.ReactNode; needs?: string[]; action?: { href: string; label: string }; compact?: boolean;
}) {
  return (
    <div className={cn("empty-state", compact && "is-compact")}>
      <span className="empty-orb" aria-hidden><Icon /></span>
      <p className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-[46ch] text-[13px] leading-snug text-ink-2">{children}</p>}
      {needs?.length ? <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">{needs.map((n) => <code key={n} className="rounded-md bg-[var(--surface-inset)] px-1.5 py-0.5 text-[11px] text-ink-2 ring-1 ring-[var(--border)]">{n}</code>)}</div> : null}
      {action && <Link href={action.href} className="press bg-brand mt-3.5 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white shadow-[0_10px_22px_-10px_var(--accent-glow)]">{action.label}<ArrowRight className="h-4 w-4" /></Link>}
    </div>
  );
}

/** Slim, non-blocking prompt shown above a fully laid-out page whose figures read zero until MetaTrader is connected. */
export function ConnectStrip({ text = "Not connected. Figures read zero until MT5 syncs." }: { text?: string }) {
  return (
    <Glass className="mb-4 flex items-center gap-3 rounded-[20px] py-2.5 pl-3.5 pr-2">
      <span className="h-2 w-2 shrink-0 rounded-full bg-ink-3" aria-hidden />
      <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink-2">{text}</p>
      <Link href="/app/accounts" className="press bg-brand inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[12.5px] font-semibold text-white shadow-[0_8px_18px_-8px_var(--accent-glow)]">Connect MT5<ArrowRight className="h-3.5 w-3.5" /></Link>
    </Glass>
  );
}
