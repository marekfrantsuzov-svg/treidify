import { Alert } from "@/components/auth/auth-ui";
import { PageHeader } from "@/components/app/status";
import { InstrumentCard } from "@/components/previews/zone-explorer";
import { providerStatus } from "@/server/providers";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Markets" };

export default async function Markets() {
  const s = await requireOnboarded("/app/markets");
  const live = providerStatus().marketData;
  const tf = s.profile.dashboardPrefs.defaultTimeframe;
  return (
    <>
      <PageHeader title="Markets" subtitle="XAUUSD and DXY, read from the 4H direction down to the 1M trigger." />
      {!live && (
        <div className="mb-4">
          <Alert tone="warn">The market-data provider is not connected yet, so there are no live prices. The charts below run the real analysis engine on generated sample candles, labelled as such, so you can explore how zones and explanations work. Tap any zone for its full explanation.</Alert>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <InstrumentCard symbol="XAUUSD" defaultTf={tf} height={340} />
        <InstrumentCard symbol="DXY" defaultTf={tf} height={340} />
      </div>
    </>
  );
}
