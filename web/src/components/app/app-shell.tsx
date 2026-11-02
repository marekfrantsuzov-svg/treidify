"use client";

import { Bell, CalendarDays, Check, ChevronDown, Crown, LogOut, Menu, Monitor, Moon, Search, Settings, ShieldCheck, Sun, UserRound, Volume2, VolumeX, X, ArrowRight } from "lucide-react";
import { useFreshness } from "@/components/intel/freshness-store";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SESSIONS, activeSessions, marketStatus } from "@/lib/analytics/sessions";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { PERIOD_IDS, PERIOD_NAMES, readPeriod } from "@/lib/period-param";
import { onSoundPrefs, playSound, readSoundPrefs, writeSoundPrefs, type SoundPrefs } from "@/lib/sound";
import { SlidingPill } from "@/components/ui/sliding-pill";
import { Toaster, toast } from "@/components/ui/toast";
import { LogoMark } from "@/components/brand/logo-mark";
import { appNav, isActive, mobileTabBar, primaryNav, toolNav, type NavItem } from "./nav";

export interface ShellUser { name: string; username: string | null; email: string; avatar: string | null; isAdmin: boolean }
export interface ShellPlan { plan: "free" | "premium"; source: string; trialEndsAt: string | null }
export interface ShellAccount { label: string; status: string | null; sample: boolean }

export function Avatar({ user, size = 36 }: { user: Pick<ShellUser, "name" | "avatar">; size?: number }) {
  const initials = user.name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "T";
  return user.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element -- data URL produced by our own re-encoder
    <img src={user.avatar} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-[var(--surface-strong)]" style={{ width: size, height: size }} />
  ) : (
    <span data-initials={initials} className="grid shrink-0 place-items-center rounded-full bg-brand text-[13px] font-semibold text-white ring-2 ring-[var(--surface-strong)] before:content-[attr(data-initials)]" style={{ width: size, height: size }} aria-hidden />
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

/** One line under the greeting, from the real trading-session clock. */
export function marketLine(now: Date) {
  const status = marketStatus(now);
  if (status === "weekendClosed") return "Markets are closed for the weekend. Here’s your trading overview.";
  if (status === "dailyBreak") return "Daily market break until 18:00 New York. Here’s your trading overview.";
  const active = activeSessions(now).map((id) => SESSIONS.find((s) => s.id === id)!.name);
  return active.length ? `Markets are active, ${active.join(" and ")} session${active.length > 1 ? "s" : ""} open. Here’s your trading overview.` : "Markets are active. Here’s your trading overview.";
}

function useNow(every = 30_000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const id = setInterval(() => setNow(new Date()), every); return () => clearInterval(id); }, [every]);
  return now;
}

/** Switches theme with a short crossfade where the View Transitions API exists; instant otherwise or with reduced motion. */
function crossfadeTheme(setTheme: (t: string) => void, t: string) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const apply = () => {
    const resolved = t === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
    setTheme(t);
  };
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return setTheme(t);
  doc.startViewTransition(apply);
}

/** Light / Dark / System, persisted by next-themes (localStorage). */
function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? theme ?? "light" : "light";
  const opts = [{ id: "light", label: "Light", Icon: Sun }, { id: "dark", label: "Dark", Icon: Moon }, { id: "system", label: "System", Icon: Monitor }] as const;
  return (
    <div role="radiogroup" aria-label="Theme" className="inset relative grid grid-cols-3 rounded-full p-1">
      <SlidingPill watch={current} className="rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow)]" />
      {opts.map(({ id, label, Icon }) => (
        <button key={id} role="radio" aria-checked={current === id} data-active={current === id} onClick={() => crossfadeTheme(setTheme, id)}
          className={cn("relative z-[1] flex h-8 items-center justify-center gap-1.5 rounded-full px-2 text-[12.5px] font-medium text-ink-3 transition-colors hover:text-ink", current === id && "text-ink")}>
          <Icon className="h-[15px] w-[15px]" />{label}
        </button>
      ))}
    </div>
  );
}

