import Link from "next/link";
import { cn } from "@/lib/cn";
import { LogoMark } from "@/components/brand/logo-mark";

/** Logo mark plus wordmark, as in the approved design. Replace LogoMark with the final artwork when supplied. */
export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2 text-[19px] font-bold tracking-[-0.035em] text-ink", className)} aria-label="Treidify home">
      <LogoMark size={26} />
      <span>Treidify</span>
    </Link>
  );
}
