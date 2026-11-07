"use client";

import { saveThemePreference } from "@/server/actions/settings";

export type ThemeChoice = "dark" | "light" | "system";

/**
 * Switches theme with a soft crossfade where the View Transitions API exists (instant otherwise, and with reduced
 * motion), then stores the explicit choice on the account so it follows the person to other devices. The attribute is
 * set synchronously inside the transition callback so the browser captures the new state, and next-themes persists it
 * to localStorage for this browser.
 */
export function switchTheme(setTheme: (t: string) => void, t: ThemeChoice, opts: { sync?: boolean } = {}) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const apply = () => {
    const resolved = t === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : t;
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
    setTheme(t);
  };
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) apply();
  else {
    document.documentElement.classList.add("theme-vt");
    const vt = doc.startViewTransition(apply) as { finished?: Promise<unknown> } | undefined;
    void vt?.finished?.finally(() => document.documentElement.classList.remove("theme-vt"));
  }
  if (opts.sync !== false) void saveThemePreference(t).catch(() => undefined);
}
