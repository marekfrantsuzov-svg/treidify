/**
 * Treidify instrument registry. Pure data, safe to import on the server and in the browser.
 *
 * Every instrument carries its own conventions: price precision, tick size, the unit a stop is measured in (pip or
 * point), a typical MT5 contract size, its trading session, which data-provider symbols may carry it, and whether the
 * provider reports volume. Nothing in the app may assume Gold's conventions for another market.
 *
 * Coverage is NOT assumed. `providers.twelvedata.candidates` lists the vendor symbols that may carry the instrument;
 * which one (if any) the configured plan actually serves is verified at runtime by src/server/market/coverage.ts and
 * by every bar request. Unverified or unavailable instruments are labelled as such and never filled with guesses.
 *
 * Adding an instrument is one entry in INSTRUMENT_LIST: no other file changes.
 */

export type AssetCategory = "forex" | "metals" | "indices" | "crypto" | "commodities" | "macro";
export const CATEGORIES: { id: AssetCategory; label: string }[] = [
  { id: "forex", label: "Forex" },
  { id: "metals", label: "Metals" },
  { id: "indices", label: "Indices" },
  { id: "crypto", label: "Crypto" },
  { id: "commodities", label: "Commodities" },
  { id: "macro", label: "Macro" },
];

/**
 * When the market trades. Data timestamps are compared with this to decide "closed" versus "stale".
 * fx: Sunday 17:00 to Friday 17:00 New York, daily 17:00–18:00 break (spot FX and metals, CME energy).
 * crypto: 24/7. *-cash: the exchange's regular session for a cash index (holidays are not modelled).
 */
export type SessionId = "fx" | "crypto" | "us-cash" | "de-cash" | "uk-cash" | "jp-cash";

/** How the provider's volume should be read for this instrument. */
export type VolumeKind = "tick" | "exchange" | "none";

export type StopUnit = "pip" | "point";

export interface InstrumentDef {
  /** Canonical Treidify symbol, as traders write it (MT5 style). */
  symbol: string;
  name: string;
  /** Short display name used on cards. */
  short: string;
  category: AssetCategory;
  /** Decimal places for display. */
  digits: number;
  /** Smallest price increment the feed quotes. */
  tickSize: number;
  /** Unit a stop or target distance is quoted in, and its size in price. */
  move: { unit: StopUnit; size: number };
  /**
   * Maximum structural stop, in `move` units. Only Gold has one (the 50-pip house rule). Do not add one for another
   * market without an explicit, documented rule.
   */
  maxStop: number | null;
  /** Currency the price is quoted in (P&L per lot is in this currency before conversion). */
  quote: string;
  /** Typical MT5 contract size per 1.0 lot. Brokers differ: an account's symbol specification always overrides this. */
  contract: { size: number; unit: string };
  session: SessionId;
  volume: VolumeKind;
  /**
   * Expected relationship with the US Dollar Index, used only as a structural prior that the engine then measures:
   * "inverse" (USD is the quote currency), "direct" (USD is the base). null: no structural link, DXY is not scored.
   */
  dxyLink: "inverse" | "direct" | null;
  /** Data-provider symbol candidates, best first. `computed` means Treidify computes it from components (DXY). */
  providers: { twelvedata: { candidates: string[]; computed?: "ice-dxy" } };
  /** Known differences between the provider feed and what a broker shows for the same name. */
  feedNote?: string;
  /** Broker spellings that map to this instrument (case-insensitive, suffixes are stripped first). */
  aliases?: string[];
  /** Words that tag a headline as relevant to this instrument. */
  keywords: RegExp;
  /** Calendar countries whose releases move this instrument. */
  calendar: string[];
  /** Sample-bar profile for previews while no provider is connected (always labelled "Sample"). */
  sample: { ref: number; vol: number };
}

const FX_NOTE = "Spot FX from the data provider is a composite quote. Your broker's bid/ask can differ by its spread.";
const IDX_NOTE = "The data provider carries the cash index, which only updates during the exchange session. Broker CFDs on this index often trade nearly 24 hours, so prices outside the session can differ.";
const CRYPTO_NOTE = "Crypto prices are aggregated across exchanges by the data provider; a broker CFD can differ.";

