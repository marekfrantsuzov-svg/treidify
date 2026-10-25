import { PageHeader } from "@/components/app/status";
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {COVERAGE.map((c) => (
          <Glass key={c.title} className="overflow-hidden p-2">
            <NewsArt icon={c.icon} hue={c.hue} className="h-36 w-full rounded-[20px]" />
            <div className="p-3">
              <h2 className="text-[15px] font-semibold text-ink">{c.title}</h2>
              <p className="mt-1 text-sm text-ink-2">{c.note}</p>
            </div>
          </Glass>
        ))}
      </div>
    </>
  );
}
