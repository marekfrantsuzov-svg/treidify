import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Story } from "@/components/marketing/story";
import { GlassIcon, type GlassIconName } from "@/components/icons/glass-icon";
import { NewsArt } from "@/components/app/dashboard/cards";
import { AccountHealthPreview } from "@/components/previews/account-health-preview";
import { CoachPreview } from "@/components/previews/coach-preview";
import { EventPreview } from "@/components/previews/event-preview";
import { InstrumentCard } from "@/components/previews/zone-explorer";

export const metadata: Metadata = {
  title: { absolute: "Treidify: Your Trading Intelligence. All in One Place." },
  description:
    "Understand the markets, track your performance, analyze your decisions and become a more disciplined trader. Account analytics for MT5, XAUUSD and DXY market structure, global news intelligence and an AI trading coach.",
  alternates: { canonical: "/" },
};

const features: { icon: GlassIconName; title: string; body: string; href: string }[] = [
  { icon: "dashboard", title: "Account Health", body: "Balance, equity, P&L, drawdown and a health score from your own synced trades.", href: "/account-health" },
  { icon: "macro", title: "Macro Desk", body: "Gold, the dollar, silver and yields side by side, with structure on every timeframe.", href: "/macro-desk" },
  { icon: "markets", title: "Key price zones", body: "Support, resistance and liquidity computed from confirmed swings, each one explained.", href: "/macro-desk" },
  { icon: "news", title: "Global news intelligence", body: "Macro and geopolitical events, categorised and scored for impact on gold and the dollar.", href: "/market-intelligence" },
  { icon: "ai", title: "AI chart analysis", body: "Upload a chart screenshot and get structure, zones and scenarios annotated.", href: "/chart-analysis" },
  { icon: "journal", title: "Trading journal", body: "Every synced trade, filterable by instrument, session and outcome.", href: "/journal" },
  { icon: "coach", title: "AI trading coach", body: "Daily, weekly and monthly reviews built on measurable patterns in your trades.", href: "/ai-coach" },
  { icon: "community", title: "Verified community", body: "Rooms unlocked by verified account results, never by screenshots or payment.", href: "/community" },
];

const newsCategories: { icon: GlassIconName; hue: string; title: string }[] = [
  { icon: "dollar", hue: "from-emerald-400/40", title: "Central banks" },
  { icon: "calendar", hue: "from-sky-400/40", title: "Economic data" },
  { icon: "shield", hue: "from-rose-400/40", title: "Geopolitics" },
  { icon: "gold", hue: "from-amber-400/45", title: "Commodities" },
];

const steps = [
  { n: "1", title: "Create your free account", body: "Sign up with email in under a minute. No card, and nothing is charged unless you choose a plan." },
  { n: "2", title: "Connect MT5, read-only", body: "Link your account with an investor password. Treidify can read your history but can never place or change a trade." },
  { n: "3", title: "Get your intelligence", body: "See your account health, market structure, news impact and coaching, all in one dashboard." },
];

export default function Home() {
  return (
    <>
      <Hero />
      <div id="explore" />

      <section className="py-16 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeader align="center" eyebrow="01 · Features" title="Everything a trader needs." lead="One workspace for your account, the markets that move it and the habits behind your results." />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 0.05}>
                <Link href={f.href} className="glass group flex h-full flex-col rounded-[26px] p-5 transition-[transform,box-shadow] duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <GlassIcon name={f.icon} size={48} className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-ink">{f.title}</h3>
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-2">{f.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">Learn more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <Story
        index={2}
        eyebrow="AI Market Intelligence"
        title="Know where to look before price gets there."
        body="Treidify reads structure on 4H, 1H and 15M, confirms on 5M and 1M, and marks the next buy, sell and liquidity areas for XAUUSD and DXY. Tap any zone to see why it exists, what would confirm it and what would invalidate it."
        points={["Directional bias per timeframe from confirmed swings", "Zones with stated confirmation and invalidation, not predictions", "Upload your own chart for an AI read of its structure"]}
        visual={<InstrumentCard symbol="XAUUSD" height={300} />}
        href="/macro-desk"
        cta="Explore the Macro Desk"
      />

      <Story
        flip
        index={3}
        eyebrow="Connect Your Trading Account"
        title="Your MT5 account, finally understood."
        body="Connect with a read-only investor password. Treidify imports your history, keeps it in sync and calculates every number on the server from your actual trades. Deposits and withdrawals are never counted as profit."
        points={["Balance, equity, total profit and daily P&L", "Win rate, profit factor, drawdown and reward-to-risk", "Full trade history and equity charts for any period you choose"]}
        visual={<AccountHealthPreview />}
        href="/account-health"
        cta="Explore Account Health"
      />

      <Story
        index={4}
        eyebrow="AI Trading Coach"
        title="A coach that reads your trades, not your mind."
        body="The coach finds measurable patterns in your synced history and the notes you add: size after losses, how long you hold losers, which sessions cost you. Every observation shows its sample size and evidence. It never guesses your emotions."
        points={["Daily, weekly and monthly reviews with an improvement plan", "Insights from measured behaviour and your own inputs only", "Checks against the trading rules you set for yourself"]}
        visual={<CoachPreview />}
        href="/ai-coach"
        cta="Explore the AI Coach"
      />

      <Story
        flip
        index={5}
        eyebrow="Global News Intelligence"
        title="The news that moves gold, ranked by impact."
        body="Central-bank decisions, economic data and geopolitical events from identifiable sources, each categorised, given an importance level and assessed for its likely effect on gold and the dollar. Facts, AI interpretation and scenarios are always labelled separately."
        points={["Categories, importance levels and expected impact on XAUUSD and DXY", "Licensed news imagery where the source provides it", "Economic calendar with high-impact events highlighted"]}
        visual={
          <div className="grid gap-3">
            <EventPreview />
            <div className="grid grid-cols-2 gap-3">
              {newsCategories.map((c) => (
                <div key={c.title} className="glass flex items-center gap-2.5 rounded-2xl p-2.5">
                  <NewsArt icon={c.icon} hue={c.hue} className="h-10 w-12" />
                  <span className="min-w-0 text-[13px] font-medium leading-tight text-ink">{c.title}</span>
                </div>
              ))}
            </div>
          </div>
        }
        href="/market-intelligence"
        cta="Explore Market Intelligence"
      />

      <section className="py-16 sm:py-24" id="how-it-works">
        <Container>
          <Reveal>
            <SectionHeader align="center" eyebrow="06 · How it works" title="How Treidify works." lead="Three steps from sign-up to a clearer view of your trading." />
          </Reveal>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.06}>
                <li className="glass relative h-full overflow-hidden rounded-[26px] p-6">
                  <span className="num text-accent-gradient text-5xl font-semibold tracking-[-0.04em]">{s.n}</span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-ink">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-16 sm:py-24" id="pricing">
        <Container>
          <Reveal>
            <SectionHeader align="center" eyebrow="07 · Pricing" title="Simple pricing." lead="Start free. Try everything in Premium for 72 hours, no card and no automatic billing." />
          </Reveal>
          <Reveal delay={0.06} className="mt-12">
            <PricingCards />
          </Reveal>
        </Container>
      </section>

      <FinalCta
        title="Trade With More Clarity."
        lead="Create a free account in under a minute. Connect your MT5 account whenever you are ready."
        action="Create Your Free Account"
      />
    </>
  );
}
