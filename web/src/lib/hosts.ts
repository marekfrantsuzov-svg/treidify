/**
 * Two-host routing: the public site (treidify.com) and the private app (app.treidify.com) are served by
 * one deployment. When NEXT_PUBLIC_APP_URL is unset, or equals the site URL, everything stays on one host.
 */

/** Paths that belong to the app host: the platform, onboarding, admin and the sign-in flow. */
const APP_PREFIXES = ["/app", "/onboarding", "/admin", "/login", "/signup", "/forgot-password", "/reset-password", "/goodbye"];
/** Paths every host may serve directly. */
const SHARED_PREFIXES = ["/api", "/_next", "/dev", "/favicon", "/icon", "/apple-icon", "/opengraph-image", "/twitter-image", "/robots.txt", "/sitemap.xml"];

const starts = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`) || (p.includes(".") && path === p));

const hostOf = (url: string | undefined) => {
  if (!url) return null;
  try { return new URL(url).host; } catch { return null; }
};

export interface HostConfig { site: string | null; app: string | null; siteUrl?: string; appUrl?: string }

export function hostConfig(env: Record<string, string | undefined> = process.env): HostConfig {
  const site = hostOf(env.NEXT_PUBLIC_SITE_URL);
  const app = hostOf(env.NEXT_PUBLIC_APP_URL);
  return { site, app: app && app !== site ? app : null, siteUrl: env.NEXT_PUBLIC_SITE_URL, appUrl: env.NEXT_PUBLIC_APP_URL };
}

/** Where a request should be redirected, or null to serve it here. Returns an absolute URL string. */
export function hostRedirect(cfg: HostConfig, host: string, pathname: string, search = ""): string | null {
  if (!cfg.app || !cfg.site || !cfg.siteUrl || !cfg.appUrl) return null;
  if (starts(pathname, SHARED_PREFIXES)) return null;
  const to = (base: string, path: string) => new URL(path + search, base).toString();
  if (host === `www.${cfg.site}`) return to(cfg.siteUrl, pathname);
  if (host === cfg.app) {
    if (pathname === "/") return to(cfg.appUrl, "/app");
    return starts(pathname, APP_PREFIXES) ? null : to(cfg.siteUrl, pathname);
  }
  if (host === cfg.site && starts(pathname, APP_PREFIXES)) return to(cfg.appUrl, pathname);
  return null;
}

export const isProtectedPath = (path: string) => starts(path, ["/app", "/onboarding", "/admin"]);
