import { Activity, BarChart3, Clock3, Compass, Crosshair, DollarSign, Droplets, Gauge, Globe2, Layers3, Link2, Ruler, ShieldCheck, Sparkle, Sunrise, Sunset, type LucideIcon } from "lucide-react";
import type { Analyst, Specialty } from "@/lib/community/analysts";
import { cn } from "@/lib/cn";

export const SPECIALTY_ICON: Record<Specialty, LucideIcon> = {
  "gold-structure": Layers3, dxy: DollarSign, fibonacci: Ruler, liquidity: Droplets, london: Sunrise, "new-york": Sunset, asia: Clock3, macro: Globe2,
  risk: ShieldCheck, silver: Sparkle, alignment: Compass, volatility: Gauge, zones: Crosshair, momentum: Activity, correlation: Link2, confirmation: BarChart3,
};
export const SPECIALTY_LABEL: Record<Specialty, string> = {
  "gold-structure": "Gold structure", dxy: "DXY", fibonacci: "Fibonacci", liquidity: "Liquidity", london: "London session", "new-york": "New York session", asia: "Asia session", macro: "Macro",
  risk: "Risk management", silver: "Silver", alignment: "Multi-timeframe", volatility: "Volatility", zones: "Supply & demand", momentum: "Momentum", correlation: "Correlation", confirmation: "Entry confirmation",
};

/**
 * AI agent avatar: an abstract glass orb in the agent's own hue with its specialty glyph and a permanent "AI" tag.
 * Never a photo or a human face, so nobody mistakes an agent for a person.
 */
export function AgentAvatar({ a, size = 40, className }: { a: Pick<Analyst, "name" | "hue" | "specialty">; size?: number; className?: string }) {
  const Icon = SPECIALTY_ICON[a.specialty];
  return (
    <span className={cn("agent-avatar", className)} style={{ width: size, height: size, ["--h" as string]: a.hue }} aria-hidden>
      <Icon style={{ width: size * 0.46, height: size * 0.46 }} strokeWidth={2.1} />
      <span className="agent-ai" style={{ fontSize: Math.max(10, size * 0.22) }}>AI</span>
    </span>
  );
}
