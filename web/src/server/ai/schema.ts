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

/** AI explanation of one reported headline. Only the provider's headline and summary are facts; the rest is interpretation. */
export const NewsBriefSchema = z.object({
  whatHappened: z.string().describe("One or two sentences restating ONLY what the headline and summary report. No new facts."),
  whyItMatters: z.string().describe("Why markets may care, as interpretation."),
  instruments: z.array(z.string()).max(6).describe("Instruments plausibly affected, from the candidate list only."),
  bullishCase: z.string().describe("How this could be read bullishly for the most affected instrument, and which instrument."),
  bearishCase: z.string().describe("How this could be read bearishly, and for which instrument."),
  uncertain: z.array(z.string()).max(4).describe("What the report does not say or what is still unknown."),
});
export type NewsBrief = z.infer<typeof NewsBriefSchema>;

/** AI coaching review grounded in computed trade statistics. */
export const CoachReviewSchema = z.object({
  headline: z.string().describe("One sentence summary of the period, using only numbers from the facts."),
  strengths: z.array(z.string()).max(4),
  problems: z.array(z.string()).max(5).describe("Concrete issues backed by the facts (overtrading, size changes after losses, session leaks, cost drag, stops)."),
  actions: z.array(z.string()).max(4).describe("Specific, checkable changes for the next period."),
  learn: z.array(z.string()).max(3).describe("Educational topics that address the problems, named generically."),
  dataGaps: z.array(z.string()).max(3).describe("What the data cannot show (e.g. no stop-loss recorded, too few trades)."),
});
export type CoachReview = z.infer<typeof CoachReviewSchema>;
