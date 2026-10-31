import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { hostConfig, hostRedirect, isProtectedPath } from "@/lib/hosts";

const hosts = hostConfig();

/**
 * 1. Two-host routing between treidify.com (site) and app.treidify.com (platform), when both are configured.
 * 2. Optimistic gate: visitors without a session cookie go straight to sign-in.
 *    Every protected page and action still verifies the session on the server.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const moved = hostRedirect(hosts, host, pathname, search);
  if (moved) return NextResponse.redirect(moved, 308);

  if (!isProtectedPath(pathname) || getSessionCookie(req)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

// Everything except static assets, so host routing sees page requests.
export const config = { matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|woff2?)$).*)"] };
