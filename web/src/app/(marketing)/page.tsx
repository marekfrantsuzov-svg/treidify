import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { FinalCta } from "@/components/marketing/final-cta";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { GlassIcon, type GlassIconName } from "@/components/icons/glass-icon";
import { HeroV3 } from "@/components/marketing/v3/hero";
import { Showcase } from "@/components/marketing/v3/showcase";
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

const features: { icon: GlassIconName; title: string; body: string; href: string; needs?: Need[] }[] = [
  { icon: "spark", title: "AI Market Intelligence", body: "A deterministic engine reads structure, liquidity and momentum, and AI explains the result in plain words.", href: "/market-intelligence", needs: ["market", "ai"] },
  { icon: "gold", title: "Gold, DXY and Silver", body: "Bias and 4H, 1H, 15M and 5M structure for each market, with how they relate to one another.", href: "/macro-desk", needs: ["market"] },
  { icon: "markets", title: "Key buy and sell zones", body: "Zones with Fibonacci and liquidity confluence, confirmation, invalidation and a 50-pip stop limit on gold.", href: "/macro-desk", needs: ["market"] },
  { icon: "yield", title: "Performance tracking", body: "P&L, win rate, profit factor, drawdown and a health score, computed automatically from your synced trades.", href: "/account-health", needs: ["sync"] },
  { icon: "link", title: "MetaTrader connection", body: "Connect MT5 with a read-only investor password. Treidify can read your history but never trade.", href: "/brokers", needs: ["sync"] },
  { icon: "news", title: "Real-time market news", body: "Headlines and the economic calendar from identifiable sources, with impact on gold and the dollar.", href: "/market-intelligence", needs: ["news"] },
  { icon: "macro", title: "Market sentiment", body: "Rates, inflation, yields, the dollar and geopolitics, with verified facts and model reads labelled apart. Yields need a data source and are not shown yet.", href: "/macro-desk", needs: ["news"] },
  { icon: "coach", title: "AI trading coach", body: "Weekly reviews built on measurable patterns in your own trades, each with the evidence behind it.", href: "/ai-coach", needs: ["sync"] },
  { icon: "calendar", title: "Session intelligence", body: "Which trading sessions are open right now, and how your own trades perform in each of them.", href: "/features" },
];

const steps = [
  { n: "1", title: "Create your account", body: "Sign up with email in under a minute. No card. Try every Premium feature for 72 hours, with no automatic billing." },
  { n: "2", title: "Connect your trading data", body: "Link MT5 with a read-only investor password. Your history syncs and every figure is computed from your real trades.", sync: true },
  { n: "3", title: "Use the intelligence dashboard", body: "Check the Gold read, the key zones and the event risk, then review what your own trades say in the coach." },
];

export default function Home() {
  const st = providerStatus();
  const live: Record<Need, boolean> = { market: st.marketData, sync: st.sync, news: st.news, ai: st.ai };
  const noteFor = (needs?: Need[]) => needs?.filter((n) => !live[n]).map((n) => NEED_NOTE[n]).join(" ") || null;
  return (
    <>
      <HeroV3 />

      <section className="py-16 sm:py-24" id="features">
        <Container>
          <Reveal>
            <SectionHeader align="center" eyebrow="Features" title="Everything you need to read the market and yourself." lead="One workspace for the markets that move gold, the levels that matter, and the habits behind your results." />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.05} className="h-full">
                <Link href={f.href} className="glass feature-card group flex h-full flex-col rounded-[26px] p-6">
                  <GlassIcon name={f.icon} size={48} className="transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-ink">{f.title}</h3>
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-2">{f.body}</p>
                  {noteFor(f.needs) && <p className="mt-3 rounded-lg bg-[var(--surface-inset)] px-2.5 py-1.5 text-[12.5px] font-medium leading-snug text-ink-3">{noteFor(f.needs)}</p>}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">Learn more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-24" id="tour">
        <Container>
          <Reveal>
            <SectionHeader align="center" eyebrow="Inside Treidify" title="See the product as it is." lead="These are the real screens, captured from the app with its labelled sample data." />
          </Reveal>
          <div className="mt-12 sm:mt-16"><Showcase syncLive={live.sync} marketLive={live.market} /></div>
        </Container>
      </section>

      <section className="py-16 sm:py-24" id="how-it-works">
        <Container>
          <Reveal>
            <SectionHeader align="center" eyebrow="How it works" title="From sign-up to a clearer view in three steps." />
          </Reveal>
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

      <section className="py-16 sm:py-24" id="app">
        <Container>
          <Reveal><AppStoreSoon /></Reveal>
        </Container>
      </section>

      <section className="py-16 sm:py-24" id="pricing">
        <Container>
          <Reveal>
            <SectionHeader align="center" eyebrow="Pricing" title="Simple pricing." lead="Start free. Try everything in Premium for 72 hours, no card and no automatic billing." />
          </Reveal>
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
    </>
  );
}
