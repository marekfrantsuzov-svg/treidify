/**
 * Plans (Marek, 2026-11-07). Essential $24/mo or $195.84/yr, Premium $49/mo or $399.84/yr (annual = 32% off the
 * monthly price over 12 months). Every paid plan starts with a 3-day trial that requires a card and renews into the
 * chosen plan unless cancelled. Without a subscription an account is on "free" access (no paid features); "free" is
 * not sold or shown as a plan.
 * Stripe price IDs come from env (STRIPE_PRICE_*), so no account id lives in code. Feature checks run on the server
 * (server/entitlements.ts); the client only reflects them.
 */
export type Feature =
  | "market.basic" | "market.advanced" | "news.basic" | "news.global" | "charts.basic" | "charts.ai"
  | "account.overview" | "account.analytics" | "account.health" | "coach" | "ai.chat" | "macro.advanced" | "journal.full" | "reports" | "alerts.advanced" | "ai.limited";

export type PlanId = "free" | "essential" | "premium";
export type PaidPlanId = Exclude<PlanId, "free">;
export type BillingInterval = "monthly" | "annual";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  currency: "USD";
  accounts: number;
  features: Feature[];
  highlights: string[];
  excluded: string[];
}

export const TRIAL_DAYS = 3;
/** Kept for older screens that speak in hours. */
export const TRIAL_HOURS = TRIAL_DAYS * 24;
export const ANNUAL_DISCOUNT = 0.32;

const ESSENTIAL: Feature[] = ["market.basic", "charts.basic", "account.overview", "account.analytics", "account.health", "journal.full", "reports"];

export const plans: Plan[] = [
  {
    id: "free", name: "No plan", tagline: "Market overview only, until a plan starts.", monthly: 0, annual: 0, currency: "USD", accounts: 1,
    features: ["market.basic", "charts.basic", "account.overview"], highlights: [], excluded: [],
  },
  {
    id: "essential",
    name: "Essential",
    tagline: "Your own trading, measured properly.",
    monthly: 24,
    annual: 195.84,
    currency: "USD",
    accounts: 1,
    features: ESSENTIAL,
    highlights: [
      "1 connected MT4 or MT5 account (read-only)",
      "Core account analytics and equity curve",
      "Account Health score with its full methodology",
      "Trading journal with calendar and statistics",
      "Markets, charts and supply and demand zones",
    ],
    excluded: ["AI Coach and AI chat", "Premium AI market analysis", "News intelligence and Macro Desk"],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "The complete Treidify trading intelligence platform.",
    monthly: 49,
    annual: 399.84,
    currency: "USD",
    accounts: 2,
    features: [...ESSENTIAL, "market.advanced", "news.basic", "news.global", "charts.ai", "coach", "ai.chat", "macro.advanced", "alerts.advanced", "ai.limited"],
    highlights: [
      "Everything in Essential",
      "2 connected MT4 or MT5 accounts",
      "AI Coach with daily, weekly and monthly reviews",
      "AI market analysis and chart screenshot analysis",
      "News intelligence with gold and DXY impact",
      "Macro Desk with official US data",
      "Advanced alerts",
    ],
    excluded: [],
  },
];

export const paidPlans = plans.filter((p): p is Plan & { id: PaidPlanId } => p.id !== "free");
export const planById = (id: PlanId) => plans.find((p) => p.id === id)!;
/** Annual price per month, for "$16.32/mo billed yearly". */
export const annualPerMonth = (p: Plan) => Math.round((p.annual / 12) * 100) / 100;

// Prices are approved (2026-11-07), so they always show.
export const pricesAreFinal = true;
