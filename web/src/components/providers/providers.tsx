"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider, useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Keeps the browser chrome (iOS status bar area, Android address bar) the same colour as the app's chosen theme. */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (!resolvedTheme) return;
    const c = resolvedTheme === "dark" ? "#07060c" : "#f3f2f7";
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", c));
  }, [resolvedTheme]);
  return null;
}

/**
 * Marks the document once the first client-side navigation happens. Page entrance fades (.page-in, the app template)
 * only play from then on: the first page of a visit paints its content at once, so the largest paint is never held
 * behind an animation that waits for scripts to load.
 */
function NavMark() {
  const path = usePathname();
  const first = useRef(path);
  useEffect(() => { if (path !== first.current) document.documentElement.dataset.nav = "1"; }, [path]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <ThemeColorSync />
      <NavMark />
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
