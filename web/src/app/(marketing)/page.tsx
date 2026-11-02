import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { AnalysisSection } from "@/components/marketing/lx/sections-ab";
import { CoachSection, JournalSection } from "@/components/marketing/lx/sections-cd";
import { MacroSection } from "@/components/marketing/lx/sections-ef";
import "@/components/marketing/lx/landing.css";
import { EdHero } from "@/components/marketing/ed/hero";
import { EdFigures } from "@/components/marketing/ed/figures";
import { EdAccount } from "@/components/marketing/ed/account";
import { EdFinal, EdSteps, EdTools } from "@/components/marketing/ed/index-sections";
import "@/components/marketing/ed/ed.css";
import { AppStoreSoon } from "@/components/marketing/v3/app-store";
import { providerStatus } from "@/server/providers";

export const metadata: Metadata = {
  title: { absolute: "Treidify: Your Trading Intelligence" },
  description:
    "AI-powered trading intelligence for gold, the dollar and your own account: Gold, DXY and Silver structure, key buy and sell zones with honest risk rules, macro context, MT5 performance tracking and an AI trading coach.",
  alternates: { canonical: "/" },
};

/** Re-read the provider configuration hourly, so "coming soon" notes disappear once a provider is connected. */
export const revalidate = 3600;

/**
 * Homepage, composed as a sequence of scenes: the promise and the product, the rules as figures, the account read,
 * the timeframe analysis, the journal, the coach, the macro desk, the tool index, the steps, pricing and the close.
 */
export default function Home() {
  const st = providerStatus();
  const live = { market: st.marketData, sync: st.sync, news: st.news, ai: st.ai };
  return (
    <div className="lx-root ed-root">
      <EdHero />
      <EdFigures />
      <EdAccount />
      <AnalysisSection />
      <JournalSection />
      <CoachSection />
      <MacroSection />
      <EdTools live={live} />
      <EdSteps syncLive={live.sync} />

      <section className="lx-section" id="pricing">
        <Container>
          <Reveal className="ed-head">
            <p className="ed-kicker">Pricing</p>
            <h2 className="ts-h2 ed-head-title">Simple pricing.</h2>
            <p className="ts-body ed-head-lead">Start free. Try everything in Premium for 72 hours, no card and no automatic billing.</p>
          </Reveal>
          <Reveal delay={0.06} className="mt-10 sm:mt-14">
            <PricingCards />
          </Reveal>
        </Container>
      </section>

      <section className="lx-section" id="app">
        <Container>
          <Reveal><AppStoreSoon /></Reveal>
        </Container>
      </section>

      <EdFinal />
    </div>
  );
}
