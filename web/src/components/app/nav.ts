import { BookOpen, Home, LineChart, Settings, Users } from "lucide-react";

export const appNav = [
  { href: "/app", label: "Dashboard", short: "Home", Icon: Home },
  { href: "/app/markets", label: "Markets", short: "Markets", Icon: LineChart },
  { href: "/app/journal", label: "Journal", short: "Journal", Icon: BookOpen },
  { href: "/app/community", label: "Community", short: "Community", Icon: Users },
  { href: "/app/settings", label: "Settings", short: "Settings", Icon: Settings },
] as const;

export const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path === href || path.startsWith(`${href}/`));
