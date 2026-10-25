import { cn } from "@/lib/cn";

type GlassProps = React.HTMLAttributes<HTMLElement> & { strong?: boolean; as?: "div" | "section" | "article" | "aside" | "button"; type?: "button" };

/** Liquid-glass card: translucent surface, hairline border, soft top reflection. */
export function Glass({ className, strong, as: Tag = "div", ...props }: GlassProps) {
  return <Tag className={cn("glass rounded-[var(--radius-glass)]", strong && "glass-strong", className)} {...props} />;
}

export function Inset({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inset rounded-2xl", className)} {...props} />;
}
