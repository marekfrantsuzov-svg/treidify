import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** The one card used across the app: layered surface, 24px radius, consistent padding. */
export function Card({ className, as: Tag = "section", ...props }: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return <Tag className={cn("glass rounded-[24px] p-4 sm:p-5", className)} {...props} />;
}

/** Card heading row: title (and optional caption) on the left, actions on the right. */
export function CardHeader({ title, caption, icon, href, hrefLabel, children, id, className }: {
  title: React.ReactNode; caption?: React.ReactNode; icon?: React.ReactNode; href?: string; hrefLabel?: string; children?: React.ReactNode; id?: string; className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <div className="min-w-0">
          <h2 id={id} className="card-title truncate">{title}</h2>
          {caption && <p className="mt-0.5 truncate text-[12px] text-ink-3">{caption}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {children}
        {href && <Link href={href} aria-label={hrefLabel ?? "Open"} className="icon-btn"><ArrowUpRight className="h-4 w-4" /></Link>}
      </div>
    </div>
  );
}

/** Icon in a round well, a large figure and a short label: the Solvik-style headline metric. */
export function Stat({ icon, label, value, sub, tone, className }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "up" | "down" | "muted"; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span className="stat-icon max-sm:hidden" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <div className={cn("display-num truncate text-[clamp(1.15rem,1.6vw,1.5rem)] leading-tight", tone === "down" ? "text-down" : tone === "muted" ? "text-ink-3" : "text-ink")}>{value}</div>
        <div className="line-clamp-2 text-[12px] leading-snug text-ink-3">{label}{sub ? <> · {sub}</> : null}</div>
      </div>
    </div>
  );
}