const fx = (base: string, quote: string, name: string, o: { ref: number; vol?: number; keywords: RegExp; calendar: string[] }): InstrumentDef => {
  const jpy = quote === "JPY";
  return {
    symbol: `${base}${quote}`, name, short: `${base}/${quote}`, category: "forex",
    digits: jpy ? 3 : 5, tickSize: jpy ? 0.001 : 0.00001, move: { unit: "pip", size: jpy ? 0.01 : 0.0001 }, maxStop: null,
    quote, contract: { size: 100_000, unit: base }, session: "fx", volume: "tick",
    dxyLink: quote === "USD" ? "inverse" : base === "USD" ? "direct" : null,
    providers: { twelvedata: { candidates: [`${base}/${quote}`] } }, feedNote: FX_NOTE,
    keywords: o.keywords, calendar: o.calendar, sample: { ref: o.ref, vol: o.vol ?? 0.0012 },
  };
};

const USD = /\bdollar\b|\bgreenback|\bfed\b|federal reserve|fomc|powell|treasur|\bcpi\b|payroll|\bnfp\b|jobless/i;
const EUR = /\beuro\b|\becb\b|lagarde|eurozone|euro area|\beur\b/i;
const GBP = /\bpound\b|sterling|\bboe\b|bank of england|bailey|\bgbp\b|\buk\b/i;
const JPY = /\byen\b|\bboj\b|bank of japan|ueda|\bjpy\b|japan/i;
const CHF = /\bfranc\b|\bsnb\b|swiss/i;
const CAD = /canad|loonie|\bboc\b|bank of canada/i;
const AUD = /aussie|australia|\brba\b|\baud\b/i;
const NZD = /\bkiwi\b|new zealand|\brbnz\b/i;
const OIL = /\boil\b|crude|opec|\bwti\b|brent|barrel/i;
const either = (...r: RegExp[]) => new RegExp(r.map((x) => x.source).join("|"), "i");

