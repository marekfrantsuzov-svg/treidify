import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Glass } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "About Treidify",
  description: "Treidify is an independent trading intelligence platform built on verified data, transparent calculations and honest AI.",
  alternates: { canonical: "/about" },
};

const principles = [
  { title: "Verified over claimed", body: "Performance comes from synced account data, calculated on our servers. Screenshots and self-reported numbers never count." },
  { title: "Transparent calculations", body: "Every metric, bias and zone has a published definition. You can always see why a number is what it is." },
  { title: "Honest AI", body: "AI explains data from identifiable sources. It does not invent prices, news or statistics, and its output is labelled as interpretation." },
  { title: "Independent", body: "No broker partnerships, no affiliate deals, no signal selling. Treidify earns from subscriptions only." },
  { title: "Privacy by default", body: "Your balance, positions and results are private unless you choose to show them." },
  { title: "Education, not instructions", body: "We describe structure, scenarios and risk. Decisions stay with you." },
];

export default function Page() {
  return (
    <>
      <section className="pb-6 pt-14 sm:pt-20">
        <Container>
          <div className="rise">
            <SectionHeader as="h1" eyebrow="About Treidify" title="Your Trading Intelligence." lead="Most trading tools either show you charts or sell you signals. Treidify does something different: it helps you understand your own trading, in the context of the market, with numbers you can trust." />
          </div>
        </Container>
      </section>
      <section className="py-14">
        <Container>
          <Reveal><h2 className="text-2xl font-semibold text-ink">What we believe</h2></Reveal>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {principles.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.04}>
                <Glass className="h-full p-6"><h3 className="font-semibold text-ink">{p.title}</h3><p className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.body}</p></Glass>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <FinalCta title="Built for traders who want the truth." />
    </>
  );
}
