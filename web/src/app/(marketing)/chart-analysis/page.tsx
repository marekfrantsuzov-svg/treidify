import type { Metadata } from "next";
import { CircleHelp, Crosshair, Eye, ImageUp, Layers, MessagesSquare } from "lucide-react";
import { FeaturePage } from "@/components/marketing/feature-page";
import { ChartAiPreview } from "@/components/previews/chart-ai-preview";

export const metadata: Metadata = {
  title: "AI Chart Analysis",
  description: "Upload a chart screenshot and get its visible market structure, zones, liquidity and scenarios annotated by AI, checked against market data where possible.",
  alternates: { canonical: "/chart-analysis" },
};

export default function Page() {
  return (
    <FeaturePage
      slug="chart-analysis"
      eyebrow="AI Chart Analysis"
      plan="Premium"
      title="Your charts. Explained by AI."
      lead="Upload a screenshot from MetaTrader, TradingView or any platform. Treidify reads what is visible, annotates it, and tells you plainly what a screenshot cannot show."
      visual={<div className="mx-auto max-w-4xl"><ChartAiPreview /></div>}
      capabilities={[
        { Icon: ImageUp, title: "PNG, JPEG and HEIC", body: "Drop a screenshot or take one on your phone. Files are checked, re-encoded and stored privately." },
        { Icon: Eye, title: "What it identifies", body: "Instrument, timeframe, visible structure, key highs and lows, support and resistance, liquidity and breakout-retest areas." },
        { Icon: Layers, title: "Annotated overlays", body: "Your original chart with structure, zone and liquidity layers you can switch on and off." },
        { Icon: Crosshair, title: "Scenarios", body: "Potential bullish and bearish scenarios, the confirmation to wait for and what would invalidate the idea." },
        { Icon: CircleHelp, title: "What is missing", body: "If the price axis is cropped or the timeframe unclear, the analysis says so and asks you rather than guessing." },
        { Icon: MessagesSquare, title: "Follow-up questions", body: "Ask about the chart you uploaded and get answers grounded in that analysis." },
      ]}
      method={{
        title: "A screenshot is not a data feed",
        lead: "Images can hide candles, crop axes and lag the market. The analysis is built to respect those limits.",
        steps: [
          { title: "Read only what is visible", body: "Vision analysis describes structure that appears in the image. It never infers candles that are off-screen." },
          { title: "Validate against market data", body: "When the instrument and timeframe are recognised, levels are checked against licensed market data before exact prices are shown." },
          { title: "Ask when unclear", body: "Ambiguous symbol, timeframe or price scale triggers a question instead of an assumption." },
          { title: "Safe uploads", body: "File type and size are verified, images are re-encoded to strip hidden content and metadata, and text inside images is treated as data, never as instructions." },
        ],
      }}
      limits={[
        "Invent prices, candles or history that the image does not show.",
        "Promise that any scenario will play out or be profitable.",
        "Publish your uploads. They are private unless you share them in the community.",
      ]}
      faqs={[
        { q: "Which platforms' screenshots work?", a: "Any clear candlestick chart: MetaTrader 4 and 5, TradingView, cTrader and broker web platforms. Light and dark themes are both supported." },
        { q: "How accurate are the levels?", a: "Levels drawn only from an image are approximate and labelled so. Where Treidify can match the instrument to market data, exact levels come from that data instead." },
        { q: "Is there a limit?", a: "Free accounts get a small number of analyses to try it. Premium includes a generous monthly allowance, shown in your account." },
      ]}
    />
  );
}
