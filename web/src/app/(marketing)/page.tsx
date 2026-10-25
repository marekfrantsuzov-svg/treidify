import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Story } from "@/components/marketing/story";
import { AccountHealthPreview } from "@/components/previews/account-health-preview";
import { ChartAiPreview } from "@/components/previews/chart-ai-preview";
import { CoachPreview } from "@/components/previews/coach-preview";
import { CommunityPreview } from "@/components/previews/community-preview";
import { EventPreview } from "@/components/previews/event-preview";
import { EcosystemDiagram } from "@/components/previews/ecosystem";
import { InstrumentCard } from "@/components/previews/zone-explorer";

export const metadata: Metadata = {
  title: { absolute: "Treidify: Trade With Intelligence. Not Guesswork." },
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Hero />
      <div id="explore" />
      <Story
        index={1}
        eyebrow="Account Health"
        title="Your trading account, finally understood."
        body="Connect MT4 or MT5 with a read-only investor password. Treidify imports your history and keeps it in sync, then calculates every number on the server from your actual trades."
        points={["Balance and equity as live snapshots, P&L for the period you choose", "Win rate, profit factor, drawdown and reward-to-risk from real closed trades", "An Account Health score with every component explained"]}
        visual={<AccountHealthPreview />}
        href="/account-health"
        cta="Explore Account Health"
      />
      <Story
        flip
        index={2}
        eyebrow="Global Market Intelligence"
        title="Know what moves gold before the market reacts."
        body="Geopolitical, central-bank and macro events from identifiable sources, assessed for gold, the dollar and silver. Each assessment weighs safe-haven demand against the dollar, real yields and what is already priced in."
        points={["Impact on XAUUSD, DXY and XAGUSD with horizon and uncertainty", "Bullish, bearish and neutral scenarios, never one forced answer", "Facts, AI interpretation and predictions labelled separately"]}
        visual={<EventPreview />}
        href="/market-intelligence"
        cta="Explore Market Intelligence"
      />
      <Story
        index={3}
        eyebrow="Key zones"
        title="Know where to look for buys and sells."
        body="Support, resistance and liquidity are computed from confirmed swings on 4H, 1H and 15M, then checked against structure on 5M and 1M. Tap any zone to see why it exists, what would confirm it and what would invalidate it."
        points={["4H direction, 1H structure, 15M setup, 5M confirmation, 1M precision", "Next buy and sell areas with liquidity pools that may attract price", "Analytical frameworks with stated invalidation, not predictions"]}
        visual={<InstrumentCard symbol="XAUUSD" height={300} />}
        href="/macro-desk"
        cta="Explore the Macro Desk"
      />
      <Story
        flip
        index={4}
        eyebrow="AI Trading Coach"
        title="Your personal AI trading coach."
        body="The coach reads your synced trades and finds measurable patterns: size after losses, how long you hold losers, which sessions cost you. Every observation shows its sample size, evidence and method. It tells you what you do well, too."
        points={["Daily, weekly and monthly reviews with a personal improvement plan", "No emotional labels or diagnoses, only measured behaviour", "Rule checks against your own trading rulebook"]}
        visual={<CoachPreview />}
        href="/ai-coach"
        cta="Explore the AI Coach"
      />
      <Story
        index={5}
        eyebrow="AI Chart Analysis"
        title="Your charts. Explained by AI."
        body="Upload a chart screenshot. Treidify identifies the instrument, timeframe and visible structure, then annotates highs, lows, zones and liquidity. Where the image cannot show something, it says so and checks against market data instead of guessing."
        points={["Toggle structure, zone and liquidity overlays", "Bullish and bearish scenarios with confirmation and invalidation", "Ask follow-up questions about your chart"]}
        visual={<ChartAiPreview />}
        href="/chart-analysis"
        cta="Explore Chart Analysis"
      />
      <Story
        flip
        index={6}
        eyebrow="Verified Trader Community"
        title="Trade among verified performers."
        body="A community built on authenticated results, not screenshots. Access to the Verified Pro Trader Room and the Whale Room is calculated by the server from synced account history. It cannot be bought."
        points={["Pro Room: $10,000+ verified net realized profit in each of the last 3 completed months", "Whale Room: $50,000+ in each of the last 3 completed months", "No signal selling, affiliate spam or promotion, enforced by moderation"]}
        visual={<CommunityPreview />}
        href="/community"
        cta="Explore the Community"
      />
      <section className="py-16 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeader align="center" eyebrow="07 · One ecosystem" title="One connected trading ecosystem." lead="Your account data, market structure and global events feed one another, so every insight has context." />
          </Reveal>
          <Reveal delay={0.06}>
            <EcosystemDiagram className="mt-12" />
          </Reveal>
        </Container>
      </section>
      <section className="py-16 sm:py-24" id="pricing">
        <Container>
          <Reveal>
            <SectionHeader align="center" eyebrow="08 · Pricing" title="Simple pricing." lead="Start free. Try everything in Premium for 72 hours without a card." />
          </Reveal>
          <Reveal delay={0.06} className="mt-12">
            <PricingCards />
          </Reveal>
        </Container>
      </section>
      <FinalCta />
    </>
  );
}
