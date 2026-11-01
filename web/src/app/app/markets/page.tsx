import { PageHeader } from "@/components/app/status";
import { MarketsWorkspace } from "@/components/terminal/markets-workspace";
import type { ChartTf, Layer } from "@/components/terminal/terminal-chart";
import { loadDesk } from "@/server/market/load";
import { instrumentCatalog } from "@/server/market/catalog";
import { marketPrefs } from "@/server/market/prefs";
import { isSymbol } from "@/lib/markets/registry";
import { requireOnboarded } from "@/server/session";

export const metadata = { title: "Markets" };

const LAYER_IDS: Layer[] = ["zones", "fib", "liquidity", "structure", "volume"];
const TFS: ChartTf[] = ["5M", "15M", "1H", "4H"];

export default async function Markets({ searchParams }: { searchParams: Promise<{ symbol?: string; layers?: string; tf?: string }> }) {
  const session = await requireOnboarded("/app/markets");
  const [prefs, sp, catalog] = await Promise.all([marketPrefs(session.user.id), searchParams, instrumentCatalog()]);
  // Tabs are the user's three Macro Desk markets; any other supported instrument opens as a fourth tab.
  const asked = (sp.symbol ?? "").toUpperCase();
  const sym = isSymbol(asked) ? asked : prefs.desk[0]!;
  const tabs = prefs.desk.includes(sym) ? prefs.desk : [...prefs.desk, sym];
  const s = await loadDesk(tabs);
  // ?layers=zones,fib deep-links a set of overlays; otherwise zones and structure start on.
  const wanted = (sp.layers ?? "").split(",").filter((x): x is Layer => (LAYER_IDS as string[]).includes(x));
  const layers = wanted.length ? Object.fromEntries(LAYER_IDS.map((l) => [l, wanted.includes(l)])) : { zones: true, structure: true };
  const tf = (TFS as string[]).includes(sp.tf ?? "") ? (sp.tf as ChartTf) : "1H";
  return (
    <>
      <PageHeader title="Markets" subtitle="Your Macro Desk markets, or any supported instrument, with zones, Fibonacci, liquidity, structure and volume computed for the timeframe on screen." />
      {s.mode === "sample" && <p className="mb-3 rounded-xl bg-warn-soft px-3.5 py-2 text-[12.5px] leading-snug text-ink-2">{s.message}</p>}
      <MarketsWorkspace initial={s} initialSym={sym} tabs={tabs} catalog={catalog.items} favorites={prefs.favorites} initialLayers={layers} initialTf={tf} />
    </>
  );
}