/** One-tap light/dark switch for the header. The full Light / Dark / System choice is in the account menu. */
function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button onClick={() => { crossfadeTheme(setTheme, dark ? "light" : "dark"); playSound("tap"); }} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light theme" : "Dark theme"} className={cn("hdr-btn press", className)}>
      {dark ? <Sun className="h-[19px] w-[19px]" /> : <Moon className="h-[19px] w-[19px]" />}
    </button>
  );
}

/** Session, market open/closed and the freshness of the last data the dashboard received. */
export function MarketStatusChips() {
  const now = useNow();
  const f = useFreshness();
  if (!now) return <div className="h-7" />;
  const status = marketStatus(now);
  const active = activeSessions(now).map((id) => SESSIONS.find((x) => x.id === id)!.name);
  const fl = f.mode === "sample" ? { t: "Sample data", c: "bg-warn-soft text-warn" } : f.freshness === "live" ? { t: "Data up to date", c: "bg-up-soft text-up" } : f.freshness === "delayed" ? { t: "Data delayed", c: "bg-warn-soft text-warn" } : f.freshness === "stale" ? { t: "Data stale", c: "bg-down-soft text-down" } : null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 whitespace-nowrap text-[12px] font-medium">
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", status === "open" ? "bg-up-soft text-up" : "bg-inset text-ink-2")}>
        <span className={cn("h-1.5 w-1.5 rounded-full", status === "open" ? "bg-up shadow-[0_0_8px_var(--up)] motion-safe:animate-pulse" : "bg-ink-3")} />
        {status === "open" ? "Gold market open" : status === "dailyBreak" ? "Daily break" : "Market closed"}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-inset px-2.5 py-1 text-ink-2">{status !== "open" ? "No session" : active.length ? `${active.join(" + ")} session` : "Between sessions"}</span>
      {fl && <span className={cn("inline-flex items-center rounded-full px-2.5 py-1", fl.c)} title={f.asOf ? `Last calculated ${new Date(f.asOf).toLocaleTimeString()}` : undefined}>{fl.t}</span>}
    </div>
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
  const go = (q: string) => { setOpen(false); router.push(`${["/app", "/app/performance", "/app/journal"].includes(path) ? path : "/app"}?${q}`, { scroll: false }); };
  const label = current.id === "CUSTOM" && current.custom ? `${current.custom.from.slice(5)} to ${current.custom.to.slice(5)}` : PERIOD_NAMES[current.id];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} className="hdr-pill press gap-2.5 pl-4 pr-3.5 text-sm font-medium text-ink">
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
  { label: "XAUUSD · Gold / US Dollar", href: "/app/markets?symbol=XAUUSD", hint: "Pair" },
  { label: "DXY · US Dollar Index", href: "/app/markets?symbol=DXY", hint: "Pair" },
  { label: "XAGUSD · Silver / US Dollar", href: "/app/markets?symbol=XAGUSD", hint: "Pair" },
  { label: "EURUSD · Euro / US Dollar", href: "/app#market-overview", hint: "Pair" },
  { label: "GBPUSD · British Pound / US Dollar", href: "/app#market-overview", hint: "Pair" },
  { label: "USDJPY · US Dollar / Japanese Yen", href: "/app#market-overview", hint: "Pair" },
  { label: "BTCUSD · Bitcoin / US Dollar", href: "/app#market-overview", hint: "Pair" },
  { label: "Latest market news", href: "/app/news", hint: "News" },
  { label: "High-impact events this week", href: "/app/news?tab=calendar", hint: "News" },
  { label: "Rates, inflation and GDP", href: "/app/macro", hint: "Macro" },
  { label: "US 10-year yield", href: "/app/macro", hint: "Macro" },
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
    return t ? SEARCH_ITEMS.filter((s) => s.label.toLowerCase().includes(t) || s.hint.toLowerCase().includes(t)) : SEARCH_ITEMS.filter((s) => s.hint !== "Page").slice(0, 9);
  }, [q]);
  useEffect(() => { if (open) { setQ(""); setI(0); } }, [open]);
  if (!open) return null;
  const go = (href: string) => { onClose(); playSound("nav"); router.push(href); };
  return (
    <div className="scrim-in fixed inset-0 z-[60] grid items-start justify-items-center bg-[rgba(20,12,40,0.28)] px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-label="Search" className="glass glass-strong sheet-in w-full max-w-xl overflow-hidden rounded-3xl shadow-[var(--shadow-lg)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-ink-2" />
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
            placeholder="Search pairs, news, macro…"
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
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-3">No matches for “{q}”.</li>}
        </ul>
      </div>
    </div>
  );
}

