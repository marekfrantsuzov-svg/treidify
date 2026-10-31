"use client";

import { Bell, CalendarDays, LayoutGrid, Check, ChevronDown, LogOut, Moon, Search, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { SESSIONS, activeSessions, marketStatus } from "@/lib/analytics/sessions";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { PERIOD_IDS, PERIOD_NAMES, readPeriod } from "@/lib/period-param";
import { GlassIcon, Glyph } from "@/components/icons/glass-icon";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { Wordmark } from "@/components/ui/wordmark";
import { appNav, isActive, mobileTabs, primaryNav, toolNav, type NavItem } from "./nav";

export interface ShellUser { name: string; username: string | null; email: string; avatar: string | null; isAdmin: boolean }
export interface ShellPlan { plan: "free" | "premium"; source: string; trialEndsAt: string | null }
export interface ShellAccount { label: string; status: string | null; sample: boolean }

export function Avatar({ user, size = 36 }: { user: Pick<ShellUser, "name" | "avatar">; size?: number }) {
  const initials = user.name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "T";
  return user.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element -- data URL produced by our own re-encoder
    <img src={user.avatar} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-[var(--surface-strong)]" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-brand text-[13px] font-semibold text-white ring-2 ring-[var(--surface-strong)]" style={{ width: size, height: size }} aria-hidden>{initials}</span>
  );
}

function useDismiss<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);
  return ref;
}

function sessionLine(now: Date) {
  const status = marketStatus(now);
  if (status === "weekendClosed") return "Markets are closed for the weekend.";
  if (status === "dailyBreak") return "Daily market break. Trading resumes at 18:00 New York.";
  const active = activeSessions(now).map((id) => SESSIONS.find((s) => s.id === id)!.name);
  return active.length ? `${active.join(" and ")} session${active.length > 1 ? "s" : ""} open.` : "Between major sessions.";
}

function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"} className="glass grid h-11 w-11 place-items-center rounded-full text-ink-2 transition-colors hover:text-ink">
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

function DateSelector() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const current = readPeriod({ period: params.get("period") ?? undefined, from: params.get("from") ?? undefined, to: params.get("to") ?? undefined });
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(current.custom?.from ?? today.slice(0, 8) + "01");
  const [to, setTo] = useState(current.custom?.to ?? today);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  // Pages that read the period keep it; everywhere else the period opens the dashboard.
  const go = (q: string) => { setOpen(false); router.push(`${["/app", "/app/performance", "/app/journal"].includes(path) ? path : "/app"}?${q}`, { scroll: false }); };
  const label = current.id === "CUSTOM" && current.custom ? `${current.custom.from.slice(5)} to ${current.custom.to.slice(5)}` : PERIOD_NAMES[current.id];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} className="glass press flex h-11 items-center gap-2.5 rounded-full pl-4 pr-3.5 text-sm font-medium text-ink hover:border-[var(--border-strong)]">
        <CalendarDays className="h-[18px] w-[18px] text-ink-2" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown className={cn("h-4 w-4 text-ink-3 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div role="listbox" aria-label="Period" className="glass glass-strong pop-in absolute right-0 top-13 z-50 w-64 max-lg:left-0 max-lg:right-auto rounded-2xl p-1.5 shadow-[var(--shadow-lg)]">
          {PERIOD_IDS.filter((id) => id !== "CUSTOM").map((id) => (
            <button key={id} role="option" aria-selected={current.id === id} onClick={() => go(`period=${id}`)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-ink-2 transition-colors duration-150 hover:bg-accent-soft hover:text-ink aria-selected:font-medium aria-selected:text-ink">
              {PERIOD_NAMES[id]}{current.id === id && <Check className="h-4 w-4 text-accent" />}
            </button>
          ))}
          <div className="mt-1 border-t border-line px-3 pb-2 pt-2.5">
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">Custom range</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input type="date" aria-label="From" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className="inset rounded-xl px-2 py-1.5 text-xs text-ink outline-none" />
              <input type="date" aria-label="To" value={to} max={today} onChange={(e) => setTo(e.target.value)} className="inset rounded-xl px-2 py-1.5 text-xs text-ink outline-none" />
            </div>
            <button onClick={() => go(`period=CUSTOM&from=${from}&to=${to}`)} className="press bg-brand mt-2 w-full rounded-full py-1.5 text-sm font-medium text-white shadow-[0_8px_18px_-8px_var(--accent-glow)] hover:brightness-110">Apply range</button>
          </div>
        </div>
      )}
    </div>
  );
}

