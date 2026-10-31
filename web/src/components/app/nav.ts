import { BookOpen, CalendarDays, Globe2, House, Link2, Newspaper, Settings, Sparkles, TrendingUp, UsersRound, WandSparkles, ChartSpline, type LucideIcon } from "lucide-react";
import type { GlassIconName } from "@/components/icons/glass-icon";

export interface NavItem { href: string; label: string; short: string; icon: GlassIconName; line: LucideIcon }

/** The nine sections of the approved design, in its order. */
export const primaryNav: NavItem[] = [
  { href: "/app", label: "Dashboard", short: "Home", icon: "dashboard", line: House },
  { href: "/app/macro", label: "Macro Desk", short: "Macro", icon: "macro", line: Globe2 },
  { href: "/app/markets", label: "Markets", short: "Markets", icon: "markets", line: ChartSpline },
  { href: "/app/news", label: "News", short: "News", icon: "news", line: Newspaper },
  { href: "/app/ai-analysis", label: "AI Analysis", short: "AI", icon: "ai", line: WandSparkles },
  { href: "/app/journal", label: "Journal", short: "Journal", icon: "journal", line: BookOpen },
  { href: "/app/community", label: "Community", short: "Community", icon: "community", line: UsersRound },
  { href: "/app/calendar", label: "Calendar", short: "Calendar", icon: "calendar", line: CalendarDays },
  { href: "/app/settings", label: "Settings", short: "Settings", icon: "settings", line: Settings },
];

/** Further modules, listed under the main sections. */
export const toolNav: NavItem[] = [
  { href: "/app/performance", label: "Performance", short: "Stats", icon: "yield", line: TrendingUp },
  { href: "/app/coach", label: "AI Coach", short: "Coach", icon: "coach", line: Sparkles },
  { href: "/app/accounts", label: "Accounts", short: "Accounts", icon: "link", line: Link2 },
];

export const appNav: NavItem[] = [...primaryNav, ...toolNav];

/** The four destinations on the mobile tab bar; everything else lives under More. */
export const mobileTabs = ["/app", "/app/markets", "/app/ai-analysis", "/app/community"];

export const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path === href || path.startsWith(`${href}/`));
