import { cn } from "@/lib/cn";

/**
 * The official Treidify "T" (Marek's supplied artwork, 2026-11-01), used exactly as delivered: only trimmed to its
 * bounding box and resized. Never redraw or recolour it. Sources live in public/brand/treidify-t-{64,128,256,512}.
 */
export function LogoMark({ size = 28, className, priority = false }: { size?: number; className?: string; priority?: boolean }) {
  // Pick the smallest source that is still at least 2x the rendered size, for crisp edges on retina screens.
  const src = size * 2 <= 64 ? 64 : size * 2 <= 128 ? 128 : size * 2 <= 256 ? 256 : 512;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed-size static brand asset; next/image adds nothing here.
    <img
      src={`/brand/treidify-t-${src}.webp`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
      className={cn("shrink-0 select-none object-contain", className)}
    />
  );
}