/** Sounds and browser notifications, both off until the person turns them on. */
function Preferences() {
  const [p, setP] = useState<SoundPrefs>({ on: false, volume: 0.5 });
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => {
    setP(readSoundPrefs());
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    return onSoundPrefs(setP);
  }, []);
  const set = (next: SoundPrefs) => { writeSoundPrefs(next); if (next.on) playSound("tap", true); };
  return (
    <div className="grid gap-2.5 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-ink">{p.on ? <Volume2 className="h-4 w-4 text-accent" /> : <VolumeX className="h-4 w-4 text-ink-3" />}Interface sounds</span>
        <button role="switch" aria-checked={p.on} aria-label="Interface sounds" onClick={() => { set({ ...p, on: !p.on }); toast(p.on ? "Sounds off." : "Sounds on.", "success"); }} className="switch" data-on={p.on}><span /></button>
      </div>
      {p.on && <input type="range" min={0} max={1} step={0.05} value={p.volume} aria-label="Sound volume" onChange={(e) => writeSoundPrefs({ ...p, volume: Number(e.target.value) })} onPointerUp={() => playSound("tap", true)} className="w-full accent-[var(--accent)]" />}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-ink"><Bell className="h-4 w-4 text-ink-3" />Browser alerts</span>
        {perm === "unsupported" ? <span className="text-[12px] text-ink-3">Not supported</span>
          : perm === "granted" ? <span className="text-[12px] font-medium text-up">Allowed</span>
          : perm === "denied" ? <span className="text-[12px] text-ink-3" title="Change this in your browser’s site settings">Blocked in browser</span>
          : <button onClick={async () => { const r = await Notification.requestPermission(); setPerm(r); toast(r === "granted" ? "Browser alerts allowed." : "Browser alerts not allowed.", r === "granted" ? "success" : "info"); }} className="press rounded-full bg-accent-soft px-3 py-1 text-[12px] font-semibold text-accent">Allow</button>}
      </div>
    </div>
  );
}

function UserMenu({ user, plan, size = 44, chevron = false }: { user: ShellUser; plan: ShellPlan; size?: number; chevron?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const item = "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-2 transition-colors duration-150 hover:bg-accent-soft hover:text-ink";
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" className="press flex items-center gap-1.5 rounded-full">
        <span className="rounded-full shadow-[var(--shadow)]"><Avatar user={user} size={size} /></span>
        {chevron && <ChevronDown className={cn("h-4 w-4 text-ink-2 transition-transform duration-200", open && "rotate-180")} />}
      </button>
      {open && (
        <div role="menu" className="glass glass-strong pop-in absolute right-0 z-50 w-72 rounded-2xl p-2 shadow-[var(--shadow-lg)]" style={{ top: size + 10 }}>
          <div className="px-3 py-2">
            <div className="truncate text-sm font-semibold text-ink">{user.name}</div>
            <div className="truncate text-xs text-ink-3">{user.username ? `@${user.username}` : user.email}</div>
            <div className="mt-1 text-xs font-medium text-accent">{plan.plan === "premium" ? (plan.source === "trial" ? "Premium trial" : "Premium") : "Free plan"}</div>
          </div>
          <div className="my-1 h-px bg-[var(--border)]" />
          <Link role="menuitem" href="/app/settings/profile" onClick={() => setOpen(false)} className={item}><UserRound className="h-4 w-4" />Profile and privacy</Link>
          <Link role="menuitem" href="/app/settings/plan" onClick={() => setOpen(false)} className={item}><Crown className="h-4 w-4" />Plan</Link>
          <Link role="menuitem" href="/app/settings/security" onClick={() => setOpen(false)} className={item}><ShieldCheck className="h-4 w-4" />Security</Link>
          <Link role="menuitem" href="/app/settings" onClick={() => setOpen(false)} className={item}><Settings className="h-4 w-4" />Settings</Link>
          <div className="my-1 h-px bg-[var(--border)]" />
          <div className="px-1 py-1.5"><ThemeSwitch /></div>
          <Preferences />
          <div className="my-1 h-px bg-[var(--border)]" />
          <button role="menuitem" onClick={async () => { await authClient.signOut(); router.replace("/login"); router.refresh(); }} className={cn(item, "w-full hover:bg-down-soft hover:text-down")}><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      )}
    </div>
  );
}

