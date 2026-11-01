import { BookOpen, ChartCandlestick, Gauge, Globe2, House, Link2, Newspaper, Settings, Sparkles, HeartPulse, UsersRound, WandSparkles, type LucideIcon } from "lucide-react";
import type { GlassIconName } from "@/components/icons/glass-icon";

export interface NavItem { href: string; label: string; short: string; icon: GlassIconName; line: LucideIcon }

/** The nine product sections, in the order of the master brief. */
export const primaryNav: NavItem[] = [
  { href: "/app", label: "Dashboard", short: "Home", icon: "dashboard", line: House },
  { href: "/app/intelligence", label: "Market Intelligence", short: "Intel", icon: "spark", line: Gauge },
  { href: "/app/macro", label: "Macro Desk", short: "Macro", icon: "macro", line: Globe2 },
  { href: "/app/markets", label: "Markets", short: "Markets", icon: "markets", line: ChartCandlestick },
  { href: "/app/performance", label: "Account Health", short: "Health", icon: "yield", line: HeartPulse },
  { href: "/app/ai-analysis", label: "AI Chart Analysis", short: "AI", icon: "ai", line: WandSparkles },
  { href: "/app/news", label: "News & Calendar", short: "News", icon: "news", line: Newspaper },
  { href: "/app/community", label: "Community", short: "Community", icon: "community", line: UsersRound },
  { href: "/app/settings", label: "Settings", short: "Settings", icon: "settings", line: Settings },
];

/** Further tools, listed under the main sections. */
export const toolNav: NavItem[] = [
  { href: "/app/journal", label: "Journal", short: "Journal", icon: "journal", line: BookOpen },
  { href: "/app/coach", label: "AI Coach", short: "Coach", icon: "coach", line: Sparkles },
  { href: "/app/accounts", label: "Trading Accounts", short: "Accounts", icon: "link", line: Link2 },
];

export const appNav: NavItem[] = [...primaryNav, ...toolNav];

/** The mobile tab bar: Home, Markets, AI, Community, then More. The AI tab sits in the centre. */
export type TabIconName = "home" | "markets" | "ai" | "community";
export const mobileTabBar: { href: string; label: string; icon: TabIconName }[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/markets", label: "Markets", icon: "markets" },
  { href: "/app/ai-analysis", label: "AI", icon: "ai" },
  { href: "/app/community", label: "Community", icon: "community" },
];
export const mobileTabs = mobileTabBar.map((t) => t.href);

/** Quick-access tools on the mobile Home screen, in the order traders reach for them. */
export const quickTools: { href: string; label: string; icon: GlassIconName }[] = [
  { href: "/app/intelligence", label: "Intel", icon: "spark" },
  { href: "/app/macro", label: "Macro", icon: "macro" },
  { href: "/app/performance", label: "Health", icon: "yield" },
  { href: "/app/news", label: "News", icon: "news" },
  { href: "/app/news?tab=calendar", label: "Calendar", icon: "calendar" },
  { href: "/app/journal", label: "Journal", icon: "journal" },
  { href: "/app/coach", label: "Coach", icon: "coach" },
  { href: "/app/accounts", label: "Accounts", icon: "link" },
];

export const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path === href || path.startsWith(`${href}/`));
