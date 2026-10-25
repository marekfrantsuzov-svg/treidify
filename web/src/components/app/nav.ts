import type { GlassIconName } from "@/components/icons/glass-icon";

export interface NavItem { href: string; label: string; short: string; icon: GlassIconName }

export const appNav: NavItem[] = [
  { href: "/app", label: "Dashboard", short: "Home", icon: "dashboard" },
  { href: "/app/macro", label: "Macro Desk", short: "Macro", icon: "macro" },
  { href: "/app/markets", label: "Markets", short: "Markets", icon: "markets" },
  { href: "/app/news", label: "Global News", short: "News", icon: "news" },
  { href: "/app/ai-analysis", label: "AI Chart Analysis", short: "AI", icon: "ai" },
  { href: "/app/journal", label: "Trading Journal", short: "Journal", icon: "journal" },
  { href: "/app/performance", label: "Performance", short: "Stats", icon: "yield" },
  { href: "/app/coach", label: "AI Coach", short: "Coach", icon: "coach" },
  { href: "/app/community", label: "Community", short: "Community", icon: "community" },
  { href: "/app/calendar", label: "Economic Calendar", short: "Calendar", icon: "calendar" },
  { href: "/app/accounts", label: "Accounts", short: "Accounts", icon: "link" },
  { href: "/app/settings", label: "Settings", short: "Settings", icon: "settings" },
];

/** The four destinations on the mobile tab bar; everything else lives under More. */
export const mobileTabs = ["/app", "/app/markets", "/app/ai-analysis", "/app/community"];

export const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path === href || path.startsWith(`${href}/`));
