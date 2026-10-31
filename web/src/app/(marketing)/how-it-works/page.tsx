import type { Metadata } from "next";
import { BarChart3, Globe2, KeyRound, RefreshCw, Sparkles, UserPlus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Glass } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section";
import { Faq } from "@/components/marketing/feature-page";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "How it works",
  description: "Create a free account, connect MT4 or MT5 read-only, and Treidify syncs your history, calculates your performance and adds market and AI context.",
  alternates: { canonical: "/how-it-works" },
};

const steps = [
  { Icon: UserPlus, title: "Create a free account", body: "Sign up with Apple, Google or email. No card. Choose your experience level, instruments, time zone and dashboard layout." },
  { Icon: Globe2, title: "Use market intelligence straight away", body: "Gold and DXY bias, key zones, events and the Macro Desk work without connecting anything." },
  { Icon: KeyRound, title: "Connect MT4 or MT5, read-only", body: "Enter your account number, broker server and investor (read-only) password. It cannot place trades or withdraw. The secret is encrypted and handled by our connectivity provider." },
  { Icon: RefreshCw, title: "History imports and stays in sync", body: "Balance, positions, orders and deal history import automatically. Treidify keeps syncing and tells you if the connection needs attention." },
  { Icon: BarChart3, title: "See your real performance", body: "Account Health, the equity curve and the journal fill with numbers calculated on the server from your own trades." },
  { Icon: Sparkles, title: "Improve with AI", body: "The coach reviews your behaviour, chart analysis explains your screenshots, and the Macro Desk answers your questions, all grounded in your data." },
];

export default function Page() {
  return (
    <>
      <section className="pb-6 pt-14 sm:pt-20">
        <Container><div className="rise"><SectionHeader as="h1" eyebrow="How it works" title="From sign-up to insight in minutes." lead="Six steps. The first two take under a minute and need no broker connection." /></div></Container>
      </section>
      <section className="py-10">
        <Container className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.04}>
              <Glass className="h-full p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon className="h-5 w-5" /></span>
                  <span className="num text-3xl font-semibold text-ink-3/40">{i + 1}</span>
                </div>
                <h2 className="mt-5 text-lg font-semibold text-ink">{title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{body}</p>
              </Glass>
            </Reveal>
          ))}
        </Container>
      </section>
      <section className="py-16">
        <Container className="grid gap-10 lg:grid-cols-2">
          <Reveal><SectionHeader eyebrow="Security" title="Built for financial data." lead="Read-only connections, encryption in transit and at rest, server-side secrets, per-user data isolation, audit logs and optional multi-factor sign-in." /></Reveal>
          <Reveal delay={0.05}>
            <Faq faqs={[
              { q: "What is an investor password?", a: "MetaTrader accounts have two passwords: a master password that can trade and an investor password that can only view. Treidify only ever asks for the investor password. Your broker can show you how to set or reset it." },
              { q: "Can Treidify trade on my account?", a: "No. An investor-password connection is read-only by design, and Treidify has no trade-execution features." },
              { q: "Can I disconnect?", a: "Yes, at any time from Settings > Connections. Syncing stops immediately and the stored secret is deleted." },
              { q: "What if my broker is not supported?", a: "We test the connection when you add it and tell you immediately if it fails. You can still use every market feature and journal manually." },
            ]} />
          </Reveal>
        </Container>
      </section>
      <FinalCta />
    </>
  );
}
