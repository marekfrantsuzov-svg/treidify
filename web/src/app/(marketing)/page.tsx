import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { FinalCta } from "@/components/marketing/final-cta";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { HeroLx } from "@/components/marketing/lx/hero";
import { CapabilityStrip } from "@/components/marketing/lx/strip";
import { AnalysisSection, IntelligenceSection, LxHead } from "@/components/marketing/lx/sections-ab";
import { CoachSection, JournalSection } from "@/components/marketing/lx/sections-cd";
import { EcosystemSection, MacroSection } from "@/components/marketing/lx/sections-ef";
import "@/components/marketing/lx/landing.css";
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

type Need = "market" | "sync" | "news" | "ai";
const NEED_NOTE: Record<Need, string> = {
  market: "Live market data coming soon. It runs on labelled sample data today.",
  sync: "MT5 sync opening soon. Try it now with a labelled demo account.",
  news: "Live news feed coming soon.",
  ai: "AI explanations coming soon.",
};

const steps = [
  { n: "1", title: "Create your account", body: "Sign up with email in under a minute. No card. Try every Premium feature for 72 hours, with no automatic billing." },
  { n: "2", title: "Connect your trading data", body: "Link MT5 with a read-only investor password. Your history syncs and every figure is computed from your real trades.", sync: true },
  { n: "3", title: "Use the intelligence dashboard", body: "Check the Gold read, the key zones and the event risk, then review what your own trades say in the coach." },
];

export default function Home() {
  const st = providerStatus();
  const live: Record<Need, boolean> = { market: st.marketData, sync: st.sync, news: st.news, ai: st.ai };
  return (
    <div className="lx-root">
      <HeroLx />

      <CapabilityStrip />
      <IntelligenceSection />
      <AnalysisSection />
      <JournalSection />
      <CoachSection />
      <MacroSection />
      <EcosystemSection live={live} />

      <section className="lx-section" id="how-it-works">
        <Container>
          <LxHead align="center" eyebrow="How it works" title={<>From sign-up to a clearer view <span className="lx-grad-text">in three steps.</span></>} />
          <ol className="steps mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.n} className="h-full"><Reveal delay={i * 0.08} className="h-full">
                <div className="glass relative h-full overflow-hidden rounded-[26px] p-6">
                  <span className="step-num num">{s.n}</span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-ink">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
                  {"sync" in s && !live.sync && <p className="mt-3 text-[12.5px] font-medium text-ink-3">{NEED_NOTE.sync}</p>}
                </div>
              </Reveal></li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="lx-section" id="app">
        <Container>
          <Reveal><AppStoreSoon /></Reveal>
        </Container>
      </section>

      <section className="lx-section" id="pricing">
        <Container>
          <LxHead align="center" eyebrow="Pricing" title="Simple pricing." lead="Start free. Try everything in Premium for 72 hours, no card and no automatic billing." />
          <Reveal delay={0.06} className="mt-12">
            <PricingCards />
          </Reveal>
        </Container>
      </section>

      <FinalCta
        title="Trade with more clarity."
        lead="Create a free account in under a minute. Connect your MT5 account whenever you are ready."
        action="Create free account"
      />
    </div>
  );
}