export const INSTRUMENT_LIST: InstrumentDef[] = [
  // ── Metals ──
  {
    symbol: "XAUUSD", name: "Gold / US Dollar", short: "Gold", category: "metals", digits: 2, tickSize: 0.01,
    // House convention (Marek, 2026-11-01): 1 pip = $0.10, max structural stop 50 pips ($5.00). Gold only.
    move: { unit: "pip", size: 0.1 }, maxStop: 50, quote: "USD", contract: { size: 100, unit: "oz" }, session: "fx", volume: "tick",
    dxyLink: "inverse", providers: { twelvedata: { candidates: ["XAU/USD"] } }, aliases: ["GOLD", "XAUUSDT"],
    keywords: /\bgold\b|\bxau|bullion|precious metal|safe[- ]haven|geopolit|war\b|missile|sanction|middle east|ukraine/i, calendar: ["US"], sample: { ref: 3920, vol: 0.0042 },
  },
  {
    symbol: "XAGUSD", name: "Silver / US Dollar", short: "Silver", category: "metals", digits: 3, tickSize: 0.001,
    move: { unit: "pip", size: 0.001 }, maxStop: null, quote: "USD", contract: { size: 5000, unit: "oz" }, session: "fx", volume: "tick",
    dxyLink: "inverse", providers: { twelvedata: { candidates: ["XAG/USD"] } }, aliases: ["SILVER"],
    keywords: /\bsilver\b|\bxag|precious metal/i, calendar: ["US"], sample: { ref: 47.2, vol: 0.0065 },
  },
  {
    symbol: "XPTUSD", name: "Platinum / US Dollar", short: "Platinum", category: "metals", digits: 2, tickSize: 0.01,
    move: { unit: "point", size: 0.1 }, maxStop: null, quote: "USD", contract: { size: 100, unit: "oz" }, session: "fx", volume: "tick",
    dxyLink: "inverse", providers: { twelvedata: { candidates: ["XPT/USD"] } }, aliases: ["PLATINUM"],
    keywords: /platinum|\bxpt/i, calendar: ["US"], sample: { ref: 1580, vol: 0.006 },
  },
  {
    symbol: "XPDUSD", name: "Palladium / US Dollar", short: "Palladium", category: "metals", digits: 2, tickSize: 0.01,
    move: { unit: "point", size: 0.1 }, maxStop: null, quote: "USD", contract: { size: 100, unit: "oz" }, session: "fx", volume: "tick",
    dxyLink: "inverse", providers: { twelvedata: { candidates: ["XPD/USD"] } }, aliases: ["PALLADIUM"],
    keywords: /palladium|\bxpd/i, calendar: ["US"], sample: { ref: 1420, vol: 0.008 },
  },

  // ── Forex majors ──
  fx("EUR", "USD", "Euro / US Dollar", { ref: 1.162, keywords: either(EUR, USD), calendar: ["EU", "DE", "US"] }),
  fx("GBP", "USD", "British Pound / US Dollar", { ref: 1.334, keywords: either(GBP, USD), calendar: ["GB", "US"] }),
  fx("USD", "JPY", "US Dollar / Japanese Yen", { ref: 152.4, keywords: either(JPY, USD), calendar: ["JP", "US"] }),
  fx("USD", "CHF", "US Dollar / Swiss Franc", { ref: 0.802, keywords: either(CHF, USD), calendar: ["CH", "US"] }),
  fx("USD", "CAD", "US Dollar / Canadian Dollar", { ref: 1.398, keywords: either(CAD, USD, OIL), calendar: ["CA", "US"] }),
  fx("AUD", "USD", "Australian Dollar / US Dollar", { ref: 0.655, keywords: either(AUD, USD), calendar: ["AU", "CN", "US"] }),
  fx("NZD", "USD", "New Zealand Dollar / US Dollar", { ref: 0.574, keywords: either(NZD, USD), calendar: ["NZ", "US"] }),
  // ── Forex crosses ──
  fx("EUR", "GBP", "Euro / British Pound", { ref: 0.871, keywords: either(EUR, GBP), calendar: ["EU", "GB"] }),
  fx("EUR", "JPY", "Euro / Japanese Yen", { ref: 177.1, keywords: either(EUR, JPY), calendar: ["EU", "JP"] }),
  fx("GBP", "JPY", "British Pound / Japanese Yen", { ref: 203.3, keywords: either(GBP, JPY), calendar: ["GB", "JP"] }),
  fx("EUR", "CHF", "Euro / Swiss Franc", { ref: 0.932, keywords: either(EUR, CHF), calendar: ["EU", "CH"] }),
  fx("AUD", "JPY", "Australian Dollar / Japanese Yen", { ref: 99.8, keywords: either(AUD, JPY), calendar: ["AU", "JP"] }),
  fx("EUR", "AUD", "Euro / Australian Dollar", { ref: 1.774, keywords: either(EUR, AUD), calendar: ["EU", "AU"] }),
  fx("GBP", "CHF", "British Pound / Swiss Franc", { ref: 1.07, keywords: either(GBP, CHF), calendar: ["GB", "CH"] }),
  fx("CAD", "JPY", "Canadian Dollar / Japanese Yen", { ref: 109.0, keywords: either(CAD, JPY), calendar: ["CA", "JP"] }),

  // ── Indices (cash indices from the provider; coverage depends on plan and is verified at runtime) ──
  {
    symbol: "US100", name: "Nasdaq 100", short: "US100", category: "indices", digits: 2, tickSize: 0.01, move: { unit: "point", size: 1 }, maxStop: null,
    quote: "USD", contract: { size: 1, unit: "index" }, session: "us-cash", volume: "none", dxyLink: null,
    providers: { twelvedata: { candidates: ["NDX", "IXIC"] } }, feedNote: IDX_NOTE, aliases: ["NAS100", "USTEC", "NDX100", "NQ100", "NASDAQ", "US100"],
    keywords: /nasdaq|tech stocks|\bstocks\b|equities|wall street|nvidia|apple|microsoft|\bai\b stocks/i, calendar: ["US"], sample: { ref: 25200, vol: 0.0045 },
  },
  {
    symbol: "US30", name: "Dow Jones Industrial Average", short: "US30", category: "indices", digits: 2, tickSize: 0.01, move: { unit: "point", size: 1 }, maxStop: null,
    quote: "USD", contract: { size: 1, unit: "index" }, session: "us-cash", volume: "none", dxyLink: null,
    providers: { twelvedata: { candidates: ["DJI"] } }, feedNote: IDX_NOTE, aliases: ["DJ30", "WS30", "DOW30", "DOWJONES", "US30"],
    keywords: /\bdow\b|dow jones|\bstocks\b|equities|wall street/i, calendar: ["US"], sample: { ref: 46800, vol: 0.0035 },
  },
  {
    symbol: "SPX500", name: "S&P 500", short: "SPX500", category: "indices", digits: 2, tickSize: 0.01, move: { unit: "point", size: 1 }, maxStop: null,
    quote: "USD", contract: { size: 1, unit: "index" }, session: "us-cash", volume: "none", dxyLink: null,
    providers: { twelvedata: { candidates: ["SPX", "GSPC"] } }, feedNote: IDX_NOTE, aliases: ["US500", "SP500", "SPX", "SPX500"],
    keywords: /s&p|s&p 500|\bstocks\b|equities|wall street/i, calendar: ["US"], sample: { ref: 6800, vol: 0.0035 },
  },
  {
    symbol: "DAX40", name: "DAX 40", short: "DAX40", category: "indices", digits: 2, tickSize: 0.01, move: { unit: "point", size: 1 }, maxStop: null,
    quote: "EUR", contract: { size: 1, unit: "index" }, session: "de-cash", volume: "none", dxyLink: null,
    providers: { twelvedata: { candidates: ["GDAXI", "DAX"] } }, feedNote: IDX_NOTE, aliases: ["GER40", "DE40", "GER30", "DE30", "DAX", "DAX40"],
    keywords: /\bdax\b|german stocks|germany|european stocks|\becb\b/i, calendar: ["DE", "EU"], sample: { ref: 24100, vol: 0.004 },
  },
  {
    symbol: "UK100", name: "FTSE 100", short: "UK100", category: "indices", digits: 2, tickSize: 0.01, move: { unit: "point", size: 1 }, maxStop: null,
    quote: "GBP", contract: { size: 1, unit: "index" }, session: "uk-cash", volume: "none", dxyLink: null,
    providers: { twelvedata: { candidates: ["FTSE", "UKX"] } }, feedNote: IDX_NOTE, aliases: ["FTSE100", "UK100", "FTSE"],
    keywords: /ftse|london stocks|british stocks|\bboe\b/i, calendar: ["GB"], sample: { ref: 9700, vol: 0.0035 },
  },
  {
    symbol: "JP225", name: "Nikkei 225", short: "JP225", category: "indices", digits: 2, tickSize: 0.01, move: { unit: "point", size: 1 }, maxStop: null,
    quote: "JPY", contract: { size: 1, unit: "index" }, session: "jp-cash", volume: "none", dxyLink: null,
    providers: { twelvedata: { candidates: ["N225", "NI225"] } }, feedNote: IDX_NOTE, aliases: ["JPN225", "NIKKEI", "NIKKEI225", "JP225"],
    keywords: /nikkei|japan(ese)? stocks|\bboj\b/i, calendar: ["JP"], sample: { ref: 50100, vol: 0.005 },
  },

  // ── Crypto (24/7) ──
  ...([
    ["BTC", "Bitcoin", 2, 0.01, 1, 109000, 0.006, ["BITCOIN", "BTCUSDT", "XBTUSD"]],
    ["ETH", "Ethereum", 2, 0.01, 1, 3900, 0.008, ["ETHEREUM", "ETHUSDT"]],
    ["SOL", "Solana", 3, 0.001, 0.01, 190, 0.011, ["SOLANA", "SOLUSDT"]],
    ["XRP", "XRP", 5, 0.00001, 0.0001, 2.5, 0.011, ["RIPPLE", "XRPUSDT"]],
    ["BNB", "BNB", 2, 0.01, 0.1, 1100, 0.008, ["BNBUSDT"]],
    ["ADA", "Cardano", 5, 0.00001, 0.0001, 0.64, 0.012, ["CARDANO", "ADAUSDT"]],
    ["LTC", "Litecoin", 3, 0.001, 0.01, 96, 0.01, ["LITECOIN", "LTCUSDT"]],
    ["DOGE", "Dogecoin", 6, 0.000001, 0.0001, 0.19, 0.013, ["DOGECOIN", "DOGEUSDT"]],
  ] as const).map(([c, n, digits, tick, pt, ref, vol, aliases]): InstrumentDef => ({
    symbol: `${c}USD`, name: `${n} / US Dollar`, short: n, category: "crypto", digits, tickSize: tick, move: { unit: "point", size: pt }, maxStop: null,
    quote: "USD", contract: { size: 1, unit: c }, session: "crypto", volume: "exchange", dxyLink: null,
    providers: { twelvedata: { candidates: [`${c}/USD`] } }, feedNote: CRYPTO_NOTE, aliases: [...aliases],
    keywords: new RegExp(`\\b${n.toLowerCase()}\\b|\\b${c.toLowerCase()}\\b|crypto`, "i"), calendar: ["US"], sample: { ref, vol },
  })),

  // ── Commodities ──
  {
    symbol: "USOIL", name: "WTI Crude Oil", short: "WTI", category: "commodities", digits: 2, tickSize: 0.01, move: { unit: "point", size: 0.01 }, maxStop: null,
    quote: "USD", contract: { size: 1000, unit: "bbl" }, session: "fx", volume: "tick", dxyLink: null,
    providers: { twelvedata: { candidates: ["WTI/USD"] } }, aliases: ["WTI", "XTIUSD", "USOUSD", "CL", "OILWTI", "CRUDE", "USOIL"],
    feedNote: "The provider's WTI price is a spot or front-month reference. Broker oil CFDs roll between futures contracts, so levels can differ.",
    keywords: OIL, calendar: ["US"], sample: { ref: 61.5, vol: 0.01 },
  },
  {
    symbol: "UKOIL", name: "Brent Crude Oil", short: "Brent", category: "commodities", digits: 2, tickSize: 0.01, move: { unit: "point", size: 0.01 }, maxStop: null,
    quote: "USD", contract: { size: 1000, unit: "bbl" }, session: "fx", volume: "tick", dxyLink: null,
    providers: { twelvedata: { candidates: ["XBR/USD", "BRENT/USD"] } }, aliases: ["BRENT", "XBRUSD", "UKOUSD", "OILBRENT", "UKOIL"],
    feedNote: "The provider's Brent price is a spot or front-month reference. Broker oil CFDs roll between futures contracts, so levels can differ.",
    keywords: OIL, calendar: ["US", "GB"], sample: { ref: 65.4, vol: 0.01 },
  },
  {
    symbol: "NATGAS", name: "Natural Gas", short: "Nat Gas", category: "commodities", digits: 3, tickSize: 0.001, move: { unit: "point", size: 0.001 }, maxStop: null,
    quote: "USD", contract: { size: 10_000, unit: "MMBtu" }, session: "fx", volume: "tick", dxyLink: null,
    providers: { twelvedata: { candidates: ["NG/USD", "XNG/USD"] } }, aliases: ["XNGUSD", "NGAS", "NG", "NATGAS"],
    keywords: /natural gas|\blng\b|nat gas/i, calendar: ["US"], sample: { ref: 3.9, vol: 0.02 },
  },
  {
    symbol: "COPPER", name: "Copper", short: "Copper", category: "commodities", digits: 4, tickSize: 0.0001, move: { unit: "point", size: 0.001 }, maxStop: null,
    quote: "USD", contract: { size: 25_000, unit: "lb" }, session: "fx", volume: "tick", dxyLink: "inverse",
    providers: { twelvedata: { candidates: ["HG1", "XCU/USD"] } }, aliases: ["XCUUSD", "HG", "COPPER"],
    keywords: /copper|industrial metal/i, calendar: ["US", "CN"], sample: { ref: 5.05, vol: 0.008 },
  },

  // ── Macro ──
  {
    symbol: "DXY", name: "US Dollar Index", short: "DXY", category: "macro", digits: 3, tickSize: 0.001, move: { unit: "pip", size: 0.01 }, maxStop: null,
    quote: "USD", contract: { size: 1000, unit: "USD × index" }, session: "fx", volume: "none", dxyLink: null,
    providers: { twelvedata: { candidates: [], computed: "ice-dxy" } }, aliases: ["USDX", "DX", "DOLLARINDEX", "DXY"],
    feedNote: "Computed from the six ICE component pairs with the published ICE formula unless MARKET_DATA_DXY_SYMBOL names a vendor index. Bars are labelled computed.",
    keywords: /\bdollar\b|\bdxy\b|\bgreenback|\bfed\b|federal reserve|fomc|powell|treasur|yields?\b|\bcpi\b|inflation|payroll|\bnfp\b|jobless|\bppi\b|\bgdp\b|retail sales/i,
    calendar: ["US"], sample: { ref: 99.6, vol: 0.0016 },
  },
  {
    symbol: "VIX", name: "CBOE Volatility Index", short: "VIX", category: "macro", digits: 2, tickSize: 0.01, move: { unit: "point", size: 0.01 }, maxStop: null,
    quote: "USD", contract: { size: 1, unit: "index" }, session: "us-cash", volume: "none", dxyLink: null,
    providers: { twelvedata: { candidates: ["VIX"] } }, aliases: ["VIX", "VOLX", "VIXX"], feedNote: IDX_NOTE,
    keywords: /\bvix\b|volatility|risk[- ]?off|selloff|sell-off/i, calendar: ["US"], sample: { ref: 17.4, vol: 0.03 },
  },
];

