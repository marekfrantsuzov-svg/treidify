import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Glass } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section";
import { Faq } from "@/components/marketing/feature-page";
import { FinalCta } from "@/components/marketing/final-cta";
import { PricingCards } from "@/components/marketing/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free. Try Treidify Premium for 72 hours with no card and no automatic billing. Monthly and annual plans.",
  alternates: { canonical: "/pricing" },
};

const rows: [string, string | boolean, string | boolean][] = [
  ["XAUUSD and DXY dashboard, multi-timeframe bias", true, true],
  ["Key zones with explanations", "Basic", "Full, all timeframes"],
  ["Economic calendar and news", "Basic", "Global intelligence and scenarios"],
  ["Macro Desk", "Overview", "Full desk and regime analysis"],
  ["Ask the Macro Desk and AI assistant", "Limited daily questions", "Generous monthly allowance"],
  ["Connected MT4/MT5 accounts", "1, basic overview", "Multiple, full analytics"],
  ["Account Health score and equity chart", false, true],
  ["Trading journal", "Trade list", "Full analytics, notes, tags, exports"],
  ["AI Trading Coach and reports", false, true],
  ["AI chart screenshot analysis", "Try a few", true],
  ["Advanced alerts", false, true],
  ["General community", true, true],
  ["Pro and Whale rooms", "By verified performance", "By verified performance"],
];

const cell = (v: string | boolean) => (v === true ? <Check className="mx-auto h-4 w-4 text-accent" aria-label="Included" /> : v === false ? <Minus className="mx-auto h-4 w-4 text-ink-3" aria-label="Not included" /> : <span className="text-ink-2">{v}</span>);

export default function Page() {
  return (
    <>
      <section className="pb-6 pt-14 sm:pt-20">
        <Container><div className="rise"><SectionHeader as="h1" align="center" eyebrow="Pricing" title="Simple pricing. A real free plan." lead="Start free with no card. When you want the full platform, try Premium for 72 hours. The trial ends on its own and never bills you." /></div></Container>
      </section>
      <section className="py-10"><Container><PricingCards /></Container></section>
      <section className="py-16">
        <Container className="max-w-4xl">
          <Reveal>
            <Glass className="overflow-x-auto p-2 sm:p-4">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead><tr className="text-ink"><th className="p-3 font-semibold">Compare plans</th><th className="p-3 text-center font-semibold">Free</th><th className="p-3 text-center font-semibold">Premium</th></tr></thead>
                <tbody>
                  {rows.map(([k, f, p]) => (
                    <tr key={k} className="border-t border-line"><td className="p-3 text-ink">{k}</td><td className="p-3 text-center">{cell(f)}</td><td className="p-3 text-center">{cell(p)}</td></tr>
                  ))}
                </tbody>
              </table>
            </Glass>
          </Reveal>
        </Container>
      </section>
      <section className="py-10">
        <Container className="max-w-3xl">
          <h2 className="mb-5 text-2xl font-semibold text-ink">Pricing questions</h2>
          <Faq faqs={[
            { q: "Do I need a card for the trial?", a: "No. Start the 72-hour Premium trial from your account with no payment details. When it ends, your account returns to Free and nothing is charged." },
            { q: "Can I cancel any time?", a: "Yes. Cancel from Settings > Billing and Premium stays active until the end of the period you paid for." },
            { q: "Can I buy access to the Whale Room?", a: "No. The Pro and Whale rooms are earned only through verified trading performance, whatever plan you are on." },
            { q: "Which payment methods do you accept?", a: "Major cards and the wallets Stripe supports in your country. Invoices are available in your billing settings." },
          ]} />
        </Container>
      </section>
      <FinalCta />
    </>
  );
}
