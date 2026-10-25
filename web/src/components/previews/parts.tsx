import { cn } from "@/lib/cn";

export function InstrumentIcon({ symbol, className }: { symbol: "XAUUSD" | "DXY" | "XAGUSD" | string; className?: string }) {
  const map: Record<string, { label: string; bg: string }> = {
    XAUUSD: { label: "Au", bg: "linear-gradient(135deg,#f6d37a,#c98f1c)" },
    XAGUSD: { label: "Ag", bg: "linear-gradient(135deg,#e7ecf3,#8d99ad)" },
    DXY: { label: "$", bg: "linear-gradient(135deg,#5fe0a6,#138a5e)" },
  };
  const m = map[symbol] ?? { label: symbol.slice(0, 2), bg: "linear-gradient(135deg,var(--accent-2),var(--accent))" };
  return (
    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]", className)} style={{ background: m.bg }} aria-hidden>
      {m.label}
    </span>
  );
}

export function Stat({ label, value, sub, tone, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "up" | "down"; className?: string }) {
  return (
    <div className={cn("inset min-w-0 rounded-2xl p-3.5", className)}>
      <div className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className={cn("num mt-1 truncate text-lg font-semibold tracking-[-0.02em] text-ink sm:text-xl", tone === "up" && "text-up", tone === "down" && "text-down")}>{value}</div>
      {sub && <div className="num mt-0.5 truncate text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

export function BiasChip({ tf, bias, role }: { tf: string; bias: "bullish" | "bearish" | "neutral" | "insufficientData"; role?: string }) {
  const tone = bias === "bullish" ? "bg-up-soft text-up" : bias === "bearish" ? "bg-down-soft text-down" : "bg-inset text-ink-2";
  const word = bias === "insufficientData" ? "No data" : bias[0]!.toUpperCase() + bias.slice(1);
  return (
    <div className={cn("min-w-0 rounded-xl px-2 py-1.5 text-center", tone)}>
      <div className="text-[11px] font-bold">{tf}</div>
      <div className="truncate text-[10.5px] font-medium">{word}</div>
      {role && <div className="mt-0.5 truncate text-[9.5px] uppercase tracking-wider opacity-70">{role}</div>}
    </div>
  );
}

export function WindowChrome({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <div className={cn("glass overflow-hidden rounded-[28px] shadow-[var(--shadow-lg)]", className)}>
      <div className="flex h-9 items-center gap-1.5 border-b border-line px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
        {title && <span className="ml-3 truncate text-[11px] text-ink-3">{title}</span>}
      </div>
      {children}
    </div>
  );
}
