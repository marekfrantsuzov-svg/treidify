import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/app/status";
import { GlassIcon } from "@/components/icons/glass-icon";
import { NewsArt } from "@/components/app/dashboard/cards";
import { Alert } from "@/components/auth/auth-ui";
import { Glass } from "@/components/ui/glass";
import type { GlassIconName } from "@/components/icons/glass-icon";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Global News" };

const COVERAGE: { icon: GlassIconName; title: string; note: string; hue: string }[] = [
  { icon: "dollar", title: "Central bank policy", note: "Decisions, minutes and speakers from the Fed, ECB, BoE, BoJ and others.", hue: "from-[#1d5cf5]/30 via-[#6aa2ff]/15" },
  { icon: "yield", title: "US Treasury yields", note: "Nominal and real yields, auctions and curve moves.", hue: "from-[#1d5cf5]/25 via-[#9cc0ff]/12" },
  { icon: "markets", title: "Inflation", note: "CPI, PCE and producer prices against forecast and previous.", hue: "from-[#b7791f]/30 via-[#f5b44a]/12" },
  { icon: "community", title: "Employment", note: "Payrolls, unemployment and claims.", hue: "from-[#12a36d]/25 via-[#5fe0a6]/12" },
  { icon: "macro", title: "Global conflicts", note: "Military escalation and de-escalation that drive safe-haven flows.", hue: "from-[#e0394a]/25 via-[#ff8a5b]/12" },
  { icon: "shield", title: "Sanctions and tariffs", note: "Trade measures and sanctions affecting the dollar and commodities.", hue: "from-[#6b5bd6]/25 via-[#a99cff]/12" },
  { icon: "gold", title: "Oil supply", note: "OPEC+ decisions, inventories and supply disruptions.", hue: "from-[#b7791f]/30 via-[#e8a54b]/12" },
  { icon: "dollar", title: "Banking stress", note: "Bank failures, liquidity facilities and credit events.", hue: "from-[#e0394a]/20 via-[#f4a3ab]/12" },
  { icon: "silver", title: "Currency and debt crises", note: "Sovereign debt, ratings and currency interventions.", hue: "from-[#8f9aae]/35 via-[#c9d1de]/15" },
];

export default async function News() {
  await requireOnboarded("/app/news");
  const p = providerStatus();
  return (
    <>
      <PageHeader title="Global News" subtitle="Events that move gold, the dollar and silver, from every major region, not only the economic calendar." />
      {!p.news && <div className="mb-4"><Alert tone="warn">The news feed is not connected yet, so there are no headlines. Treidify never invents news. Each story will show its original sources, publication time, licensed photo, impact rating, and bullish and bearish scenarios for gold, the dollar and silver.</Alert></div>}
      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Link href="/app/calendar" className="glass group flex items-center gap-4 rounded-[24px] p-4">
          <GlassIcon name="calendar" size={44} />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-ink">Economic calendar</div>
            <div className="text-sm text-ink-2">Scheduled releases in your time zone, with forecast, previous and actual.</div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Glass className="p-4">
          <div className="text-[15px] font-semibold text-ink">How impact is rated</div>
          <ul className="mt-2 grid gap-1.5 text-sm text-ink-2 sm:grid-cols-3">
            {([["High", "bg-down", "Has moved gold or the dollar sharply before"], ["Medium", "bg-warn", "Can shift intraday direction"], ["Low", "bg-[var(--border-strong)]", "Context, rarely market moving"]] as const).map(([k, c, d]) => (
              <li key={k} className="flex gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${c}`} /><span><span className="font-medium text-ink">{k}.</span> {d}</span></li>
            ))}
          </ul>
        </Glass>
      </div>
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-2">Coverage</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {COVERAGE.map((c) => (
          <Glass key={c.title} className="overflow-hidden p-2">
            <NewsArt icon={c.icon} hue={c.hue} className="h-36 w-full rounded-[20px]" />
            <div className="p-3">
              <h3 className="text-[15px] font-semibold text-ink">{c.title}</h3>
              <p className="mt-1 text-sm text-ink-2">{c.note}</p>
            </div>
          </Glass>
        ))}
      </div>
    </>
  );
}