export const INSTRUMENTS: Readonly<Record<string, InstrumentDef>> = Object.fromEntries(INSTRUMENT_LIST.map((i) => [i.symbol, i]));
export const SYMBOLS = INSTRUMENT_LIST.map((i) => i.symbol);

/** The three Macro Desk instruments a new user sees. */
export const DEFAULT_DESK = ["XAUUSD", "DXY", "XAGUSD"] as const;
export const DESK_SLOTS = 3;

export const isSymbol = (s: string | null | undefined): boolean => !!s && Object.hasOwn(INSTRUMENTS, s);
export function instrument(symbol: string): InstrumentDef {
  const i = INSTRUMENTS[symbol];
  if (!i) throw new Error(`Unknown instrument ${symbol}`);
  return i;
}
export const digitsOf = (symbol: string) => INSTRUMENTS[symbol]?.digits ?? 5;

/** The three desk symbols, repaired: unknown or duplicate entries fall back to the defaults. */
export function normalizeDesk(input: readonly (string | null | undefined)[] | null | undefined): string[] {
  const out: string[] = [];
  for (let k = 0; k < DESK_SLOTS; k++) {
    const s = input?.[k];
    if (s && isSymbol(s) && !out.includes(s)) { out.push(s); continue; }
    out.push(DEFAULT_DESK.find((d) => !out.includes(d) && !(input ?? []).slice(k + 1).includes(d)) ?? SYMBOLS.find((x) => !out.includes(x))!);
  }
  return out;
}