const SEARCH_ITEMS = [
  ...appNav.map((n) => ({ label: n.label, href: n.href, hint: "Page" })),
  { label: "XAUUSD · Gold", href: "/app/markets?symbol=XAUUSD", hint: "Market" },
  { label: "DXY · US Dollar Index", href: "/app/markets?symbol=DXY", hint: "Market" },
  { label: "XAGUSD · Silver", href: "/app/macro", hint: "Market" },
  { label: "US 10-year yield", href: "/app/macro", hint: "Market" },
  { label: "Profile and privacy", href: "/app/settings/profile", hint: "Settings" },
  { label: "Two-step sign-in", href: "/app/settings/security", hint: "Settings" },
  { label: "Plan and trial", href: "/app/settings/plan", hint: "Settings" },
  { label: "Notifications", href: "/app/notifications", hint: "Page" },
];

function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? SEARCH_ITEMS.filter((s) => s.label.toLowerCase().includes(t) || s.hint.toLowerCase().includes(t)) : SEARCH_ITEMS.slice(0, 8);
  }, [q]);
  useEffect(() => { if (open) { setQ(""); setI(0); } }, [open]);
  if (!open) return null;
  const go = (href: string) => { onClose(); router.push(href); };
  return (
    <div className="scrim-in fixed inset-0 z-[60] grid items-start justify-items-center bg-[rgba(20,12,40,0.28)] px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-label="Search" className="glass glass-strong sheet-in w-full max-w-xl overflow-hidden rounded-3xl shadow-[var(--shadow-lg)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Glyph name="search" size={20} />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setI(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
              if (e.key === "Enter" && results[i]) go(results[i].href);
              if (e.key === "Escape") onClose();
            }}
            placeholder="Search markets, pages and settings"
            aria-label="Search"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          <button onClick={onClose} aria-label="Close search" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.map((r, idx) => (
            <li key={r.href + r.label}>
              <button onMouseEnter={() => setI(idx)} onClick={() => go(r.href)} className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-ink transition-colors duration-150", idx === i && "bg-accent-soft text-accent")}>
                {r.label}<span className="text-xs text-ink-3">{r.hint}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">No matches. The AI assistant will answer questions here once it is connected.</li>}
        </ul>
      </div>
    </div>
  );
}

function ThemeItem({ className }: { className: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button role="menuitem" onClick={() => setTheme(dark ? "light" : "dark")} className={cn(className, "w-full")}>
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{dark ? "Light mode" : "Dark mode"}
    </button>
  );
}

function UserMenu({ user, plan }: { user: ShellUser; plan: ShellPlan }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const item = "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-2 transition-colors duration-150 hover:bg-accent-soft hover:text-ink";
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" className="press rounded-full shadow-[var(--shadow)] hover:shadow-[0_0_0_3px_var(--accent-soft),var(--shadow)]">
        <Avatar user={user} size={44} />
      </button>
      {open && (
        <div role="menu" className="glass glass-strong pop-in absolute right-0 top-14 z-50 w-64 rounded-2xl p-2 shadow-[var(--shadow-lg)]">
          <div className="px-3 py-2">
            <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
            <div className="truncate text-xs text-ink-3">{user.username ? `@${user.username}` : user.email}</div>
            <div className="mt-1 text-xs text-accent">{plan.plan === "premium" ? (plan.source === "trial" ? "Premium trial" : "Premium") : "Free plan"}</div>
          </div>
          <div className="my-1 h-px bg-[var(--border)]" />
          <Link role="menuitem" href="/app/settings/profile" onClick={() => setOpen(false)} className={item}><Glyph name="profile" size={18} />Profile and privacy</Link>
          <Link role="menuitem" href="/app/settings/plan" onClick={() => setOpen(false)} className={item}><Glyph name="spark" size={18} />Plan</Link>
          <Link role="menuitem" href="/app/settings/security" onClick={() => setOpen(false)} className={item}><Glyph name="shield" size={18} />Security</Link>
          <ThemeItem className={item} />
          <div className="my-1 h-px bg-[var(--border)]" />
          <button role="menuitem" onClick={async () => { await authClient.signOut(); router.replace("/login"); router.refresh(); }} className={cn(item, "w-full hover:bg-down-soft hover:text-down")}><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      )}
    </div>
  );
}

