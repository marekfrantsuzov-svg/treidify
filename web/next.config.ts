import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  // The production build type-checks app code only. Tests (which read ../shared fixtures) are checked by `npm run typecheck` in CI,
  // so the build also works when the host builds web/ without the rest of the repository.
  typescript: { tsconfigPath: "tsconfig.build.json" },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
    // Client router cache: going back to a page visited in the last 30 s (dynamic) or 3 min (static/prefetched) is
    // instant, no server round trip. Server actions and router.refresh() still invalidate it.
    staleTimes: { dynamic: 30, static: 180 },
    optimizePackageImports: ["lucide-react", "motion"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
