import { ArrowDownRight, ArrowUpRight, ChevronDown, Minus } from "lucide-react";
import type { BiasLabel, EngineTf, TfState } from "@/lib/intelligence";
import { cn } from "@/lib/cn";

export const fmtP = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Bias badge: arrow, word and tint. No score, because the score is an engine weighting, not a probability. */
export function BiasBadge({ bias, size = "md" }: { bias: BiasLabel; size?: "sm" | "md" }) {
  const Icon = bias === "bullish" ? ArrowUpRight : bias === "bearish" ? ArrowDownRight : Minus;
  const word = bias === "insufficient" ? "No reading" : bias.charAt(0).toUpperCase() + bias.slice(1);
  return (
    <span className={cn("bias-badge", `is-${bias}`, size === "sm" && "is-sm")}>
      <Icon aria-hidden />{word}
    </span>
  );
}

const TF_WORD: Record<TfState, string> = { bullish: "bullish", bearish: "bearish", none: "no confirmed structure", na: "not enough bars" };

/** Compact timeframe pill: a coloured dot plus the timeframe. The state is spelled out for screen readers. */
export function TfPill({ tf, state, dim }: { tf: EngineTf; state: TfState; dim?: boolean }) {
  return (
    <span className={cn("tf-pill", `is-${state}`, dim && "is-dim")} title={`${tf}: ${TF_WORD[state]}`}>
      <span className="tf-dot" aria-hidden />
      {tf}
      <span className="sr-only">: {TF_WORD[state]}</span>
    </span>
  );
}

export function TfRow({ states, dimUnsupported }: { states: { tf: EngineTf; state: TfState; supports?: boolean }[]; dimUnsupported?: boolean }) {
  return <div className="flex flex-wrap gap-1.5">{states.map((s) => <TfPill key={s.tf} tf={s.tf} state={s.state} dim={dimUnsupported && !s.supports} />)}</div>;
}

export type SourceKind = "fact" | "model" | "na" | "sample";
const SOURCE_TEXT: Record<SourceKind, string> = { fact: "Verified data", model: "Model interpretation", na: "Unavailable", sample: "Sample bars" };

/** Every sentiment and analysis block says where its content comes from. */
export function SourceChip({ kind, label }: { kind: SourceKind; label?: string }) {
  return <span className={cn("src-chip", `is-${kind}`)}>{label ?? SOURCE_TEXT[kind]}</span>;
}

export function SectionHead({ icon, title, sub, right, id }: { icon: React.ReactNode; title: string; sub?: string; right?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-2 first:mt-0 sm:mb-4">
      <div className="min-w-0">
        <h2 id={id} className="section-title"><span className="section-icon" aria-hidden>{icon}</span>{title}</h2>
        {sub && <p className="mt-1 text-[13.5px] text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Native disclosure with an animated chevron; works without JavaScript. */
export function More({ summary, children, className, open }: { summary: React.ReactNode; children: React.ReactNode; className?: string; open?: boolean }) {
  return (
    <details className={cn("more", className)} open={open}>
      <summary><span className="min-w-0 flex-1">{summary}</span><ChevronDown className="more-chev" aria-hidden /></summary>
      <div className="more-body">{children}</div>
    </details>
  );
}

/**
 * Horizontal price ladder: buy and sell zones as tinted bands, the stop as a dashed line and the last price as a
 * marker. Positions are computed from real levels only.
 */
export function PriceLadder({ lo, hi, bands, price, stop, digits, label }: {
  lo: number; hi: number; digits: number; label: string;
  bands: { side: "buy" | "sell"; lower: number; upper: number }[];
  price: number | null; stop?: number | null;
}) {
  const span = hi - lo || 1;
  const x = (v: number) => `${Math.min(100, Math.max(0, ((v - lo) / span) * 100))}%`;
  const w = (a: number, b: number) => `${Math.max(1.5, (Math.abs(b - a) / span) * 100)}%`;
  return (
    <div className="ladder" role="img" aria-label={label}>
      <div className="ladder-track" />
      {bands.map((b) => <span key={b.side + b.lower} className={cn("ladder-band", b.side === "buy" ? "is-buy" : "is-sell")} style={{ left: x(Math.min(b.lower, b.upper)), width: w(b.lower, b.upper) }} />)}
      {stop != null && <span className="ladder-stop" style={{ left: x(stop) }} />}
      {price !== null && <span className="ladder-price" style={{ left: x(price) }}><span className="ladder-price-tag num">{fmtP(price, digits)}</span></span>}
    </div>
  );
}

/** Stop distance against the 50-pip limit. Over the limit the bar fills red and the label says so. */
export function StopMeter({ pips, max }: { pips: number; max: number }) {
  const over = pips > max;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="text-ink-2">Structural stop</span>
        <span className={cn("num font-semibold", over ? "text-down-ink" : "text-ink")}>{pips.toLocaleString("en-US")} / {max} pips</span>
      </div>
      <div className="meter" aria-hidden><span className={cn("meter-fill", over && "is-over")} style={{ width: `${Math.min(100, (pips / max) * 100)}%` }} /></div>
    </div>
  );
}
