import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta({ title = "Your trading, finally understood.", lead = "Create a free account in under a minute. Connect your MT4 or MT5 account whenever you are ready.", action = "Get Started Free" }: { title?: string; lead?: string; action?: string }) {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <Reveal>
          <div className="relative border-t border-line-strong pt-12 sm:pt-16">
            <h2 className="ts-h2 relative max-w-3xl text-ink">{title}</h2>
            <p className="ts-lead relative mt-5 max-w-xl">{lead}</p>
            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/signup" size="lg">{action} <ArrowRight className="h-4 w-4" /></ButtonLink>
              <ButtonLink href="/pricing" size="lg" variant="secondary">See pricing</ButtonLink>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
