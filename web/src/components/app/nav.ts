import { BookOpen, CalendarDays, ChartLine, ChartNoAxesColumn, Globe2, HeartPulse, House, Link2, Newspaper, Settings, Sparkles, UsersRound, WandSparkles, type LucideIcon } from "lucide-react";
import type { GlassIconName } from "@/components/icons/glass-icon";

export interface NavItem { href: string; label: string; short: string; icon: GlassIconName; line: LucideIcon; badge?: string }

/** The approved sidebar (reference 1), in order. */
export const primaryNav: NavItem[] = [
  { href: "/app", label: "Dashboard", short: "Dashboard", icon: "dashboard", line: House },
  { href: "/app/markets", label: "Markets", short: "Markets", icon: "markets", line: ChartNoAxesColumn },
  { href: "/app/intelligence", label: "Analysis", short: "Analysis", icon: "spark", line: ChartLine },
  { href: "/app/macro", label: "Macro Desk", short: "Macro", icon: "macro", line: Globe2, badge: "New" },
  { href: "/app/news?tab=calendar", label: "Economic Calendar", short: "Calendar", icon: "calendar", line: CalendarDays },
  { href: "/app/accounts", label: "Account (MT5)", short: "MT5", icon: "link", line: Link2 },
  { href: "/app/coach", label: "AI Coach", short: "Coach", icon: "coach", line: Sparkles },
  { href: "/app/community", label: "Community", short: "Community", icon: "community", line: UsersRound },
];

/** Everything else stays one tap away, under the main list. */
export const toolNav: NavItem[] = [
  { href: "/app/news", label: "Market News", short: "News", icon: "news", line: Newspaper },
  { href: "/app/performance", label: "Account Health", short: "Health", icon: "yield", line: HeartPulse },
  { href: "/app/ai-analysis", label: "AI Chart Analysis", short: "AI Chart", icon: "ai", line: WandSparkles },
  { href: "/app/journal", label: "Journal", short: "Journal", icon: "journal", line: BookOpen },
  { href: "/app/settings", label: "Settings", short: "Settings", icon: "settings", line: Settings },
];

export const appNav: NavItem[] = [...primaryNav, ...toolNav];

/** Mobile bottom navigation (reference 1): Dashboard, Markets, Analysis, Calendar, Community. */
export const mobileTabBar: { href: string; label: string; line: LucideIcon }[] = [
  { href: "/app", label: "Dashboard", line: House },
  { href: "/app/markets", label: "Markets", line: ChartNoAxesColumn },
  { href: "/app/intelligence", label: "Analysis", line: ChartLine },
  { href: "/app/news?tab=calendar", label: "Calendar", line: CalendarDays },
  { href: "/app/community", label: "Community", line: UsersRound },
];
export const mobileTabs = mobileTabBar.map((t) => t.href);

/** Kept for the marketing preview and any page that still lists the tools. */
export const quickTools: { href: string; label: string; icon: GlassIconName }[] = [
  { href: "/app/intelligence", label: "Analysis", icon: "spark" },
  { href: "/app/macro", label: "Macro", icon: "macro" },
  { href: "/app/performance", label: "Health", icon: "yield" },
  { href: "/app/news", label: "News", icon: "news" },
  { href: "/app/news?tab=calendar", label: "Calendar", icon: "calendar" },
  { href: "/app/journal", label: "Journal", icon: "journal" },
  { href: "/app/coach", label: "Coach", icon: "coach" },
  { href: "/app/accounts", label: "Accounts", icon: "link" },
];

/** Active state for a nav href. Hrefs with a query (the calendar tab) match only when that query is present. */
export function isActive(path: string, href: string, search = ""): boolean {
  const [base, q] = href.split("?");
  if (q) return path === base && new URLSearchParams(search).toString().includes(q);
  if (base === "/app") return path === "/app";
  if (base === "/app/news" && new URLSearchParams(search).get("tab") === "calendar") return false;
  return path === base || path.startsWith(`${base}/`);
}

