import { describe, expect, it } from "vitest";
import { measuredReaction } from "./reaction";

const bars = Array.from({ length: 8 }, (_, k) => ({ t: 1_800_000_000 + k * 900, o: 4000 + k, h: 4002 + k, l: 3999 + k, c: 4001 + k, v: 0 }));
describe("measuredReaction", () => {
  it("measures open of the release bar to the close 60 minutes later, in gold pips (1 pip = $0.10)", () => {
    const r = measuredReaction(bars, 900, (1_800_000_000 + 900 + 30) * 1000)!;
    expect(r.from).toBe(4001);
    expect(r.to).toBe(4005);
    expect(r.change).toBe(4);
    expect(r.pips).toBeCloseTo(40);
  });
  it("is null when the bars do not cover the hour after", () => {
    expect(measuredReaction(bars, 900, (1_800_000_000 + 7 * 900) * 1000)).toBeNull();
  });
});
