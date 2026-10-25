import { ArrowRight, Check, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Glass } from "@/components/ui/glass";
import { Pill } from "@/components/ui/pill";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section";
import { productNav } from "@/config/site";
import { FinalCta } from "./final-cta";

export interface FeaturePageProps {
  slug: string;
  eyebrow: string;
  title: string;
  lead: string;
  visual: React.ReactNode;
  plan: "Free and Premium" | "Premium" | "Free";
  capabilities: { Icon: LucideIcon; title: string; body: string }[];
  method: { title: string; lead: string; steps: { title: string; body: string }[] };
  limits: string[];
  faqs: { q: string; a: string }[];
  extra?: React.ReactNode;
}

export function Faq({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <div className="grid gap-2">
      {faqs.map((f) => (
        <details key={f.q} className="glass group rounded-2xl px-5 py-4 open:pb-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink">
            {f.q}
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-inset text-ink-3 transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function FeaturePage(p: FeaturePageProps) {
  const related = productNav.filter((n) => n.href !== `/${p.slug}`).slice(0, 3);
  return (
    <>
      <section className="pb-10 pt-14 sm:pt-20">
        <Container>
          <div className="rise max-w-4xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Pill tone="accent">{p.eyebrow}</Pill>
              <Pill>{p.plan}</Pill>
            </div>
            <h1 className="text-gradient text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-6xl lg:text-7xl">{p.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl">{p.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg">Get Started Free <ArrowRight className="h-4 w-4" /></ButtonLink>
              <ButtonLink href="/how-it-works" size="lg" variant="secondary">How it works</ButtonLink>
            </div>
          </div>
          <div className="rise mt-14" style={{ "--d": "0.12s" } as React.CSSProperties}>{p.visual}</div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <Reveal><SectionHeader title="What you get" /></Reveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.capabilities.map(({ Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 0.04}>
                <Glass className="h-full p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{body}</p>
                </Glass>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {p.extra}

      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal className="lg:sticky lg:top-28 lg:self-start"><SectionHeader eyebrow="Methodology" title={p.method.title} lead={p.method.lead} /></Reveal>
          <ol className="grid gap-3">
            {p.method.steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.04}>
                <li className="glass flex gap-4 rounded-3xl p-5">
                  <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-white">{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-ink">{s.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <Glass className="h-full p-7">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">What Treidify will not do</h2>
              <ul className="mt-5 grid gap-3">
                {p.limits.map((l) => (
                  <li key={l} className="flex gap-3 text-[15px] text-ink-2"><Minus className="mt-1 h-4 w-4 shrink-0 text-down" />{l}</li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-ink-3">Treidify is educational analytics. It does not execute trades, hold funds or give personal investment advice. <Link className="text-accent hover:underline" href="/legal/risk-disclosure">Risk disclosure</Link></p>
            </Glass>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Questions</h2>
            <div className="mt-5"><Faq faqs={p.faqs} /></div>
          </Reveal>
        </Container>
      </section>

      <section className="py-10">
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-3">Related</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {related.map((r) => (
              <Link key={r.href} href={r.href} className="glass group rounded-3xl p-5 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between font-semibold text-ink">{r.title}<ArrowRight className="h-4 w-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" /></div>
                <p className="mt-1 text-sm text-ink-2">{r.blurb}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>
      <FinalCta />
    </>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2.5">
      {items.map((i) => (
        <li key={i} className="flex gap-3 text-[15px] text-ink"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{i}</li>
      ))}
    </ul>
  );
}
