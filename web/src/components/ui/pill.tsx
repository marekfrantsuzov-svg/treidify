import { cn } from "@/lib/cn";

export type Tone = "neutral" | "accent" | "up" | "down" | "warn";

const tones: Record<Tone, string> = {
  neutral: "bg-inset text-ink-2 border-line",
  accent: "bg-accent-soft text-accent border-transparent",
  up: "bg-up-soft text-up border-transparent",
  down: "bg-down-soft text-down border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
};

export function Pill({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap", tones[tone], className)}
      {...props}
    />
  );
}

/** Marks every preview built from sample data, so it is never mistaken for live data. */
export function SampleBadge({ label = "Illustrative data", className }: { label?: string; className?: string }) {
  return (
    <Pill tone="warn" className={cn("uppercase", className)} title="Generated sample data for illustration. Not live market or account data.">
      {label}
    </Pill>
  );
}
