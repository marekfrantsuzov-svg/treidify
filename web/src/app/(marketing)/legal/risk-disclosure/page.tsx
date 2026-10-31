import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Risk Disclosure", alternates: { canonical: "/legal/risk-disclosure" } };

export default function Page() {
  return (
    <LegalPage
      title="Risk Disclosure"
      intro="Trading leveraged products such as CFDs, forex and spot metals carries a high risk of losing money rapidly. A large share of retail accounts lose money. Only trade with money you can afford to lose."
      sections={[
        { heading: "Not investment advice", body: ["Treidify provides market information, educational analysis and performance tools. It does not provide personalised investment advice, recommendations or signals, and it does not execute trades or guarantee outcomes."] },
        { heading: "Analysis is conditional", body: ["Market bias, zones, scenarios and event assessments are produced by documented calculations and AI interpretation of the data shown. They describe possibilities with stated confirmation and invalidation conditions. They are not forecasts."] },
        { heading: "Past performance", body: ["Past performance, including your own historical results and the verified results of community members, does not indicate future results."] },
        { heading: "AI limitations", body: ["AI-generated text can be incorrect or incomplete. It is always labelled and kept separate from source facts."] },
        { heading: "Data limitations", body: ["Prices, news and account data can be delayed, stale, incomplete or unavailable. Each screen shows its source and freshness. Sample data in marketing previews is labelled and is never real."] },
        { heading: "Community content", body: ["Posts by other members are their own opinions and education, not advice from Treidify. Verified badges confirm historical results only, not skill or future returns."] },
        { heading: "Independence", body: ["Treidify is not affiliated with MetaQuotes, any broker or any data provider."] },
      ]}
    />
  );
}
