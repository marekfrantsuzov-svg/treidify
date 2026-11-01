"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect } from "react";

/** Keeps the browser chrome (iOS status bar area, Android address bar) the same colour as the app's chosen theme. */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (!resolvedTheme) return;
    const c = resolvedTheme === "dark" ? "#08070d" : "#f0f0f0";
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", c));
  }, [resolvedTheme]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem disableTransitionOnChange>
      <ThemeColorSync />
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
