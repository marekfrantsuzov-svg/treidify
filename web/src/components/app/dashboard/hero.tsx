import { MarketStatusChips } from "@/components/app/app-shell";

/** Page hero: date, greeting and live market status, with an optional control (account picker) on the right. */
export function DashboardHero({ greeting, name, timezone, children }: { greeting: string; name: string; timezone: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-0.5 pt-1">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-3" suppressHydrationWarning>{new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(new Date())}</p>
        <h1 className="mt-0.5 text-[28px] font-semibold leading-[1.1] tracking-[-0.04em] text-ink sm:text-[34px]">{greeting}, <span className="text-brand">{name}</span></h1>
        <div className="mt-2.5"><MarketStatusChips /></div>
      </div>
      {children}
    </header>
  );
}
