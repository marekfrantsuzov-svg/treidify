import type { Metadata } from "next";
import { Activity, Coins, Landmark, MessageSquareText, Percent, Scale } from "lucide-react";
import { FeaturePage } from "@/components/marketing/feature-page";
import { MacroPreview } from "@/components/previews/macro-preview";
import { InstrumentCard } from "@/components/previews/zone-explorer";

export const metadata: Metadata = {
  title: "Macro Desk",
  description: "An institutional-style macro desk for independent traders: gold, DXY, silver, US yields and real yields, multi-timeframe bias and an AI you can question.",
  alternates: { canonical: "/macro-desk" },
};

export default function Page() {
  return (
    <FeaturePage
      slug="macro-desk"
      eyebrow="Macro Desk"
      plan="Free and Premium"
      title="The macro picture behind every gold move."
      lead="Gold, the dollar, silver, Treasury yields and real yields in one desk, with multi-timeframe bias, supporting and conflicting evidence, and an AI you can ask why."
      visual={<div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]"><InstrumentCard symbol="XAUUSD" height={320} /><MacroPreview /></div>}
      capabilities={[
        { Icon: Coins, title: "Gold, DXY and silver", body: "Price, change, bias per timeframe and key zones, with silver as a confirmation check on gold." },
        { Icon: Percent, title: "Yields and real yields", body: "US 10-year nominal and real (TIPS) yields, and how gold has been trading against them." },
        { Icon: Scale, title: "Evidence for and against", body: "Every bias lists the facts that support it and the facts that conflict with it, with a timestamp." },
        { Icon: Landmark, title: "Macro regime", body: "A regime summary (risk-on, risk-off, dollar-led, yield-led) built from observable market moves." },
        { Icon: Activity, title: "Events that matter today", body: "High-impact releases and global developments that could change the picture, linked to their analysis." },
        { Icon: MessageSquareText, title: "Ask the Macro Desk", body: "Ask why gold fell while DXY fell, or what would invalidate a scenario. Answers cite current data and admit uncertainty." },
      ]}
      method={{
        title: "Bias you can check",
        lead: "Bias is calculated, not guessed, using the structure-ema-v1 engine shared by the web app and the native apps.",
        steps: [
          { title: "Market structure", body: "Confirmed fractal swings (two bars each side) give the last two highs and lows: higher highs and higher lows, lower highs and lower lows, or mixed." },
          { title: "Trend filter", body: "Bullish needs rising structure and a close above EMA(50) and the last swing low. Bearish mirrors it. Anything else is neutral." },
          { title: "Five timeframes, five jobs", body: "4H sets direction, 1H structure, 15M the setup, 5M confirmation, 1M precision. Conflicts between them are shown, not hidden." },
          { title: "Confidence as evidence, not probability", body: "We show counts of supporting and conflicting evidence. Confidence is not presented as a calibrated probability until it has been validated against history." },
        ],
      }}
      limits={[
        "Present bias as a prediction or a guarantee.",
        "Show a price without its source and timestamp, or show stale prices as current.",
        "Let AI invent prices, yields or events. AI explains data from licensed providers.",
        "Use the DXY name for a substitute index. If the licensed index is unavailable, a clearly renamed USD basket is shown instead.",
      ]}
      faqs={[
        { q: "Where does the market data come from?", a: "From licensed market-data providers, shown with source attribution and a timestamp. US Treasury and FRED data are used for daily yields. When a feed is delayed or down, the card says so." },
        { q: "Is the Macro Desk free?", a: "Gold and DXY with multi-timeframe bias are free. The full desk, regime analysis and unlimited Ask the Macro Desk are Premium." },
        { q: "Can I see why the bias changed?", a: "Yes. Each bias shows the swing highs and lows, EMA value and close that produced it, and the level that would invalidate it." },
      ]}
    />
  );
}