/** Mobile menu: every section, in the same order as the desktop sidebar, plus search and theme. */
function MenuSheet({ open, onClose, path, search, onSearch, account }: { open: boolean; onClose: () => void; path: string; search: string; onSearch: () => void; account: ShellAccount | null }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.documentElement.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="scrim-in fixed inset-0 z-50 bg-[rgba(20,12,40,0.32)] backdrop-blur-[6px] lg:hidden" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Menu" className="m-drawer drawer-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-1 pb-3">
          <Link href="/app" onClick={onClose} className="flex items-center gap-2.5"><LogoMark size={34} /><span className="leading-tight"><span className="block text-[19px] font-bold tracking-[-0.03em] text-ink">Treidify<sup className="ml-0.5 text-[9px] font-semibold">™</sup></span><span className="block text-[11.5px] text-ink-3">Your Trading Intelligence</span></span></Link>
          <button onClick={onClose} aria-label="Close menu" className="hdr-btn press"><X className="h-[18px] w-[18px]" /></button>
        </div>
        <button onClick={() => { onClose(); onSearch(); }} className="hdr-pill mb-3 w-full gap-2.5 px-4 text-[14px] text-ink-3"><Search className="h-[18px] w-[18px] text-ink-2" />Search pairs, news, macro…</button>
        <nav aria-label="All sections" className="grid gap-0.5">
          {primaryNav.map((n) => <SideLink key={n.href} item={n} path={path} search={search} onClick={onClose} account={account} />)}
          <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">More</p>
          {toolNav.map((n) => <SideLink key={n.href} item={n} path={path} search={search} onClick={onClose} sub />)}
        </nav>
        <div className="mt-4 border-t border-line pt-4"><ThemeSwitch /></div>
      </div>
    </div>
  );
}

/** Phone top bar: menu, logo, notifications and avatar. Turns to frosted glass once content scrolls under it. */
function MobileTopBar({ user, plan, unread, onMenu }: { user: ShellUser; plan: ShellPlan; unread: number; onMenu: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setScrolled(window.scrollY > 4)); };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); };
  }, []);
  return (
    <header className="m-topbar lg:hidden" data-scrolled={scrolled}>
      <div className="relative flex h-[56px] items-center gap-1 px-2.5">
        <button onClick={onMenu} aria-label="Open menu" className="hdr-btn hdr-btn-plain press"><Menu className="h-[22px] w-[22px]" /></button>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><Link href="/app" className="press flex items-center gap-2 text-[19px] font-bold tracking-[-0.035em] text-ink">
          <LogoMark size={30} priority />Treidify<sup className="-ml-1.5 text-[9px] font-semibold">™</sup>
        </Link></div>
        <div className="ml-auto flex items-center gap-1.5">
          <NotificationBell unread={unread} plain />
          <UserMenu user={user} plan={plan} size={36} />
        </div>
      </div>
    </header>
  );
}

