/**
 * Deterministic tagging of headlines and calendar events. Keyword rules, not AI: the UI labels these as automatic tags.
 */
import { INSTRUMENT_LIST } from "@/lib/markets/registry";

/** Any registry symbol. Each instrument's own keyword rule lives in the registry. */
export type Instrument = string;
const HIGH = /fomc|fed(eral)? (funds|interest)|rate decision|interest rate|\bcpi\b|consumer price|non[- ]?farm|\bnfp\b|payrolls|\bppi\b|producer price|\bgdp\b|powell|press conference|pce/i;
const MEDIUM = /retail sales|ism|pmi|jobless|unemployment|jolts|durable|consumer confidence|michigan|speech|speaks|minutes/i;

export function tagInstruments(text: string): Instrument[] {
  const tags = new Set(INSTRUMENT_LIST.filter((i) => i.keywords.test(text)).map((i) => i.symbol));
  // US macro news moves Gold through the dollar: keep tagging it for Gold, as before the multi-asset registry.
  if (tags.has("DXY")) tags.add("XAUUSD");
  return [...tags];
}

/** Calendar importance: the vendor's impact if given, otherwise our keyword rule. */
export function eventImportance(title: string, vendorImpact?: string): "high" | "medium" | "low" {
  const v = vendorImpact?.toLowerCase();
  if (v === "high" || v === "medium" || v === "low") return HIGH.test(title) && v !== "high" ? "high" : v;
  return HIGH.test(title) ? "high" : MEDIUM.test(title) ? "medium" : "low";
}

export function headlineImportance(text: string): "high" | "medium" | "low" {
  return HIGH.test(text) ? "high" : MEDIUM.test(text) ? "medium" : "low";
}

/** Which tracked macro release an event is, if any. */
export function trackedKind(title: string): "CPI" | "PPI" | "NFP" | "FOMC" | "Rate decision" | "Central bank speech" | "GDP" | "PCE" | null {
  if (/fomc|fed(eral)? funds/i.test(title)) return "FOMC";
  if (/interest rate decision|rate decision|policy rate/i.test(title)) return "Rate decision";
  if (/\bcpi\b|consumer price/i.test(title)) return "CPI";
  if (/\bppi\b|producer price/i.test(title)) return "PPI";
  if (/non[- ]?farm|\bnfp\b|payrolls/i.test(title)) return "NFP";
  if (/\bpce\b/i.test(title)) return "PCE";
  if (/\bgdp\b/i.test(title)) return "GDP";
  if (/speech|speaks|testimony|press conference/i.test(title) && /fed|ecb|boe|boj|powell|lagarde|bailey|ueda|governor|chair/i.test(title)) return "Central bank speech";
  return null;
}
