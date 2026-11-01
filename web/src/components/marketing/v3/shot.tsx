/* eslint-disable @next/next/no-img-element -- static product screenshots with fixed intrinsic size; two theme variants */
import { cn } from "@/lib/cn";

export type ShotName = "dash" | "macro" | "zones" | "health" | "coach" | "phone-dash" | "phone-macro";

/**
 * A real Treidify screenshot (captured from the app with its sample data), in the visitor's theme. The hidden
 * variant is display:none, so with lazy loading the browser does not fetch it.
 */
export function Shot({ name, alt, eager, className }: { name: ShotName; alt: string; eager?: boolean; className?: string }) {
  const phone = name.startsWith("phone");
  const [w, h] = phone ? [780, 1688] : [1600, 1000];
  const common = { width: w, height: h, decoding: "async" as const, draggable: false, loading: eager ? ("eager" as const) : ("lazy" as const) };
  return (
    <>
      <img src={`/marketing/${name}-light.webp`} alt={alt} {...common} fetchPriority={eager ? "high" : undefined} className={cn("shot-light block h-auto w-full", className)} />
      <img src={`/marketing/${name}-dark.webp`} alt={alt} {...common} className={cn("shot-dark block h-auto w-full", className)} />
    </>
  );
}

/** Laptop-style glass frame around a desktop screenshot. */
export function Laptop({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("device-laptop", className)}>
      <div className="device-laptop-screen">
        <div className="device-bar" aria-hidden><span /><span /><span /><em>app.treidify.com</em></div>
        <div className="overflow-hidden rounded-b-[14px]">{children}</div>
      </div>
      <div className="device-laptop-base" aria-hidden />
    </div>
  );
}

/** iPhone-style frame around a phone screenshot. */
export function Phone({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("device-phone", className)}>
      <div className="device-phone-screen">{children}<span className="device-island" aria-hidden /></div>
    </div>
  );
}