/**
 * Maps a broker's symbol (for example "NAS100.cash", "GOLD", "XAUUSD.m", "GER40", "EURUSD+") to the canonical
 * instrument, or null when Treidify does not know it. Broker suffixes and separators are stripped first.
 */
export function resolveSymbol(raw: string): string | null {
  const up = raw.trim().toUpperCase();
  if (isSymbol(up)) return up;
  const stripped = up
    .replace(/\.(CASH|PRO|RAW|ECN|STD|M|I|C|A|B|R|X|SB|MICRO|MINI)$/i, "")
    .replace(/[-_](ECN|PRO|RAW|STD|M|I)$/i, "")
    .replace(/[#!+.\-_/ ]/g, "")
    .replace(/(CASH|SPOT|ROLL)$/i, "");
  if (isSymbol(stripped)) return stripped;
  // A trailing lowercase-style suffix letter ("EURUSDM", "XAUUSDR") on a 6-letter FX/metal code.
  if (/^[A-Z]{6}[A-Z]$/.test(stripped) && isSymbol(stripped.slice(0, 6))) return stripped.slice(0, 6);
  for (const i of INSTRUMENT_LIST) if (i.aliases?.some((a) => a === stripped || a === up)) return i.symbol;
  return null;
}

/** Instruments matching a free-text query on symbol, name, short name or alias. Empty query returns everything. */
export function searchInstruments(q: string, list: readonly InstrumentDef[] = INSTRUMENT_LIST): InstrumentDef[] {
  const t = q.trim().toLowerCase().replace(/[/\s]/g, "");
  if (!t) return [...list];
  const score = (i: InstrumentDef) => {
    const sym = i.symbol.toLowerCase();
    if (sym === t) return 0;
    if (sym.startsWith(t)) return 1;
    if (i.aliases?.some((a) => a.toLowerCase() === t)) return 2;
    if (i.short.toLowerCase().replace(/[/\s]/g, "").startsWith(t) || i.name.toLowerCase().replace(/[/\s]/g, "").startsWith(t)) return 3;
    if (sym.includes(t) || i.name.toLowerCase().replace(/\s/g, "").includes(t) || i.aliases?.some((a) => a.toLowerCase().includes(t))) return 4;
    return -1;
  };
  return list.map((i) => [i, score(i)] as const).filter(([, s]) => s >= 0).sort((a, b) => a[1] - b[1]).map(([i]) => i);
}

/** Headline relevance: does this text concern the instrument? Keyword rule, labelled "automatic tag" in the UI. */
export const mentions = (symbol: string, text: string) => INSTRUMENTS[symbol]?.keywords.test(text) ?? false;
