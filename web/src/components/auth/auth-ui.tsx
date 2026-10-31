"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Children, cloneElement, isValidElement, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { Glass } from "@/components/ui/glass";

export const inputClass =
  "inset h-12 w-full rounded-2xl px-4 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink-3 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] aria-[invalid=true]:border-down";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <>
      <Glass strong className="p-6 shadow-[var(--shadow-lg)] sm:p-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-2">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </Glass>
      {footer && <div className="mt-5 text-center text-sm text-ink-2">{footer}</div>}
    </>
  );
}

/**
 * Labelled form field. The label is tied to the first child control by id, so its accessible name is
 * exactly `label`, never polluted by hints or buttons inside the field.
 */
export function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: React.ReactNode; children: React.ReactNode }) {
  const id = useId();
  let done = false;
  const kids = Children.map(children, (c) => {
    if (done || !isValidElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>(c)) return c;
    done = true;
    return cloneElement(c, { id: c.props.id ?? id, ...(error ? { "aria-describedby": `${id}-err`, "aria-invalid": true } : {}) });
  });
  return (
    <div className="grid gap-1.5 text-sm font-medium text-ink">
      <span className="flex items-center justify-between gap-3"><label htmlFor={id}>{label}</label>{hint}</span>
      {kids}
      {error && <span id={`${id}-err`} className="text-xs font-normal text-down">{error}</span>}
    </div>
  );
}

export function UsernameInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden>@</span>
      <input autoComplete="username" spellCheck={false} maxLength={24} {...props} className={cn(inputClass, "pl-8", className)} />
    </div>
  );
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={cn(inputClass, "pr-12", props.className)} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:text-ink">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function Alert({ tone = "down", children }: { tone?: "down" | "up" | "warn" | "accent"; children: React.ReactNode }) {
  const t = { down: "bg-down-soft text-down", up: "bg-up-soft text-up", warn: "bg-warn-soft text-warn", accent: "bg-accent-soft text-accent" }[tone];
  return <div role={tone === "down" ? "alert" : "status"} className={cn("rounded-2xl px-4 py-3 text-sm", t)}>{children}</div>;
}

export function Spinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M16.4 12.6c0-2.7 2.2-4 2.3-4.1a5 5 0 0 0-3.9-2.1c-1.7-.2-3.2 1-4.1 1-.8 0-2.1-1-3.5-.9a5.2 5.2 0 0 0-4.4 2.7c-1.9 3.3-.5 8.1 1.4 10.7.9 1.3 2 2.8 3.4 2.7 1.4 0 1.9-.9 3.5-.9s2.1.9 3.5.9c1.5 0 2.4-1.3 3.3-2.6 1-1.5 1.4-2.9 1.5-3a4.7 4.7 0 0 1-3-4.4zM13.7 4.5c.7-.9 1.3-2.2 1.1-3.5-1.1.1-2.4.7-3.2 1.6-.7.8-1.3 2.1-1.1 3.3 1.2.1 2.4-.6 3.2-1.4z" />
    </svg>
  );
}

export function SocialButtons({ enabled, onSelect, busy }: { enabled: { google: boolean; apple: boolean }; onSelect: (p: "google" | "apple") => void; busy: string | null }) {
  const [notice, setNotice] = useState<string | null>(null);
  const click = (p: "google" | "apple") => {
    if (!enabled[p]) { setNotice(`${p === "google" ? "Google" : "Apple"} sign-in is being set up. Please use email for now.`); return; }
    onSelect(p);
  };
  return (
    <div className="grid gap-2.5">
      <button type="button" onClick={() => click("apple")} className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[var(--text)] text-[15px] font-medium text-[var(--bg-0)] transition-transform active:scale-[0.98]">
        {busy === "apple" ? <Spinner /> : <AppleMark />} Continue with Apple
      </button>
      <button type="button" onClick={() => click("google")} className="glass flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-medium text-ink transition-transform active:scale-[0.98]">
        {busy === "google" ? <Spinner /> : <GoogleMark />} Continue with Google
      </button>
      {notice && <Alert tone="warn">{notice}</Alert>}
    </div>
  );
}

export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-ink-3">
      <span className="h-px flex-1 bg-[var(--border)]" />{label}<span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback = "/app") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
