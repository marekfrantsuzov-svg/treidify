import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta({ title = "Your trading, finally understood.", lead = "Create a free account in under a minute. Connect your MT4 or MT5 account whenever you are ready.", action = "Get Started Free" }: { title?: string; lead?: string; action?: string }) {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <Reveal>
          <div className="glass relative overflow-hidden rounded-[36px] px-6 py-16 text-center sm:px-16 sm:py-20">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_50%_0%,var(--glow-a),transparent_70%)]" />
            <h2 className="text-gradient relative mx-auto max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-6xl">{title}</h2>
            <p className="relative mx-auto mt-5 max-w-xl text-lg text-ink-2">{lead}</p>
            <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg">{action} <ArrowRight className="h-4 w-4" /></ButtonLink>
              <ButtonLink href="/pricing" size="lg" variant="secondary">See pricing</ButtonLink>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
