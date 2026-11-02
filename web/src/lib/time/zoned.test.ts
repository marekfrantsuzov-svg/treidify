import { describe, expect, it } from "vitest";
import { dayIn, zonedToUtc } from "./zoned";

describe("zonedToUtc", () => {
  it("converts 08:30 New York in summer (EDT, UTC-4)", () => {
    expect(zonedToUtc("2026-07-15", "08:30", "America/New_York").toISOString()).toBe("2026-07-15T12:30:00.000Z");
  });
  it("converts 08:30 New York in winter (EST, UTC-5)", () => {
    expect(zonedToUtc("2026-12-10", "08:30", "America/New_York").toISOString()).toBe("2026-12-10T13:30:00.000Z");
  });
  it("handles the week when Europe has left DST but the US has not (2026-10-26..10-31)", () => {
    const t = zonedToUtc("2026-10-28", "14:00", "America/New_York");
    expect(t.toISOString()).toBe("2026-10-28T18:00:00.000Z");
    // Tallinn is already on EET (UTC+2) that week: 20:00 local.
    expect(t.toLocaleTimeString("en-GB", { timeZone: "Europe/Tallinn", hour: "2-digit", minute: "2-digit" })).toBe("20:00");
  });
  it("shows a Tallinn summer-time release one hour later than UTC+2 would", () => {
    const t = zonedToUtc("2026-06-10", "08:30", "America/New_York");
    expect(t.toLocaleTimeString("en-GB", { timeZone: "Europe/Tallinn", hour: "2-digit", minute: "2-digit" })).toBe("15:30");
  });
  it("dayIn uses the zone's calendar day", () => {
    expect(dayIn(Date.parse("2026-11-02T23:30:00Z"), "Europe/Tallinn")).toBe("2026-11-03");
  });
});
