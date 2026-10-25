import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Story({ index, eyebrow, title, body, points, visual, flip, href, cta }: {
  index: number; eyebrow: string; title: string; body: string; points: string[]; visual: React.ReactNode; flip?: boolean; href?: string; cta?: string;
}) {
  return (
    <section className="py-16 sm:py-24">
      <Container className={cn("grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16", flip && "lg:grid-cols-[1.1fr_0.9fr]")}>
        <Reveal className={cn(flip && "lg:order-2")}>
          <Eyebrow><span className="num mr-2 text-ink-3">0{index}</span>{eyebrow}</Eyebrow>
          <h2 className="text-gradient mt-4 text-3xl font-semibold leading-[1.06] tracking-[-0.035em] sm:text-5xl">{title}</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">{body}</p>
          <ul className="mt-6 grid gap-3">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-[15px] text-ink">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Check className="h-3 w-3" strokeWidth={3} /></span>
                {p}
              </li>
            ))}
          </ul>
          {href && <ButtonLink href={href} variant="secondary" className="mt-8">{cta ?? "Learn more"}</ButtonLink>}
        </Reveal>
        <Reveal delay={0.08} className={cn("min-w-0", flip && "lg:order-1")}>{visual}</Reveal>
      </Container>
    </section>
  );
}
