import { describe, expect, it } from "vitest";
import { hostConfig, hostRedirect, isProtectedPath } from "./hosts";

const cfg = hostConfig({ NEXT_PUBLIC_SITE_URL: "https://treidify.com", NEXT_PUBLIC_APP_URL: "https://app.treidify.com" });

describe("hostRedirect", () => {
  it("does nothing on a single host", () => {
    const one = hostConfig({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });
    expect(hostRedirect(one, "localhost:3000", "/app")).toBeNull();
    const same = hostConfig({ NEXT_PUBLIC_SITE_URL: "https://treidify.com", NEXT_PUBLIC_APP_URL: "https://treidify.com" });
    expect(hostRedirect(same, "treidify.com", "/app")).toBeNull();
  });
  it("sends app paths on the site host to the app host, keeping the query", () => {
    expect(hostRedirect(cfg, "treidify.com", "/app/journal", "?period=7D")).toBe("https://app.treidify.com/app/journal?period=7D");
    expect(hostRedirect(cfg, "treidify.com", "/login", "?next=%2Fapp")).toBe("https://app.treidify.com/login?next=%2Fapp");
  });
  it("sends marketing paths on the app host back to the site", () => {
    expect(hostRedirect(cfg, "app.treidify.com", "/pricing")).toBe("https://treidify.com/pricing");
    expect(hostRedirect(cfg, "app.treidify.com", "/")).toBe("https://app.treidify.com/app");
    expect(hostRedirect(cfg, "app.treidify.com", "/app/settings")).toBeNull();
  });
  it("redirects www to the apex", () => {
    expect(hostRedirect(cfg, "www.treidify.com", "/features")).toBe("https://treidify.com/features");
  });
  it("leaves shared paths alone", () => {
    expect(hostRedirect(cfg, "treidify.com", "/api/auth/session")).toBeNull();
    expect(hostRedirect(cfg, "app.treidify.com", "/_next/static/x.js")).toBeNull();
    expect(hostRedirect(cfg, "app.treidify.com", "/robots.txt")).toBeNull();
  });
  it("does not treat lookalike paths as app paths", () => {
    expect(hostRedirect(cfg, "treidify.com", "/application-notes")).toBeNull();
    expect(isProtectedPath("/appendix")).toBe(false);
    expect(isProtectedPath("/app")).toBe(true);
  });
});
