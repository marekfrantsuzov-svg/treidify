import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { AnalysisSection } from "@/components/marketing/lx/sections-ab";
import { CoachSection, JournalSection } from "@/components/marketing/lx/sections-cd";
import { MacroSection } from "@/components/marketing/lx/sections-ef";
import "@/components/marketing/lx/landing.css";
import { V5Hero } from "@/components/marketing/v5/hero";
import "@/components/marketing/v5/landing.css";
import { ProductShowcase } from "@/components/marketing/v5/showcase";
import { LandingFaq } from "@/components/marketing/v5/faq";
import { EdFigures } from "@/components/marketing/ed/figures";
import { EdAccount } from "@/components/marketing/ed/account";
import { EdFinal, EdSteps, EdTools } from "@/components/marketing/ed/index-sections";
import "@/components/marketing/ed/ed.css";
import "@/components/marketing/ed/glass-landing.css";
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
 * Homepage, in the brief's order: navigation, cinematic hero, product showcase, trading intelligence (the rules as
 * figures, then the tool index), account analytics, AI market analysis, Macro Desk and calendar, journal and Account
 * Health, the coach, how it works, plans, FAQ, final call to action, footer.
 */
export default function Home() {
  const st = providerStatus();
  const live = { market: st.marketData, sync: st.sync, news: st.news, ai: st.ai };
  return (
    <div className="lx-root ed-root">
      <V5Hero />
      <ProductShowcase />
      <EdFigures />
      <EdTools live={live} />
      <EdAccount />
      <AnalysisSection />
      <MacroSection />
      <JournalSection />
      <CoachSection />
      <EdSteps syncLive={live.sync} />

      <section className="lx-section" id="pricing">
        <Container>
          <Reveal className="ed-head">
            <p className="ed-kicker">Pricing</p>
            <h2 className="ts-h2 ed-head-title">Two plans. One honest trial.</h2>
            <p className="ts-body ed-head-lead">Essential measures your own trading. Premium adds AI, news intelligence and the Macro Desk.</p>
          </Reveal>
          <Reveal delay={0.06} className="mt-10 sm:mt-14">
            <PricingCards />
          </Reveal>
        </Container>
      </section>

      <LandingFaq />

      <EdFinal />
    </div>
  );
}
