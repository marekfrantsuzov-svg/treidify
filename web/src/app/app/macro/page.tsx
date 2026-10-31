import { PageHeader, StatusCard } from "@/components/app/status";
import { GlassIcon } from "@/components/icons/glass-icon";
import { InstrumentCard } from "@/components/previews/zone-explorer";
import { Alert } from "@/components/auth/auth-ui";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Macro Desk" };

export default async function Macro() {
  const s = await requireOnboarded("/app/macro");
  const p = providerStatus();
  const tf = s.profile.dashboardPrefs.defaultTimeframe;
  return (
    <>
      <PageHeader title="Macro Desk" subtitle="Gold, the dollar, silver and yields, read together from the 4H direction to the 1M trigger." />
      {!p.marketData && <div className="mb-4"><Alert tone="warn">Market data is not connected, so the charts below use labelled sample candles. Bias, zones and explanations come from the real engine.</Alert></div>}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-2">
        <div id="xauusd"><InstrumentCard symbol="XAUUSD" defaultTf={tf} height={300} /></div>
        <div id="dxy"><InstrumentCard symbol="DXY" defaultTf={tf} height={300} /></div>
        <div id="silver"><InstrumentCard symbol="XAGUSD" defaultTf={tf} height={300} /></div>
        <div id="us10y" className="grid gap-4">
          <StatusCard title="US 10-year and real yields" icon={<GlassIcon name="yield" size={32} />} status={p.marketData ? "Live" : "Data not connected"}>
            Nominal 10-year Treasury yields and 10-year real (TIPS) yields come from official sources such as the US Treasury and FRED. Rising real yields usually weigh on gold; the desk will show the current reading, its trend and how it agrees or conflicts with the gold and dollar bias.
          </StatusCard>
          <StatusCard title="Ask the Macro Desk" icon={<GlassIcon name="ai" size={32} />} status={p.ai ? "Ready" : "AI not connected"}>
            Ask why gold is moving, what the dollar is doing or how an event could matter. Answers use only the data on this desk and cite it, with supporting and conflicting evidence side by side.
          </StatusCard>
        </div>
      </div>
    </>
  );
}