function MoreSheet({ open, onClose, path }: { open: boolean; onClose: () => void; path: string }) {
  if (!open) return null;
  return (
    <div className="scrim-in fixed inset-0 z-50 bg-[rgba(20,12,40,0.3)] backdrop-blur-sm lg:hidden" onClick={onClose}>
      <div role="dialog" aria-label="More" className="glass glass-strong sheet-in safe-bottom absolute inset-x-3 bottom-3 rounded-[28px] p-4 shadow-[var(--shadow-lg)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between px-1"><span className="text-sm font-semibold text-ink">All sections</span><button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-ink-3"><X className="h-4 w-4" /></button></div>
        <div className="mb-4 flex items-center gap-2 px-1"><DateSelector /><ThemeSwitch /></div>
        <div className="grid grid-cols-4 gap-y-4">
          {appNav.map((n) => (
            <Link key={n.href} href={n.href} onClick={onClose} className="press grid justify-items-center gap-1.5 text-center text-[11px] font-medium text-ink-2">
              <GlassIcon name={n.icon} size={48} active={isActive(path, n.href)} />{n.short}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ user, plan, account, timezone, greeting, unread, children }: { user: ShellUser; plan: ShellPlan; account: ShellAccount | null; timezone: string; greeting: string; unread: number; children: React.ReactNode }) {
  const path = usePathname();
  const [search, setSearch] = useState(false);
  const [more, setMore] = useState(false);
  const line = "Here’s your market overview. Stay disciplined.";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(true); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setMore(false), [path]);
  const first = user.name.split(" ")[0];
  const moreActive = !mobileTabs.some((h) => isActive(path, h));

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-white">Skip to content</a>

      <aside className="fixed inset-y-3 left-3 z-40 hidden w-[228px] flex-col lg:flex" aria-label="Main">
        <div className="glass flex h-full flex-col rounded-[28px] px-3 pb-3 pt-5">
          <div className="px-3 pb-6"><Wordmark href="/app" className="text-[23px]" /></div>
          <nav className="relative grid gap-1 overflow-y-auto [scrollbar-width:none]">
            <SlidingPill watch={path} className="rounded-2xl bg-[var(--surface-strong)] shadow-[var(--shadow),0_0_0_1px_color-mix(in_oklab,var(--accent)_12%,transparent)]" />
            {primaryNav.map((n) => <SideLink key={n.href} item={n} path={path} />)}
            <div className="mx-3 my-2 h-px bg-[var(--border)]" />
            {toolNav.map((n) => <SideLink key={n.href} item={n} path={path} />)}
          </nav>
          <div className="mt-auto grid gap-2 pt-3">
            <Link href="/app/accounts" className="glass glass-strong glass-hover press flex items-center gap-3 rounded-2xl px-3.5 py-3">
              <span className={cn("h-3 w-3 shrink-0 rounded-full", account?.status === "connected" ? "bg-up shadow-[0_0_10px_var(--up)]" : account?.sample ? "bg-warn shadow-[0_0_10px_var(--warn)]" : "bg-[var(--border-strong)]")} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">{account ? (account.sample ? "Sample account" : account.status === "connected" ? "Connected" : "Connecting") : "Not connected"}</span>
                <span className="block truncate text-[11.5px] text-ink-3">{account ? (account.sample ? "Demo data, not live" : account.label.startsWith("MT4") ? "MetaTrader 4" : "MetaTrader 5") : "Connect MetaTrader"}</span>
              </span>
            </Link>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 lg:pt-4">
        <div className="flex items-center gap-3 rounded-full py-1 max-lg:glass max-lg:h-14 max-lg:pl-4 max-lg:pr-1.5">
          <div className="lg:hidden"><Wordmark href="/app" /></div>
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-[27px] font-bold leading-tight tracking-[-0.03em] text-ink">{greeting}, {first} <span aria-hidden>👋</span></p>
            <p className="truncate text-[15px] text-ink-3">{line}</p>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <button onClick={() => setSearch(true)} className="glass press hidden h-11 w-[min(400px,30vw)] items-center gap-2.5 rounded-full px-4 text-sm text-ink-3 hover:border-[var(--border-strong)] hover:text-ink-2 xl:flex">
              <Search className="h-[18px] w-[18px] text-ink-2" />
              <span className="flex-1 truncate text-left">Search markets, news, or ask AI…</span>
              <kbd className="inset rounded-md px-1.5 py-0.5 text-[11px] font-medium text-ink-3">⌘K</kbd>
            </button>
            <button onClick={() => setSearch(true)} aria-label="Search" className="glass press grid h-11 w-11 place-items-center rounded-full xl:hidden max-lg:hidden"><Search className="h-[18px] w-[18px] text-ink-2" /></button>
            <div className="hidden lg:block"><DateSelector /></div>
            <Link href="/app/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="press relative grid h-11 w-11 place-items-center rounded-full hover:text-accent lg:glass">
              <Bell className="h-5 w-5 text-ink-2" />
              {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-down ring-2 ring-[var(--surface-strong)]" />}
            </Link>
            <UserMenu user={user} plan={plan} />
          </div>
        </div>
        <p className="mt-4 px-1 text-[22px] font-bold tracking-[-0.03em] text-ink lg:hidden">{greeting}, {first} <span aria-hidden>👋</span></p>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1400px] px-3 pb-36 pt-4 sm:px-5 lg:pb-12">{children}</main>

      <nav aria-label="Main" className="safe-bottom fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="glass glass-strong relative mx-auto grid max-w-md grid-cols-5 rounded-[28px] p-1.5 shadow-[var(--shadow-lg)]">
          <SlidingPill watch={`${path}${more}`} className="rounded-[22px] bg-accent-soft shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_14%,transparent)]" />
          {mobileTabs.map((href) => {
            const n = appNav.find((x) => x.href === href)!;
            const active = isActive(path, href);
            return (
              <Link key={href} href={href} data-active={active && !more} aria-current={active ? "page" : undefined} className={cn("relative z-[1] flex flex-col items-center gap-1 rounded-[22px] py-2 text-[10.5px] font-medium text-ink-3 transition-[color,transform] duration-200 active:scale-95", active && "text-accent")}>
                <n.line className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />{n.short}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} data-active={moreActive || more} aria-label="More sections" className={cn("relative z-[1] flex flex-col items-center gap-1 rounded-[22px] py-2 text-[10.5px] font-medium text-ink-3 transition-[color,transform] duration-200 active:scale-95", (moreActive || more) && "text-accent")}>
            <LayoutGrid className="h-[22px] w-[22px]" strokeWidth={moreActive ? 2.2 : 1.8} />More
          </button>
        </div>
      </nav>

      <MoreSheet open={more} onClose={() => setMore(false)} path={path} />
      <SearchPalette open={search} onClose={() => setSearch(false)} />
    </div>
  );
}

/** Sidebar entry: a line icon, and a violet glass disc with a white glyph when active. The shared pill travels behind it. */
function SideLink({ item, path }: { item: NavItem; path: string }) {
  const active = isActive(path, item.href);
  const Icon = item.line;
  return (
    <Link href={item.href} data-active={active} aria-current={active ? "page" : undefined} className={cn("group relative z-[1] flex items-center gap-3 rounded-2xl px-2 py-1.5 text-[15px] text-ink-2 transition-colors duration-200 hover:text-ink", !active && "hover:bg-[var(--surface-inset)]", active && "font-semibold text-ink")}>
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full transition-[background,box-shadow,transform,color] duration-300 ease-[var(--ease-spring)] group-active:scale-90", active ? "bg-brand text-white shadow-[0_6px_16px_-6px_var(--accent-glow),inset_0_1px_0_rgba(255,255,255,0.5)]" : "group-hover:text-accent")}>
        <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.1 : 1.7} />
      </span>
      {item.label}
    </Link>
  );
}
