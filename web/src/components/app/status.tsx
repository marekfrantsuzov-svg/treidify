import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";
import { Pill } from "@/components/ui/pill";

/** An honest empty or not-connected state: what this card will show, why it is empty, and the next real step. */
export function StatusCard({ title, icon, status, children, action, className }: {
  title: string; icon?: React.ReactNode; status: string; children: React.ReactNode; action?: { href: string; label: string }; className?: string;
}) {
  return (
    <Glass className={cn("flex flex-col p-5", className)}>
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

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {children}
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
