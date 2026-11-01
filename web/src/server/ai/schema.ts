import { z } from "zod";

/** Structured chart reading. Prices are optional and must only be filled when legible on the image. */
export const ChartReadingSchema = z.object({
  legible: z.boolean().describe("False if the image is not a readable price chart."),
  instrument: z.string().nullable().describe("Symbol only if printed on the chart, else null."),
  timeframe: z.string().nullable().describe("Timeframe only if printed on the chart, else null."),
  summary: z.string().describe("Two or three plain sentences: what the chart shows right now."),
  structure: z.object({
    trend: z.enum(["bullish", "bearish", "ranging", "unclear"]),
    evidence: z.array(z.string()).describe("Visible facts: swing highs/lows, breaks, ranges."),
  }),
  levels: z.array(z.object({
    kind: z.enum(["support", "resistance", "liquidity", "fibonacci", "other"]),
    price: z.number().nullable().describe("Only when the price is readable on the axis or a label; null otherwise."),
    description: z.string(),
  })),
  liquidity: z.array(z.string()).describe("Visible equal highs/lows, wicks into prior levels, likely stop clusters."),
  fibonacci: z.string().nullable().describe("Fibonacci context only if a clear swing is visible; else null."),
  scenarios: z.array(z.object({
    bias: z.enum(["bullish", "bearish"]),
    trigger: z.string().describe("What price must do to confirm this scenario."),
    target: z.string().describe("The next visible area of interest, without inventing exact prices."),
    invalidation: z.string(),
  })).max(2),
  uncertainty: z.array(z.string()).describe("What cannot be known from this image."),
});
export type ChartReading = z.infer<typeof ChartReadingSchema>;
