import Link from "next/link";
import { cn } from "@/lib/cn";
import { LogoMark } from "@/components/brand/logo-mark";

/** Official T mark plus the wordmark. */
export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2 text-[19px] font-bold tracking-[-0.035em] text-ink", className)} aria-label="Treidify home">
      <LogoMark size={30} priority />
      <span>Treidify</span>
    </Link>
  );
}
