import { describe, expect, it } from "vitest";
import { compute, expectedPeriod, fmtLine, fomcOutcome, gdpEstimate, lineAt, lineFromCurrent, quarterEnd, US_RELEASES } from "./calc";
import { parseFredCsv, type VObs } from "./fred";

const line = (key: string) => US_RELEASES.flatMap((r) => r.lines).find((l) => l.key === key)!;
const v = (date: string, value: number, rs: string, re = "9999-12-31"): VObs => ({ date, value, realtimeStart: rs, realtimeEnd: re });

describe("FRED CSV", () => {
  it("parses both header styles and missing values", () => {
    expect(parseFredCsv("observation_date,CPIAUCNS\n2026-08-01,320.1\n2026-09-01,.\n")).toEqual([{ date: "2026-08-01", value: 320.1 }, { date: "2026-09-01", value: null }]);
    expect(parseFredCsv("DATE,UNRATE\r\n2026-09-01,4.3")).toEqual([{ date: "2026-09-01", value: 4.3 }]);
  });
});

describe("compute", () => {
  const m = new Map<string, number | null>([["2025-09-01", 300], ["2026-08-01", 308], ["2026-09-01", 309]]);
  it("year over year uses the same month a year earlier", () => { expect(compute(m, "2026-09-01", "pct_yoy")!.toFixed(1)).toBe("3.0"); });
  it("month over month uses the previous observation", () => { expect(compute(m, "2026-09-01", "pct_mom")!.toFixed(2)).toBe("0.32"); });
  it("formats changes with a sign and units", () => {
    expect(fmtLine(151, { digits: 0, unit: "K", t: "change" })).toBe("+151K");
    expect(fmtLine(218_000, { digits: 0, unit: "K", t: "level", scale: 1 / 1000 })).toBe("218K");
  });
});

describe("lineAt (vintages)", () => {
  const rows: VObs[] = [
    v("2026-07-01", 100, "2026-08-01", "2026-09-04"), v("2026-07-01", 120, "2026-09-05"), // July revised on Sep 5
    v("2026-08-01", 200, "2026-09-05"),                                                       // August first printed Sep 5
  ];
  const nfp = { ...line("nfp"), t: "level" as const, unit: "K" as const, digits: 0 };
  it("reports the new period, the revised previous and what it was first", () => {
    const r = lineAt(rows, nfp, "2026-09-05", "2026-11-02");
    expect(r).toEqual({ period: "2026-08-01", actual: "200K", previous: "120K", revisedFrom: "100K" });
  });
  it("a future release only has the latest published value as previous", () => {
    expect(lineAt(rows, nfp, "2026-11-06", "2026-11-02")).toEqual({ period: null, actual: null, previous: "200K", revisedFrom: null });
  });
  it("a release day whose data is not in yet has no actual", () => {
    expect(lineAt(rows, nfp, "2026-11-02", "2026-11-02").actual).toBeNull();
  });
});

describe("GDP estimate and FOMC outcome", () => {
  it("counts BEA GDP releases after the quarter ends", () => {
    expect(quarterEnd("2026-07-01")).toBe("2026-09-30");
    const dates = ["2026-08-28", "2026-09-25", "2026-10-29", "2026-11-25", "2026-12-22"];
    expect(gdpEstimate(dates, "2026-07-01", "2026-10-29")).toBe("Advance estimate");
    expect(gdpEstimate(dates, "2026-07-01", "2026-11-25")).toBe("Second estimate");
    expect(gdpEstimate(dates, "2026-07-01", "2026-12-22")).toBe("Third estimate");
  });
  it("describes the decision", () => {
    expect(fomcOutcome(4.0, 3.75)).toBe("Cut 25 bp");
    expect(fomcOutcome(4.0, 4.0)).toBe("Held");
    expect(fomcOutcome(4.0, 4.25)).toBe("Raised 25 bp");
  });
});

describe("keyless release values", () => {
  it("knows which period each release reports", () => {
    expect(expectedPeriod("CPI", "2026-11-10")).toBe("2026-10-01");
    expect(expectedPeriod("JOLTS", "2026-11-03")).toBe("2026-09-01");
    expect(expectedPeriod("GDP", "2026-11-25")).toBe("2026-07-01");
    expect(expectedPeriod("GDP", "2026-10-29")).toBe("2026-07-01");
    expect(expectedPeriod("Jobless claims", "2026-11-05")).toBe("2026-10-31");
    expect(expectedPeriod("Jobless claims", "2026-11-25")).toBe("2026-11-21");
  });
  it("gives actual only once released and previous from the period before", () => {
    const nfp = US_RELEASES.find((r) => r.id === "nfp")!.lines[0]!;
    const m = new Map<string, number | null>([["2026-08-01", 1000], ["2026-09-01", 1150], ["2026-10-01", 1300]]);
    expect(lineFromCurrent(m, nfp, "NFP", "2026-11-06", true)).toEqual({ period: "2026-10-01", actual: "+150K", previous: "+150K", revisedFrom: null });
    const up = lineFromCurrent(new Map([["2026-08-01", 1000], ["2026-09-01", 1150]]), nfp, "NFP", "2026-11-06", false);
    expect(up).toEqual({ period: "2026-10-01", actual: null, previous: "+150K", revisedFrom: null });
    // Released but not in the data yet: no actual.
    expect(lineFromCurrent(new Map([["2026-08-01", 1000], ["2026-09-01", 1150]]), nfp, "NFP", "2026-11-06", true).actual).toBeNull();
  });
});
