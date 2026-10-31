import { cn } from "@/lib/cn";

export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[13px] font-semibold uppercase tracking-[0.14em] text-accent", className)} {...props} />;
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  as: H = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
      <H className={cn("text-gradient font-semibold tracking-[-0.035em]", H === "h1" ? "text-4xl sm:text-6xl lg:text-7xl leading-[1.02]" : "text-3xl sm:text-5xl leading-[1.05]")}>
        {title}
      </H>
      {lead && <p className="mt-5 text-lg leading-relaxed text-ink-2 sm:text-xl">{lead}</p>}
    </div>
  );
}
