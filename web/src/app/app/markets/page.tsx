import { Alert } from "@/components/auth/auth-ui";
import { PageHeader } from "@/components/app/status";
import { ChartWorkspace } from "@/components/intel/chart-workspace";
import { loadIntel } from "@/server/market/load";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Markets" };

export default async function Charts({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  await requireOnboarded("/app/markets");
  const [s, sp] = await Promise.all([loadIntel(), searchParams]);
  const sym = sp.symbol === "DXY" || sp.symbol === "XAGUSD" ? sp.symbol : "XAUUSD";
  return (
    <>
      <PageHeader title="Markets" subtitle="Charts for Gold, DXY and Silver. Zoom, pan and toggle zones, Fibonacci, liquidity and structure." />
      {s.message && <div className="mb-4"><Alert tone="warn">{s.message}</Alert></div>}
      <ChartWorkspace snap={s} initial={sym} />
    </>
  );
}
