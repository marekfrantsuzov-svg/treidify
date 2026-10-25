import { afterEach, describe, expect, it, vi } from "vitest";
import { aiProvider, integrationReport, NotConfiguredError, syncProvider } from "./index";

afterEach(() => vi.unstubAllEnvs());

describe("integration registry", () => {
  it("reports every service as not configured and not verified by default", () => {
    vi.stubEnv("METAAPI_TOKEN", ""); vi.stubEnv("ANTHROPIC_API_KEY", "");
    const r = integrationReport();
    expect(r.map((x) => x.service)).toEqual(["sync", "marketData", "news", "ai", "billing"]);
    expect(r.every((x) => !x.verified)).toBe(true);
    expect(r.find((x) => x.service === "sync")!.needs).toContain("METAAPI_TOKEN");
  });
  it("throws a clear NotConfiguredError instead of returning fake data", async () => {
    vi.stubEnv("METAAPI_TOKEN", "");
    await expect(syncProvider().connect({ platform: "mt5", server: "x", login: "1", investorPassword: "p" })).rejects.toBeInstanceOf(NotConfiguredError);
    await expect(aiProvider().coachReview({ period: "daily", metrics: {}, observations: [], notes: [] })).rejects.toThrow(/AI analysis is not connected/);
  });
  it("marks a service configured, still unverified, once its keys exist", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "set");
    const ai = aiProvider().info();
    expect(ai.configured).toBe(true);
    expect(ai.verified).toBe(false);
  });
});
