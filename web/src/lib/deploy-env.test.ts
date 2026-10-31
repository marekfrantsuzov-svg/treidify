import { describe, expect, it } from "vitest";
import { checkProductionEnv } from "./deploy-env";

const key = Buffer.alloc(32, 7).toString("base64");
const good = {
  DATABASE_URL: "postgres://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  BETTER_AUTH_SECRET: "x".repeat(44),
  BETTER_AUTH_URL: "https://app.example.com",
  NEXT_PUBLIC_SITE_URL: "https://example.com",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  AUTH_COOKIE_DOMAIN: "example.com",
  DATA_ENCRYPTION_KEY: key,
  RESEND_API_KEY: "re_test",
};

describe("checkProductionEnv", () => {
  it("accepts a complete two-host setup", () => {
    expect(checkProductionEnv(good)).toEqual({ errors: [], warnings: [] });
  });

  it("accepts a single-host setup without a cookie domain", () => {
    const { errors } = checkProductionEnv({ ...good, NEXT_PUBLIC_APP_URL: "", AUTH_COOKIE_DOMAIN: "", BETTER_AUTH_URL: "https://example.com" });
    expect(errors).toEqual([]);
  });

  it("lists every missing required variable", () => {
    const { errors } = checkProductionEnv({});
    for (const name of ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "NEXT_PUBLIC_SITE_URL", "DATA_ENCRYPTION_KEY"])
      expect(errors.some((e) => e.startsWith(name))).toBe(true);
  });

  it("rejects http URLs, a short secret and a bad encryption key", () => {
    const { errors } = checkProductionEnv({ ...good, NEXT_PUBLIC_SITE_URL: "http://example.com", BETTER_AUTH_SECRET: "short", DATA_ENCRYPTION_KEY: "abc" });
    expect(errors.join("\n")).toMatch(/NEXT_PUBLIC_SITE_URL must be a full https/);
    expect(errors.join("\n")).toMatch(/at least 32 characters/);
    expect(errors.join("\n")).toMatch(/32 bytes/);
  });

  it("requires a matching cookie domain and the auth URL on the app host for two hosts", () => {
    expect(checkProductionEnv({ ...good, AUTH_COOKIE_DOMAIN: "" }).errors.join()).toMatch(/AUTH_COOKIE_DOMAIN must be set/);
    expect(checkProductionEnv({ ...good, AUTH_COOKIE_DOMAIN: "other.com" }).errors.join()).toMatch(/parent domain/);
    expect(checkProductionEnv({ ...good, BETTER_AUTH_URL: "https://example.com" }).errors.join()).toMatch(/app host/);
    expect(checkProductionEnv({ ...good, AUTH_COOKIE_DOMAIN: ".example.com" }).errors).toEqual([]);
  });

  it("blocks secrets exposed through NEXT_PUBLIC_ and the dev outbox", () => {
    const { errors } = checkProductionEnv({ ...good, NEXT_PUBLIC_STRIPE_SECRET_KEY: "sk_live", NEXT_PUBLIC_ANTHROPIC_API_KEY: "x", DEV_OUTBOX: "1" });
    expect(errors.filter((e) => e.includes("looks like a secret"))).toHaveLength(2);
    expect(errors.join()).toMatch(/DEV_OUTBOX/);
    // Public, non-secret names are fine.
    expect(checkProductionEnv({ ...good, NEXT_PUBLIC_ANALYTICS_DOMAIN: "example.com", NEXT_PUBLIC_PRICES_FINAL: "false" }).errors).toEqual([]);
  });

  it("warns, without failing, when email is not configured", () => {
    const r = checkProductionEnv({ ...good, RESEND_API_KEY: "" });
    expect(r.errors).toEqual([]);
    expect(r.warnings.join()).toMatch(/RESEND_API_KEY/);
  });
});
