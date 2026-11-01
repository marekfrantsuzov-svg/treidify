/**
 * Thirty VIRTUAL market analysts. They are automated personas, labelled "Virtual analyst" everywhere, with fictional
 * names that do not belong to real traders. They never claim trades, profits or followers. Every market statement
 * they make is generated from Treidify's computed analysis of real market data (see ./writer.ts).
 */
export type Specialty =
  | "gold-structure" | "dxy" | "fibonacci" | "liquidity" | "london" | "new-york" | "asia" | "macro"
  | "risk" | "silver" | "alignment" | "volatility" | "zones" | "momentum" | "correlation" | "confirmation";

export interface Analyst { id: string; name: string; handle: string; specialty: Specialty; title: string; voice: "measured" | "direct" | "teacher" | "quant" | "cautious"; hue: number; sessions: ("asia" | "london" | "newYork")[] }

const A = (id: string, name: string, specialty: Specialty, title: string, voice: Analyst["voice"], hue: number, sessions: Analyst["sessions"] = ["asia", "london", "newYork"]): Analyst =>
  ({ id, name, handle: `va_${id}`, specialty, title, voice, hue, sessions });

export const ANALYSTS: Analyst[] = [
  A("aurelia", "Aurelia Stone", "gold-structure", "Gold structure analyst", "measured", 268),
  A("bram", "Bram Okafor", "gold-structure", "4H swing structure", "direct", 250, ["london", "newYork"]),
  A("dex", "Dex Halvorsen", "dxy", "Dollar Index analyst", "quant", 220),
  A("mina", "Mina Castell", "dxy", "USD flows and DXY structure", "teacher", 205, ["london", "newYork"]),
  A("fibi", "Fibi Lennox", "fibonacci", "Fibonacci analyst", "teacher", 300),
  A("ratio", "Theo Ratio", "fibonacci", "Retracement and extension levels", "quant", 285, ["london", "newYork"]),
  A("lumen", "Lumen Vasquez", "liquidity", "Liquidity analyst", "direct", 320),
  A("pool", "Ines Marlow", "liquidity", "Equal highs and lows", "measured", 335, ["london"]),
  A("london", "Harriet Quill", "london", "London-session analyst", "measured", 240, ["london"]),
  A("cable", "Rafe Bellamy", "london", "London open structure", "direct", 230, ["london"]),
  A("nyc", "Jonah Reyes", "new-york", "New York-session analyst", "direct", 12, ["newYork"]),
  A("wall", "Priya Banerjee", "new-york", "NY open and US data", "teacher", 25, ["newYork"]),
  A("tokyo", "Kenji Arata", "asia", "Asia-session analyst", "measured", 180, ["asia"]),
  A("sydney", "Mara Whitlock", "asia", "Asian range and liquidity", "cautious", 170, ["asia"]),
  A("macro", "Celeste Adebayo", "macro", "Macro analyst", "measured", 45),
  A("fomc", "Arlo Whitfield", "macro", "Central banks and US data", "teacher", 55, ["london", "newYork"]),
  A("guard", "Noor Haddad", "risk", "Risk-management analyst", "cautious", 150),
  A("sizer", "Elias Brandt", "risk", "Position risk and invalidation", "direct", 140, ["london", "newYork"]),
  A("argent", "Silvia Moreau", "silver", "Silver analyst", "measured", 195),
  A("ag", "Callum Price", "silver", "Gold/Silver relative structure", "quant", 210, ["london", "newYork"]),
  A("stack", "Odessa Kline", "alignment", "Multi-timeframe alignment", "teacher", 260),
  A("ladder", "Tomas Ferreira", "alignment", "Top-down 4H to 5M", "direct", 275, ["london", "newYork"]),
  A("vega", "Ruth Calloway", "volatility", "Volatility analyst", "quant", 10),
  A("range", "Ibrahim Sule", "volatility", "ATR and range regimes", "cautious", 0, ["asia", "london"]),
  A("zone", "Viola Kerrigan", "zones", "Buy and sell zone mapper", "direct", 310),
  A("map", "Leo Ashworth", "zones", "Supply and demand areas", "measured", 290, ["london", "newYork"]),
  A("pulse", "Sana Mirza", "momentum", "Momentum analyst", "quant", 160),
  A("inverse", "Gideon Hale", "correlation", "Gold and DXY correlation", "quant", 235),
  A("confirm", "Juno Takeda", "confirmation", "5M confirmation analyst", "teacher", 330, ["london", "newYork"]),
  A("trigger", "Marcus Lind", "confirmation", "Entry confirmation and CHOCH", "cautious", 345, ["london", "newYork"]),
];

export const analystByHandle = (h: string) => ANALYSTS.find((a) => a.handle === h) ?? null;
export const analystEmail = (a: Analyst) => `${a.handle}@virtual-analyst.treidify.invalid`;
