/**
 * Deterministic tagging of headlines and calendar events. Keyword rules, not AI: the UI labels these as automatic tags.
 */
export type Instrument = "XAUUSD" | "DXY" | "XAGUSD";
const RULES: { re: RegExp; tags: Instrument[] }[] = [
  { re: /\bgold\b|\bxau|bullion|precious metal/i, tags: ["XAUUSD"] },
  { re: /\bsilver\b|\bxag/i, tags: ["XAGUSD"] },
  { re: /\bdollar\b|\bdxy\b|\bgreenback|\bfed\b|federal reserve|fomc|powell|treasur|yields?\b|\bcpi\b|inflation|payroll|\bnfp\b|jobless|\bppi\b|\bgdp\b|retail sales/i, tags: ["DXY", "XAUUSD"] },
  { re: /geopolit|war\b|missile|sanction|middle east|ukraine|safe[- ]haven/i, tags: ["XAUUSD"] },
];
const HIGH = /fomc|fed(eral)? (funds|interest)|rate decision|interest rate|\bcpi\b|consumer price|non[- ]?farm|\bnfp\b|payrolls|\bppi\b|producer price|\bgdp\b|powell|press conference|pce/i;
const MEDIUM = /retail sales|ism|pmi|jobless|unemployment|jolts|durable|consumer confidence|michigan|speech|speaks|minutes/i;

export function tagInstruments(text: string): Instrument[] {
  return [...new Set(RULES.filter((r) => r.re.test(text)).flatMap((r) => r.tags))];
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
