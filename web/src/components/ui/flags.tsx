import { cn } from "@/lib/cn";

/**
 * Round country flags and asset marks, drawn as small vector shapes so they stay sharp at any size.
 * Simplified for 16–28px use; decorative, so the country or symbol is always written next to them.
 */
type Code = "US" | "EU" | "GB" | "JP" | "CN" | "CA" | "CH" | "AU" | "DE" | "NZ";

function Disc({ size, className, children }: { size: number; className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className={cn("shrink-0 rounded-full shadow-[0_0_0_1px_rgba(18,16,25,0.08)]", className)}>
      <defs><clipPath id="fc"><circle cx="16" cy="16" r="16" /></clipPath></defs>
      <g clipPath="url(#fc)">{children}</g>
    </svg>
  );
}

const STAR = (cx: number, cy: number, r: number) => {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.42 : r; p.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`); }
  return p.join(" ");
};

export function Flag({ code, size = 22, className }: { code: string; size?: number; className?: string }) {
  const c = code.toUpperCase() as Code;
  switch (c) {
    case "US":
      return <Disc size={size} className={className}><rect width="32" height="32" fill="#fff" />{[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={i * 2.46} width="32" height="2.46" fill="#d22f3c" />)}<rect width="15" height="17.2" fill="#2b3f8f" />{[[4, 4], [10, 4], [7, 8.5], [4, 13], [10, 13]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.1" fill="#fff" />)}</Disc>;
    case "EU":
      return <Disc size={size} className={className}><rect width="32" height="32" fill="#1f45a8" />{Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return <polygon key={i} points={STAR(16 + 9 * Math.cos(a), 16 + 9 * Math.sin(a), 1.7)} fill="#ffd43b" />; })}</Disc>;
    case "GB":
      return <Disc size={size} className={className}><rect width="32" height="32" fill="#25358f" /><path d="M0 0L32 32M32 0L0 32" stroke="#fff" strokeWidth="6" /><path d="M0 0L32 32M32 0L0 32" stroke="#d22f3c" strokeWidth="2" /><path d="M16 0V32M0 16H32" stroke="#fff" strokeWidth="9" /><path d="M16 0V32M0 16H32" stroke="#d22f3c" strokeWidth="5" /></Disc>;
    case "JP":
      return <Disc size={size} className={className}><rect width="32" height="32" fill="#fff" /><circle cx="16" cy="16" r="7" fill="#d22f3c" /></Disc>;
    case "CN":
      return <Disc size={size} className={className}><rect width="32" height="32" fill="#de2910" /><polygon points={STAR(10, 11, 5)} fill="#ffde00" /></Disc>;
    case "CA":
      return <Disc size={size} className={className}><rect width="32" height="32" fill="#fff" /><rect width="8" height="32" fill="#d22f3c" /><rect x="24" width="8" height="32" fill="#d22f3c" /><polygon points={STAR(16, 16, 6)} fill="#d22f3c" /></Disc>;
    case "CH":
      return <Disc size={size} className={className}><rect width="32" height="32" fill="#d22f3c" /><path d="M16 8V24M8 16H24" stroke="#fff" strokeWidth="5" /></Disc>;
    case "AU": case "NZ":
      return <Disc size={size} className={className}><rect width="32" height="32" fill="#25358f" /><polygon points={STAR(22, 20, 3.2)} fill="#fff" /><polygon points={STAR(9, 22, 4)} fill="#fff" /><path d="M0 0L14 12M14 0L0 12" stroke="#fff" strokeWidth="2.5" /><path d="M7 0V12M0 6H14" stroke="#d22f3c" strokeWidth="2.5" /></Disc>;
    case "DE":
      return <Disc size={size} className={className}><rect width="32" height="11" fill="#1a1a1a" /><rect y="11" width="32" height="11" fill="#dd0000" /><rect y="22" width="32" height="10" fill="#ffce00" /></Disc>;
    default:
      return <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full bg-inset text-[9px] font-bold text-ink-2", className)} style={{ width: size, height: size }}>{code.slice(0, 2)}</span>;
  }
}

/** Mark for a market symbol: country flag for currencies and the dollar index, a bar or coin for metals and crypto. */
export function AssetMark({ symbol, size = 24, className }: { symbol: string; size?: number; className?: string }) {
  if (symbol === "XAUUSD" || symbol === "XAGUSD") {
    const gold = symbol === "XAUUSD";
    const [a, b, c] = gold ? ["#ffe58a", "#f4b400", "#c98a00"] : ["#f4f6fa", "#c3c9d4", "#8e96a6"];
    return (
      <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className={cn("shrink-0", className)}>
        <defs><linearGradient id={`bar-${symbol}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset=".55" stopColor={b} /><stop offset="1" stopColor={c} /></linearGradient></defs>
        <path d="M3 25l3-7h9l3 7z" fill={`url(#bar-${symbol})`} stroke={c} strokeWidth=".8" />
        <path d="M14 25l3-7h9l3 7z" fill={`url(#bar-${symbol})`} stroke={c} strokeWidth=".8" />
        <path d="M8.5 17l3-7h9l3 7z" fill={`url(#bar-${symbol})`} stroke={c} strokeWidth=".8" />
      </svg>
    );
  }
  if (symbol === "BTCUSD") {
    return <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className={cn("shrink-0", className)}><circle cx="16" cy="16" r="16" fill="#f7931a" /><path d="M12.5 9v14M15 8v2M15 22v2M12.5 10h5.2a3 3 0 010 6H12.5m0 0h6a3.2 3.2 0 010 6.4h-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  const base = symbol === "DXY" ? "US" : symbol.slice(0, 3);
  const map: Record<string, string> = { EUR: "EU", GBP: "GB", USD: "US", JPY: "JP", CHF: "CH", CAD: "CA", AUD: "AU", NZD: "NZ", CNY: "CN" };
  return <Flag code={map[base] ?? base} size={size} className={className} />;
}

/** ISO country code to the currency traders read in a calendar. */
export const CURRENCY: Record<string, string> = { US: "USD", EU: "EUR", DE: "EUR", GB: "GBP", JP: "JPY", CN: "CNY", CA: "CAD", CH: "CHF", AU: "AUD", NZ: "NZD" };
