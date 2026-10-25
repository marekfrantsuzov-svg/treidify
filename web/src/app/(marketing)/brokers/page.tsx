import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, Server } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Glass } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section";
import { Faq } from "@/components/marketing/feature-page";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "Supported brokers",
  description: "Treidify connects to MetaTrader 4 and MetaTrader 5 accounts at most brokers through a read-only investor-password connection.",
  alternates: { canonical: "/brokers" },
};

export default function Page() {
  return (
    <>
      <section className="pb-6 pt-14 sm:pt-20">
        <Container><div className="rise"><SectionHeader as="h1" eyebrow="Supported brokers" title="Works with MetaTrader 4 and 5." lead="Treidify connects to the trading server your broker already runs. If your broker offers MT4 or MT5 and allows investor-password logins, it is very likely supported." /></div></Container>
      </section>
      <section className="py-10">
        <Container className="grid gap-3 md:grid-cols-3">
          {[
            { Icon: CheckCircle2, title: "Supported", body: "MetaTrader 4 and MetaTrader 5 accounts (live and demo) at brokers whose servers accept investor-password connections from our connectivity provider." },
            { Icon: Server, title: "What we need", body: "Your account number, the broker server name exactly as shown in MetaTrader, and the investor (read-only) password." },
            { Icon: CircleAlert, title: "Not yet supported", body: "cTrader, DXtrade, Match-Trader, TradeLocker and proprietary broker platforms. Manual and CSV journaling still works for these." },
          ].map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.04}>
              <Glass className="h-full p-6">
                <Icon className="h-6 w-6 text-accent" />
                <h2 className="mt-4 text-lg font-semibold text-ink">{title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{body}</p>
              </Glass>
            </Reveal>
          ))}
        </Container>
      </section>
      <section className="py-16">
        <Container className="max-w-3xl">
          <p className="mb-6 text-[15px] text-ink-2">We do not publish a list of partner brokers, because Treidify has no broker partnerships or referral deals. Support depends on your broker's server, not on an agreement with us. When you connect, Treidify tests the connection and reports the result in seconds.</p>
          <Faq faqs={[
            { q: "Are prop-firm accounts supported?", a: "Many prop firms run MT4 or MT5 servers that accept investor logins, and those work. Some prop firms restrict third-party connections; the connection test will tell you." },
            { q: "Why can't I see my full history?", a: "Some broker servers limit the history visible to investor logins or archive old deals. Treidify shows the earliest date it could import. Verified community status needs three complete months." },
            { q: "Does Treidify recommend brokers?", a: "No. Treidify is independent, has no affiliate agreements and does not recommend brokers." },
          ]} />
        </Container>
      </section>
      <FinalCta />
    </>
  );
}
