import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section";
import { FinalCta } from "@/components/marketing/final-cta";
import { AccountHealthPreview } from "@/components/previews/account-health-preview";
import { ChartAiPreview } from "@/components/previews/chart-ai-preview";
import { CoachPreview } from "@/components/previews/coach-preview";
import { CommunityPreview } from "@/components/previews/community-preview";
import { EventPreview } from "@/components/previews/event-preview";
import { JournalPreview } from "@/components/previews/journal-preview";
import { MacroPreview } from "@/components/previews/macro-preview";
import { productNav } from "@/config/site";

export const metadata: Metadata = {
  title: "Features",
  description: "Everything in Treidify: Account Health, AI Trading Coach, Macro Desk, Global Market Intelligence, AI Chart Analysis, Trading Journal and the Verified Trader Community.",
  alternates: { canonical: "/features" },
};

const visuals: Record<string, React.ReactNode> = {
  "/account-health": <AccountHealthPreview compact />,
  "/ai-coach": <CoachPreview limit={3} />,
  "/macro-desk": <MacroPreview />,
  "/market-intelligence": <EventPreview />,
  "/chart-analysis": <ChartAiPreview />,
  "/journal": <JournalPreview rows={5} />,
  "/community": <CommunityPreview />,
};

export default function Page() {
  return (
    <>
      <section className="pb-6 pt-14 sm:pt-20">
        <Container>
          <div className="rise"><SectionHeader as="h1" eyebrow="Features" title="Everything a serious trader needs, connected." lead="Seven tools that share one verified data foundation: your synced account, licensed market data and sourced global events." /></div>
        </Container>
      </section>
      {productNav.map((f, i) => (
        <section key={f.href} className="py-10 sm:py-14">
          <Container className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <Reveal className={i % 2 ? "lg:order-2" : undefined}>
              <span className="num text-sm font-semibold text-accent">0{i + 1}</span>
              <h2 className="text-gradient mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{f.title}</h2>
              <p className="mt-3 text-lg text-ink-2">{f.blurb}.</p>
              <Link href={f.href} className="mt-5 inline-flex items-center gap-1.5 font-medium text-accent hover:underline">Explore {f.title} <ArrowRight className="h-4 w-4" /></Link>
            </Reveal>
            <Reveal delay={0.06} className="min-w-0">{visuals[f.href]}</Reveal>
          </Container>
        </section>
      ))}
      <FinalCta />
    </>
  );
}
