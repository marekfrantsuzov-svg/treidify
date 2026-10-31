import { cn } from "@/lib/cn";

export function InstrumentIcon({ symbol, className }: { symbol: "XAUUSD" | "DXY" | "XAGUSD" | string; className?: string }) {
  const map: Record<string, { label: string; bg: string }> = {
    XAUUSD: { label: "Au", bg: "linear-gradient(135deg,#f6d37a,#c98f1c)" },
    XAGUSD: { label: "Ag", bg: "linear-gradient(135deg,#e7ecf3,#8d99ad)" },
    DXY: { label: "$", bg: "linear-gradient(135deg,#5fe0a6,#138a5e)" },
    US10Y: { label: "%", bg: "linear-gradient(135deg,#f7b267,#d9731f)" },
  };
  if (/^(US30|US500|NAS100|SPX|USTEC)$/.test(symbol)) return <Flag country="us" className={className} />;
  if (symbol.startsWith("EUR")) return <Flag country="eu" className={className} />;
  if (symbol.startsWith("GBP")) return <Flag country="gb" className={className} />;
  const m = map[symbol] ?? { label: symbol.slice(0, 2), bg: "linear-gradient(135deg,var(--accent-2),var(--accent))" };
  return (
    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]", className)} style={{ background: m.bg }} aria-hidden>
      {m.label}
    </span>
  );
}

/** Round flag for currency and index rows. Drawn, so no image request. */
export function Flag({ country, className }: { country: "us" | "eu" | "gb"; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-7 w-7 shrink-0 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.08)]", className)} aria-hidden>
      <clipPath id={`flag-${country}`}><circle cx="12" cy="12" r="12" /></clipPath>
      <g clipPath={`url(#flag-${country})`}>
        {country === "us" && (
          <>
            <rect width="24" height="24" fill="#fff" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} y={i * 3.7} width="24" height="1.85" fill="#c8102e" />)}
            <rect width="12" height="12.9" fill="#0a3161" />
            {[[3, 3], [7, 3], [5, 6], [3, 9], [7, 9]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="0.8" fill="#fff" />)}
          </>
        )}
        {country === "eu" && (
          <>
            <rect width="24" height="24" fill="#003399" />
            {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={(12 + 6.5 * Math.cos((i * Math.PI) / 6)).toFixed(2)} cy={(12 + 6.5 * Math.sin((i * Math.PI) / 6)).toFixed(2)} r="1" fill="#ffcc00" />)}
          </>
        )}
        {country === "gb" && (
          <>
            <rect width="24" height="24" fill="#012169" />
            <path d="M0 0l24 24M24 0L0 24" stroke="#fff" strokeWidth="4" />
            <path d="M0 0l24 24M24 0L0 24" stroke="#c8102e" strokeWidth="1.5" />
            <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="6" />
            <path d="M12 0v24M0 12h24" stroke="#c8102e" strokeWidth="3.4" />
          </>
        )}
      </g>
    </svg>
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
