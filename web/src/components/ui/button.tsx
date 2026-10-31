import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "press inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none aria-disabled:pointer-events-none aria-disabled:opacity-45 select-none";
const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_10px_26px_-10px_var(--accent-glow)] hover:brightness-[1.08] hover:shadow-[0_1px_0_rgba(255,255,255,0.32)_inset,0_16px_34px_-10px_var(--accent-glow)] active:brightness-95",
  secondary: "glass text-ink hover:bg-surface-strong hover:border-[color-mix(in_oklab,var(--accent)_24%,var(--border))] hover:shadow-[var(--shadow),0_10px_26px_-16px_var(--accent-glow)]",
  ghost: "text-ink-2 hover:text-accent hover:bg-accent-soft active:bg-[color-mix(in_oklab,var(--accent)_16%,transparent)]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(base, variants[variant], sizes[size], className);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type LinkProps = React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant, size, className, ...props }: LinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