function NotificationBell({ unread, plain }: { unread: number; plain?: boolean }) {
  return (
    <Link href="/app/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className={cn("hdr-btn press relative", plain && "hdr-btn-plain")}>
      <Bell className="h-[20px] w-[20px]" />
      {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-down ring-2 ring-[var(--surface-strong)]" aria-hidden />}
    </Link>
  );
}

/** Phone bottom navigation (reference 1): Dashboard, Markets, Analysis, Calendar, Community. */
function BottomNav({ path, search }: { path: string; search: string }) {
  return (
    <nav aria-label="Main" className="m-nav">
      <div className="m-nav-inner">
        <SlidingPill watch={path + search} />
        {mobileTabBar.map((t) => {
          const active = isActive(path, t.href, search);
          const Icon = t.line;
          return (
            <Link key={t.href} href={t.href} data-active={active} aria-current={active ? "page" : undefined} onClick={() => playSound("nav")}>
              <Icon aria-hidden strokeWidth={active ? 2.2 : 1.8} />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function PremiumCard({ plan }: { plan: ShellPlan }) {
  const premium = plan.plan === "premium";
  const trialLeft = plan.source === "trial" && plan.trialEndsAt ? Math.max(0, Math.round((Date.parse(plan.trialEndsAt) - Date.now()) / 3_600_000)) : null;
  return (
    <div className="side-premium">
      <div className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] text-ink"><Crown className="h-5 w-5 text-[#f5b301]" fill="currentColor" strokeWidth={1.5} />Treidify Premium</div>
      <p className="mt-1.5 text-[13px] leading-snug text-ink-2">{premium ? (trialLeft !== null ? `Trial active, ${trialLeft} hours left. It ends on its own.` : "Active. Thank you for supporting Treidify.") : "Unlock advanced analysis, AI insights and more."}</p>
      <Link href="/app/settings/plan" className="press mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-[#1b1530] text-[14px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(27,21,48,0.8)] hover:brightness-125 dark:bg-white dark:text-[#1b1530]">
        {premium ? "Manage plan" : "Upgrade Now"}<ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function ShellInner({ user, plan, account, greeting, unread, children }: { user: ShellUser; plan: ShellPlan; account: ShellAccount | null; timezone: string; greeting: string; unread: number; children: React.ReactNode }) {
  const path = usePathname();
  const params = useSearchParams();
  const search = params.toString();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const now = useNow();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setMenu(false), [path, search]);
  const closeMenu = useCallback(() => setMenu(false), []);
  const [more, setMore] = useState(false);
  useEffect(() => { setMore(localStorage.getItem("treidify.side-more") === "open" || toolNav.some((n) => isActive(path, n.href, search))); }, [path, search]);
  const first = user.name.split(" ")[0] ?? "";
  const dashboard = path === "/app";
  const showPeriod = path === "/app/performance" || path === "/app/journal";

  return (
    <div className="min-h-dvh lg:pl-[224px]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-white">Skip to content</a>

      <aside className="side-panel hidden lg:flex" aria-label="Main">
        <Link href="/app" className="flex items-center gap-2.5 px-2 pb-6 pt-1">
          <LogoMark size={38} priority />
          <span className="leading-none">
            <span className="block text-[24px] font-bold tracking-[-0.045em] text-ink">Treidify<sup className="ml-0.5 align-super text-[10px] font-semibold tracking-normal">™</sup></span>
            <span className="mt-1 block text-[11.5px] font-medium text-ink-2">Your Trading Intelligence</span>
          </span>
        </Link>
        <nav className="grid gap-1" aria-label="Sections">
          {primaryNav.map((n) => <SideLink key={n.href} item={n} path={path} search={search} account={account} />)}
          <button onClick={() => setMore((m) => { localStorage.setItem("treidify.side-more", m ? "closed" : "open"); return !m; })} aria-expanded={more} className="side-sub mt-1 w-full">
            <ChevronDown className={cn("transition-transform duration-200", !more && "-rotate-90")} />More tools
          </button>
          {more && toolNav.map((n) => <SideLink key={n.href} item={n} path={path} search={search} sub />)}
        </nav>
        <div className="mt-auto grid gap-3 pt-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- static decorative brand illustration */}
          <img src="/brand/bull.webp" alt="" aria-hidden width={411} height={320} className="side-bull" decoding="async" draggable={false} />
          <PremiumCard plan={plan} />
        </div>
      </aside>

      <MobileTopBar user={user} plan={plan} unread={unread} onMenu={() => setMenu(true)} />

      <header className="relative z-30 hidden px-6 pt-5 lg:block">
        <div className="mx-auto flex max-w-[1760px] items-center gap-4">
          <div className="min-w-0 flex-1">
            {dashboard ? (
              <>
                <h1 className="truncate text-[26px] font-semibold leading-[32px] tracking-[-0.025em] text-ink">{greeting}, {first}</h1>
                <p className="mt-1 truncate text-[15px] text-ink-2" suppressHydrationWarning>{now ? marketLine(now) : " "}</p>
              </>
            ) : null}
          </div>
          <span className="xl:hidden"><button onClick={() => setSearchOpen(true)} aria-label="Search pairs, news, macro" className="hdr-btn press"><Search className="h-[19px] w-[19px]" /></button></span>
          <span className="hidden xl:block"><button onClick={() => setSearchOpen(true)} className="hdr-pill press w-[min(340px,26vw)] gap-2.5 px-4 text-[14px] text-ink-3 hover:text-ink-2">
            <Search className="h-[19px] w-[19px] text-ink-2" />
            <span className="flex-1 truncate text-left">Search pairs, news, macro…</span>
            <kbd className="hidden rounded-md bg-[var(--surface-inset)] px-1.5 py-0.5 text-[11px] font-medium text-ink-3 xl:inline">⌘K</kbd>
          </button></span>
          {showPeriod && <DateSelector />}
          <ThemeToggle />
          <NotificationBell unread={unread} />
          <UserMenu user={user} plan={plan} size={44} chevron />
        </div>
      </header>

      <main id="main" className="m-main mx-auto w-full max-w-[1760px] px-3.5 pt-2 sm:px-5 lg:px-6 lg:pb-10 lg:pt-4">
        {children}
      </main>

      <BottomNav path={path} search={search} />
      <MenuSheet open={menu} onClose={closeMenu} path={path} search={search} onSearch={() => setSearchOpen(true)} account={account} />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toaster />
    </div>
  );
}

export function AppShell(props: { user: ShellUser; plan: ShellPlan; account: ShellAccount | null; timezone: string; greeting: string; unread: number; children: React.ReactNode }) {
  // useSearchParams needs a Suspense boundary for static rendering; the shell itself renders immediately.
  return <Suspense fallback={null}><ShellInner {...props} /></Suspense>;
}

/** Sidebar and menu entry: one Lucide icon, label, optional badge, and the MT5 connection dot. */
function SideLink({ item, path, search, collapsed, sub, onClick, account }: { item: NavItem; path: string; search: string; collapsed?: boolean; sub?: boolean; onClick?: () => void; account?: ShellAccount | null }) {
  const active = isActive(path, item.href, search);
  const Icon = item.line;
  const mt5 = item.href === "/app/accounts" && account !== undefined;
  return (
    <Link href={item.href} title={collapsed ? item.label : undefined} data-active={active} aria-current={active ? "page" : undefined} onClick={() => { playSound("nav"); onClick?.(); }} className={sub ? "side-sub" : "side-link"}>
      <Icon aria-hidden strokeWidth={active ? 2.1 : 1.8} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge && <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">{item.badge}</span>}
      {mt5 && <span title={account ? (account.sample ? "Sample account" : account.status === "connected" ? "Connected" : "Connecting") : "Not connected"} className={cn("h-2.5 w-2.5 rounded-full", account?.status === "connected" && !account.sample ? "bg-up shadow-[0_0_8px_var(--up)]" : account?.sample ? "bg-warn" : "bg-[var(--border-strong)]")}><span className="sr-only">{account ? (account.sample ? "Sample account" : account.status === "connected" ? "Connected" : "Connecting") : "Not connected"}</span></span>}
    </Link>
  );
}
