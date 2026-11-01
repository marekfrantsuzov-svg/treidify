export const site = {
  name: "Treidify",
  tagline: "Your Trading Intelligence.",
  description:
    "Treidify connects your MT4 or MT5 account, explains your real performance, maps important XAUUSD and DXY price areas, and analyses global macro events with AI. Educational analytics, not financial advice.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export const productNav = [
  { href: "/account-health", title: "Account Health", blurb: "Balance, equity, P&L and a health score from your synced account" },
  { href: "/ai-coach", title: "AI Trading Coach", blurb: "Patterns in your own trades, with the evidence behind each one" },
  { href: "/macro-desk", title: "Macro Desk", blurb: "Gold, DXY, silver, yields and real yields in one desk" },
  { href: "/market-intelligence", title: "Global Market Intelligence", blurb: "Geopolitical and macro events, scored for gold and the dollar" },
  { href: "/chart-analysis", title: "AI Chart Analysis", blurb: "Upload a chart screenshot, get structure and zones annotated" },
  { href: "/journal", title: "Trading Journal", blurb: "Every synced trade, tagged, filtered and analysed" },
  { href: "/community", title: "Verified Trader Community", blurb: "Rooms based on verified results, including the Whale Room" },
] as const;

export const mainNav = [
  { href: "/features", title: "Features" },
  { href: "/how-it-works", title: "How it works" },
  { href: "/pricing", title: "Pricing" },
  { href: "/community", title: "Community" },
  { href: "/help", title: "Help" },
] as const;

export const footerNav = [
  { heading: "Product", links: [{ href: "/features", title: "All features" }, ...productNav.map(({ href, title }) => ({ href, title }))] },
  {
    heading: "Platform",
    links: [
      { href: "/how-it-works", title: "How it works" },
      { href: "/brokers", title: "Supported brokers" },
      { href: "/pricing", title: "Pricing" },
      { href: "/signup", title: "Get started free" },
      { href: "/#app", title: "iOS app (coming soon)" },
      { href: "/login", title: "Log In" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", title: "About Treidify" },
      { href: "/help", title: "Help Center" },
      { href: "/contact", title: "Contact support" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/legal/privacy", title: "Privacy Policy" },
      { href: "/legal/terms", title: "Terms of Service" },
      { href: "/legal/risk-disclosure", title: "Risk Disclosure" },
      { href: "/legal/subscription-terms", title: "Subscription Terms" },
      { href: "/legal/cookies", title: "Cookie settings" },
    ],
  },
] as const;

export const RISK_LINE =
  "Trading leveraged products such as CFDs, forex and spot metals carries a high risk of losing money. Treidify provides educational analytics and information, not investment advice, and does not execute trades or hold funds.";
