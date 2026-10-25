import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Glass } from "@/components/ui/glass";

export interface LegalSection { heading: string; body: (string | string[])[] }

export const LEGAL_UPDATED = "2026-10-25";

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <section className="py-14 sm:py-20">
      <Container className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-28 grid gap-1 text-sm">
            {sections.map((s, i) => (
              <a key={s.heading} href={`#s${i + 1}`} className="rounded-lg px-2 py-1 text-ink-3 hover:bg-accent-soft hover:text-ink">{s.heading}</a>
            ))}
          </div>
        </nav>
        <article className="max-w-3xl">
          <div role="note" className="mb-6 rounded-2xl border border-[var(--warn)]/30 bg-warn-soft px-4 py-3 text-sm text-ink">
            <strong>Draft pending legal review.</strong> This document has not yet been approved by counsel and will be finalised before public launch.
          </div>
          <h1 className="text-gradient text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-ink-3">Last updated {LEGAL_UPDATED}</p>
          <p className="mt-6 text-lg leading-relaxed text-ink-2">{intro}</p>
          <div className="mt-10 grid gap-10">
            {sections.map((s, i) => (
              <section key={s.heading} id={`s${i + 1}`} className="scroll-mt-28">
                <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">{i + 1}. {s.heading}</h2>
                <div className="mt-3 grid gap-3 text-[15px] leading-relaxed text-ink-2">
                  {s.body.map((b, j) =>
                    Array.isArray(b) ? (
                      <ul key={j} className="grid list-disc gap-1.5 pl-5">{b.map((li) => <li key={li}>{li}</li>)}</ul>
                    ) : (
                      <p key={j}>{b}</p>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
          <Glass className="mt-12 p-5 text-sm text-ink-2">
            Questions about this document? <Link href="/contact" className="text-accent hover:underline">Contact us</Link>.
          </Glass>
        </article>
      </Container>
    </section>
  );
}
