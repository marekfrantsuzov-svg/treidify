import type { Metadata } from "next";
import { Clock, FileSearch, GitBranch, Globe2, Link2, ShieldAlert } from "lucide-react";
import { FeaturePage } from "@/components/marketing/feature-page";
import { EventPreview } from "@/components/previews/event-preview";
import { InstrumentCard } from "@/components/previews/zone-explorer";

export const metadata: Metadata = {
  title: "Global Market Intelligence",
  description: "Geopolitical and macroeconomic events from identifiable sources, assessed for their potential impact on gold, the US dollar and silver with conditional scenarios.",
  alternates: { canonical: "/market-intelligence" },
};

export default function Page() {
  return (
    <FeaturePage
      slug="market-intelligence"
      eyebrow="Global Market Intelligence"
      plan="Free and Premium"
      title="Know what moves gold before the market reacts."
      lead="Conflicts, central-bank decisions, yields, inflation, sanctions, tariffs and banking stress, collected from identifiable sources and assessed for gold, the dollar and silver."
      visual={<div className="grid gap-4 xl:grid-cols-2"><EventPreview /><InstrumentCard symbol="DXY" height={300} /></div>}
      capabilities={[
        { Icon: Globe2, title: "Beyond the calendar", body: "Military conflicts, government announcements, oil disruptions, sanctions, tariffs, banking and currency crises, alongside scheduled data." },
        { Icon: ShieldAlert, title: "Impact on XAUUSD, DXY, XAGUSD", body: "Direction of pressure, expected horizon, volatility impact, and confidence with its uncertainty stated." },
        { Icon: GitBranch, title: "Three scenarios", body: "Bullish, bearish and neutral paths for each event, with the confirmation signals and invalidation conditions for each." },
        { Icon: FileSearch, title: "Facts kept apart from AI", body: "Verified facts, AI interpretation and forward-looking scenarios are visually separated on every event page." },
        { Icon: Link2, title: "Sources and timeline", body: "Linked sources, publication and update times, and a timeline of related developments." },
        { Icon: Clock, title: "Freshness on screen", body: "Every event shows its age, and the page warns when its sources are stale." },
      ]}
      method={{
        title: "No automatic \"war means gold up\"",
        lead: "A conflict does not automatically lift gold. Each assessment works through the channels that actually move it.",
        steps: [
          { title: "Ingest from identifiable sources", body: "Licensed news feeds and official sources (central banks, treasuries, statistics agencies). No scraped calendars, no unattributed headlines." },
          { title: "Classify the event", body: "Type, region, severity and the assets it plausibly touches, with deduplication across sources." },
          { title: "Check the transmission channels", body: "Safe-haven demand, US dollar strength, nominal and real yields, inflation expectations, liquidity conditions and positioning." },
          { title: "Ask whether it is priced in", body: "Price action since the first report is compared with the expected direction before any scenario is called likely." },
          { title: "Guard against manipulation", body: "Article text is treated as untrusted data. Instructions hidden in a news article cannot change the analysis." },
        ],
      }}
      limits={[
        "Invent news or present an unconfirmed report as fact.",
        "Assume every conflict or crisis is bullish for gold.",
        "Hide when sources are old, conflicting or incomplete.",
        "Rely on scraped calendars such as Forex Factory.",
      ]}
      faqs={[
        { q: "Which news sources do you use?", a: "Licensed financial newswires and official publications from central banks, finance ministries and statistical agencies. Each event lists its sources with links." },
        { q: "How quickly do events appear?", a: "Within minutes of the source publishing, subject to our providers. The event page shows the publication and last-updated times." },
        { q: "Are the scenarios trading signals?", a: "No. They are conditional analysis that states what would confirm or invalidate each path." },
      ]}
    />
  );
}
