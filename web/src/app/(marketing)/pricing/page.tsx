import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section";
import { Faq } from "@/components/marketing/feature-page";
import { FinalCta } from "@/components/marketing/final-cta";
import { PricingCards } from "@/components/marketing/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Essential $24/month and Premium $49/month, or 32% less billed yearly. Every plan starts with a 3-day trial.",
  alternates: { canonical: "/pricing" },
};

export default function Page() {
  return (
    <>
      <section className="pb-6 pt-14 sm:pt-20">
        <Container><div className="rise"><SectionHeader as="h1" align="center" eyebrow="Pricing" title="Two plans. One honest trial." lead="Essential measures your own trading. Premium adds AI, news and the Macro Desk. Both start with a 3-day trial." /></div></Container>
      </section>
      <section className="py-10"><Container><PricingCards /></Container></section>
      <section className="py-10">
        <Container className="max-w-3xl">
          <h2 className="mb-5 text-2xl font-semibold text-ink">Pricing questions</h2>
          <Faq faqs={[
            { q: "Do I need a card for the trial?", a: "Yes. A card is required to start the 3-day trial. Nothing is charged during the trial. If you do not cancel before it ends, the plan you chose renews automatically, monthly or yearly." },
            { q: "Can I cancel any time?", a: "Yes. Cancel from Settings › Plan › Manage billing. Your plan stays active until the end of the period you paid for." },
            { q: "Can I buy access to the Whale Room?", a: "No. The Pro and Whale rooms are earned only through verified trading performance, whatever plan you are on." },
            { q: "Which payment methods do you accept?", a: "Major cards and the wallets Stripe supports in your country. Invoices are available in your billing settings." },
          ]} />
        </Container>
      </section>
      <FinalCta />
    </>
  );
}
