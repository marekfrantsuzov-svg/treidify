/**
 * Configurable plans. Prices are PROPOSED defaults pending Marek's decision; change them here
 * (or via env) and the pricing page, checkout and entitlements all follow.
 * Stripe price IDs are read from env so no secret or account id lives in code.
 */
export type Feature =
  | "market.basic" | "market.advanced" | "news.basic" | "news.global" | "charts.basic" | "charts.ai"
  | "account.overview" | "account.analytics" | "coach" | "macro.advanced" | "journal.full" | "reports" | "alerts.advanced" | "ai.limited";

export interface Plan {
  id: "free" | "premium";
  name: string;
  tagline: string;
  monthly: number | null;
  annual: number | null;
  currency: "USD";
  features: Feature[];
  highlights: string[];
}

const num = (v: string | undefined, fallback: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : fallback);

export const TRIAL_HOURS = 72;

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Market intelligence and a basic account overview.",
    monthly: 0,
    annual: 0,
    currency: "USD",
    features: ["market.basic", "news.basic", "charts.basic", "account.overview", "ai.limited"],
    highlights: [
      "XAUUSD and DXY dashboard with multi-timeframe bias",
      "Key economic events and basic news",
      "Basic chart tools and key levels",
      "Basic overview of one connected account",
      "Limited AI questions each day",
      "General community access",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "The complete Treidify trading intelligence platform.",
    monthly: num(process.env.NEXT_PUBLIC_PRICE_MONTHLY, 29),
    annual: num(process.env.NEXT_PUBLIC_PRICE_ANNUAL, 290),
    currency: "USD",
    features: [
      "market.basic", "market.advanced", "news.basic", "news.global", "charts.basic", "charts.ai", "account.overview",
      "account.analytics", "coach", "macro.advanced", "journal.full", "reports", "alerts.advanced", "ai.limited",
    ],
    highlights: [
      "Full MetaTrader account analytics and Account Health score",
      "AI Trading Coach with daily, weekly and monthly reviews",
      "Advanced Macro Desk and Ask the Macro Desk",
      "Global geopolitical intelligence with gold and DXY scenarios",
      "AI chart screenshot analysis",
      "Full journal analytics, exports and performance reports",
      "Advanced alerts for zones, events and drawdown",
    ],
  },
];

export const pricesAreFinal = process.env.NEXT_PUBLIC_PRICES_FINAL === "true";
