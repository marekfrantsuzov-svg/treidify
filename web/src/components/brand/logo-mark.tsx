import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * The blue "T" mark from the approved dashboard design: a slanted bar over a slanted stem, in a violet-to-pink
 * gradient. Drawn from the design reference until the final logo file is supplied.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  // Unique per instance: a gradient defined inside a hidden copy (the desktop sidebar on mobile) would not paint.
  const id = `tlogo${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-a`} x1="2" y1="4" x2="30" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8d7cff" />
          <stop offset="1" stopColor="#533ff5" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="18" y1="10" x2="8" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7a52f2" />
          <stop offset="1" stopColor="#c45fd8" />
        </linearGradient>
      </defs>
      <path d="M3.5 5.5h25.5l-3.6 6.2H7.2z" fill={`url(#${id}-a)`} />
      <path d="M14.2 11.7h7.4L13.4 28.5c-.5 1-1.9.9-2.2-.2L9.9 23.6z" fill={`url(#${id}-b)`} />
      <path d="M3.5 5.5h25.5l-1.2 2.1H4.7z" fill="#fff" opacity=".35" />
    </svg>
  );
}
