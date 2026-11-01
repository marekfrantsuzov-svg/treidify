import "server-only";
import { INSTRUMENT_LIST, type AssetCategory, type StopUnit } from "@/lib/markets/registry";
import { SESSION_LABEL } from "@/lib/markets/sessions";
import { coverageMap, type CoverageState } from "./coverage";
import { marketDataStatus } from "./service";

/** What the instrument picker needs, as plain serialisable data (no RegExps reach the browser). */
export interface CatalogItem {
  symbol: string; name: string; short: string; category: AssetCategory; digits: number;
  unit: StopUnit; unitSize: number; quote: string; session: string;
  /** "sample" while no provider is connected; otherwise the verified coverage state. */
  coverage: CoverageState | "sample";
  vendorSymbol: string | null;
  feedNote: string | null;
}

/**
 * The instruments a user may pick. With a provider connected, instruments the provider has refused are left out, so
 * the picker only offers what the plan serves (unchecked ones are offered and labelled until the first request checks them).
 */
export async function instrumentCatalog(): Promise<{ items: CatalogItem[]; configured: boolean; hidden: number }> {
  const configured = marketDataStatus().configured;
  const cov = configured ? await coverageMap() : {};
  const all = INSTRUMENT_LIST.map((i): CatalogItem => ({
    symbol: i.symbol, name: i.name, short: i.short, category: i.category, digits: i.digits,
    unit: i.move.unit, unitSize: i.move.size, quote: i.quote, session: SESSION_LABEL[i.session],
    coverage: configured ? cov[i.symbol]?.state ?? "unchecked" : "sample",
    vendorSymbol: configured ? cov[i.symbol]?.vendorSymbol ?? null : null,
    feedNote: i.feedNote ?? null,
  }));
  const items = all.filter((i) => i.coverage !== "unavailable");
  return { items, configured, hidden: all.length - items.length };
}
