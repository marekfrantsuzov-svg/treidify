"use client";

import { Bell, LogOut, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SESSIONS, activeSessions, marketStatus } from "@/lib/analytics/sessions";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/ui/wordmark";
import { appNav, isActive } from "./nav";

export interface ShellUser { name: string; username: string | null; email: string; avatar: string | null; isAdmin: boolean }
export interface ShellPlan { plan: "free" | "premium"; source: string; trialEndsAt: string | null }

export function Avatar({ user, size = 36 }: { user: Pick<ShellUser, "name" | "avatar">; size?: number }) {
  const initials = user.name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "T";
  return user.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element -- data URL produced by our own re-encoder
    <img src={user.avatar} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent-2),var(--accent))] text-[13px] font-semibold text-white" style={{ width: size, height: size }} aria-hidden>{initials}</span>
  );
}

function SessionClock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  if (!now) return <span className="skeleton h-8 w-44 rounded-full" />;
  const status = marketStatus(now);
  const active = activeSessions(now).map((id) => SESSIONS.find((s) => s.id === id)!.name);
  const text = status === "weekendClosed" ? "Market closed for the weekend" : status === "dailyBreak" ? "Daily break" : active.length ? active.join(" · ") : "Between sessions";
  return (
    <span className="inset hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs text-ink-2 md:inline-flex" title="Conventional session hours. Spot gold trades Sunday 18:00 to Friday 17:00 New York time.">
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "open" && active.length ? "bg-up shadow-[0_0_8px_var(--up)]" : "bg-ink-3")} />
      <span className="font-medium text-ink">{text}</span>
      <span className="num text-ink-3">{new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(now)}</span>
    </span>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" className="rounded-full ring-offset-2 ring-offset-[var(--bg-0)] transition-shadow hover:ring-2 hover:ring-[var(--border-strong)]">
        <Avatar user={user} />
      </button>
      {open && (
        <div role="menu" className="glass-strong glass absolute right-0 top-12 z-50 w-64 rounded-2xl p-2 shadow-[var(--shadow-lg)]">
          <div className="px-3 py-2">
            <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
            <div className="truncate text-xs text-ink-3">{user.username ? `@${user.username}` : user.email}</div>
          </div>
          <div className="my-1 h-px bg-[var(--border)]" />
          <Link role="menuitem" href="/app/settings/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-2 hover:bg-accent-soft hover:text-ink"><User className="h-4 w-4" />Profile and privacy</Link>
          <Link role="menuitem" href="/app/settings/plan" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-2 hover:bg-accent-soft hover:text-ink"><Sparkles className="h-4 w-4" />Plan</Link>
          <div className="flex items-center justify-between px-3 py-2 text-sm text-ink-2">Theme <ThemeToggle /></div>
          <div className="my-1 h-px bg-[var(--border)]" />
          <button role="menuitem" onClick={async () => { await authClient.signOut(); router.replace("/login"); router.refresh(); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-2 hover:bg-down-soft hover:text-down"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      )}
    </div>
  );
}

function trialLeft(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h}h left` : `${Math.max(1, Math.round(ms / 60_000))}m left`;
}

export function AppShell({ user, plan, timezone, greeting, unread, children }: { user: ShellUser; plan: ShellPlan; timezone: string; greeting: string; unread: number; children: React.ReactNode }) {
  const path = usePathname();
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => { if (plan.source === "trial" && plan.trialEndsAt) setLeft(trialLeft(plan.trialEndsAt)); }, [plan]);
  return (
    <div className="min-h-dvh lg:pl-[264px]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-white">Skip to content</a>

      <aside className="fixed inset-y-3 left-3 z-40 hidden w-[240px] flex-col lg:flex" aria-label="Main">
        <div className="glass flex h-full flex-col rounded-[28px] p-3">
          <div className="px-3 pb-6 pt-3"><Wordmark href="/app" /></div>
          <nav className="grid gap-1">
            {appNav.map(({ href, label, Icon }) => {
              const active = isActive(path, href);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] text-ink-2 transition-colors hover:bg-accent-soft hover:text-ink", active && "bg-surface-strong font-medium text-ink shadow-sm")}>
                  <Icon className={cn("h-[18px] w-[18px]", active && "text-accent")} />{label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto grid gap-2">
            {plan.plan === "premium" ? (
              <Link href="/app/settings/plan" className="inset rounded-2xl p-3 text-sm">
                <div className="flex items-center gap-1.5 font-semibold text-ink"><Sparkles className="h-4 w-4 text-accent" />Premium{plan.source === "trial" && " trial"}</div>
                {left && <div className="text-xs text-ink-3">{left}, ends on its own</div>}
              </Link>
            ) : (
              <Link href="/app/settings/plan" className="inset rounded-2xl p-3 text-sm">
                <div className="font-semibold text-ink">Free plan</div>
                <div className="text-xs text-ink-3">See what Premium adds</div>
              </Link>
            )}
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
        <div className="glass flex h-14 items-center gap-3 rounded-full pl-4 pr-2 sm:pl-5">
          <div className="lg:hidden"><Wordmark href="/app" /></div>
          <p className="hidden truncate text-[15px] text-ink-2 lg:block">{greeting}, <span className="font-medium text-ink">{user.name.split(" ")[0]}</span></p>
          <div className="ml-auto flex items-center gap-2">
            <SessionClock timezone={timezone} />
            <Link href="/app/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-accent-soft hover:text-ink">
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />}
            </Link>
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1280px] px-3 pb-32 pt-5 sm:px-5 lg:pb-12">{children}</main>

      <nav aria-label="Main" className="safe-bottom fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="glass-strong glass mx-auto grid max-w-md grid-cols-5 rounded-[26px] p-1.5 shadow-[var(--shadow-lg)]">
          {appNav.map(({ href, short, Icon }) => {
            const active = isActive(path, href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 rounded-[20px] py-2 text-[10.5px] font-medium text-ink-3 transition-colors", active && "bg-surface-strong text-accent")}>
                <Icon className="h-5 w-5" />{short}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
