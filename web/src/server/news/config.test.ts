import { afterEach, describe, expect, it, vi } from "vitest";
import { newsConfig } from "./config";

describe("news config", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("FINNHUB_API_KEY alone means Finnhub", () => {
    vi.stubEnv("NEWS_PROVIDER", ""); vi.stubEnv("NEWS_API_KEY", ""); vi.stubEnv("FINNHUB_API_KEY", "k1");
    expect(newsConfig()).toEqual({ provider: "finnhub", key: "k1" });
  });
  it("NEWS_* wins when set; nothing set means not configured", () => {
    vi.stubEnv("NEWS_PROVIDER", "finnhub"); vi.stubEnv("NEWS_API_KEY", "k2"); vi.stubEnv("FINNHUB_API_KEY", "k1");
    expect(newsConfig()).toEqual({ provider: "finnhub", key: "k2" });
    vi.stubEnv("NEWS_PROVIDER", ""); vi.stubEnv("NEWS_API_KEY", ""); vi.stubEnv("FINNHUB_API_KEY", "");
    expect(newsConfig()).toEqual({ provider: null, key: null });
  });
});
