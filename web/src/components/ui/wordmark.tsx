import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Typeset wordmark. The approved Treidify logo artwork has not been supplied yet,
 * so no substitute symbol is drawn (docs/BRAND_ASSETS.md). Drop the SVG into
 * public/brand/ and render it here when it arrives.
 */
export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-baseline gap-0.5 text-[19px] font-semibold tracking-[-0.04em] text-ink", className)} aria-label="Treidify home">
      <span className="bg-[linear-gradient(180deg,var(--text),var(--silver))] bg-clip-text text-transparent">Treidify</span>
      <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]" aria-hidden />
    </Link>
  );
}
