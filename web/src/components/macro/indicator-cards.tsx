import { ArrowRight, Landmark, Layers, Percent } from "lucide-react";
import Link from "next/link";
import type { MacroBundle } from "@/server/macro/service";
import { cn } from "@/lib/cn";

const META = { rates: { icon: Landmark, label: "Rates" }, inflation: { icon: Percent, label: "Inflation" }, gdp: { icon: Layers, label: "GDP" } } as const;
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Rates, Inflation and GDP from official sources. Each card opens its detail view with history and implications. */
export function IndicatorCards({ m, tz }: { m: MacroBundle; tz: string }) {
  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
      {(["rates", "inflation", "gdp"] as const).map((id) => {
        const x = m[id], I = META[id].icon;
        return (
          <Link key={id} href={`/app/macro/${id}`} className="dcard dcard-pad lift group flex flex-col transition-[border-color] hover:border-[var(--border-strong)]" aria-label={`${META[id].label}: ${x.value ?? "unavailable"}. Open details`}>
            <div className="flex items-center gap-2.5">
              <span className="sent-icon" aria-hidden><I /></span>
              <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-semibold text-ink">{META[id].label}</span><span className="block truncate text-[11.5px] text-ink-3">{x.measure}</span></span>
              <ArrowRight className="h-4 w-4 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </div>
            {x.ok ? (
              <>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="num text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">{x.value}</span>
                  <span className="truncate text-right text-[12px] text-ink-3">{x.period}</span>
                </div>
                <dl className="mt-3 grid gap-1 text-[12px]">
                  <div className="flex justify-between gap-2"><dt className="text-ink-3">{x.previousLabel}</dt><dd className="num font-medium text-ink-2">{x.previous ?? "—"}</dd></div>
                  {x.facts[0] && <div className="flex justify-between gap-2"><dt className="shrink-0 text-ink-3">{x.facts[0].label}</dt><dd className="num truncate text-right font-medium text-ink-2">{x.facts[0].value}</dd></div>}
                  <div className="flex justify-between gap-2"><dt className="text-ink-3">{id === "rates" ? "Last decision" : "Published"}</dt><dd className="font-medium text-ink-2">{x.releasedOn ? day(x.releasedOn) : "—"}</dd></div>
                  {x.next && <div className="flex justify-between gap-2"><dt className="text-ink-3">Next</dt><dd className="font-medium text-ink-2">{new Date(x.next.at).toLocaleString("en-GB", { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd></div>}
                </dl>
                <p className={cn("mt-auto pt-3 text-[11px] leading-snug text-ink-3")}>{x.source.name}</p>
              </>
            ) : <p className="mt-3 rounded-xl border border-dashed border-line px-3 py-2.5 text-[12.5px] leading-snug text-ink-3">{x.message}</p>}
          </Link>
        );
      })}
    </div>
  );
}
