import { PageHeader } from "@/components/app/status";
import { MarketsWorkspace } from "@/components/terminal/markets-workspace";
import type { ChartTf, Layer } from "@/components/terminal/terminal-chart";
import { loadIntel } from "@/server/market/load";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Markets" };

const LAYER_IDS: Layer[] = ["zones", "fib", "liquidity", "structure", "volume"];
const TFS: ChartTf[] = ["5M", "15M", "1H", "4H"];

export default async function Markets({ searchParams }: { searchParams: Promise<{ symbol?: string; layers?: string; tf?: string }> }) {
  await requireOnboarded("/app/markets");
  const [s, sp] = await Promise.all([loadIntel(), searchParams]);
  const sym = sp.symbol === "DXY" || sp.symbol === "XAGUSD" ? sp.symbol : "XAUUSD";
  // ?layers=zones,fib deep-links a set of overlays; otherwise zones and structure start on.
  const asked = (sp.layers ?? "").split(",").filter((x): x is Layer => (LAYER_IDS as string[]).includes(x));
  const layers = asked.length ? Object.fromEntries(LAYER_IDS.map((l) => [l, asked.includes(l)])) : { zones: true, structure: true };
  const tf = (TFS as string[]).includes(sp.tf ?? "") ? (sp.tf as ChartTf) : "1H";
  return (
    <>
      <PageHeader title="Markets" subtitle="Gold, DXY and Silver with zones, Fibonacci, liquidity, structure and volume computed for the timeframe on screen." />
      {s.mode === "sample" && <p className="mb-3 rounded-xl bg-warn-soft px-3.5 py-2 text-[12.5px] leading-snug text-ink-2">{s.message}</p>}
      <MarketsWorkspace initial={s} initialSym={sym} initialLayers={layers} initialTf={tf} />
    </>
  );
}
