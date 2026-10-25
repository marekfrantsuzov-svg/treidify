import type { Metadata } from "next";
import { Download, Filter, NotebookPen, Sigma, Tags, Timer } from "lucide-react";
import { FeaturePage } from "@/components/marketing/feature-page";
import { JournalPreview } from "@/components/previews/journal-preview";

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "An automatic trading journal built from your synced MT4/MT5 history: every trade with entry, exit, SL/TP, fees and session, plus analytics, notes, tags and exports.",
  alternates: { canonical: "/journal" },
};

export default function Page() {
  return (
    <FeaturePage
      slug="journal"
      eyebrow="Trading Journal"
      plan="Free and Premium"
      title="A journal that writes itself."
      lead="Every trade from your connected account appears automatically, with entry, exit, stop, target, size, fees, session and result. You add the thinking; Treidify adds the analysis."
      visual={<div className="mx-auto max-w-4xl"><JournalPreview rows={8} /></div>}
      capabilities={[
        { Icon: NotebookPen, title: "Full trade detail", body: "Instrument, direction, entry and exit, stop loss, take profit, volume, duration, fees, swap, session and realized P&L." },
        { Icon: Tags, title: "Notes, tags and lessons", body: "Tag setups and mistakes, write notes and lessons, and see the trade on its chart with entry and exit marked." },
        { Icon: Sigma, title: "Analytics that matter", body: "Win rate by instrument, profit by session and weekday, average win and loss, profit factor, streaks and drawdown." },
        { Icon: Timer, title: "Duration and sizing", body: "How long trades last, how results change with holding time and how consistent your position sizing is." },
        { Icon: Filter, title: "Filters", body: "Filter by instrument, direction, session, tag, result and date range. Every metric follows the filter." },
        { Icon: Download, title: "Exports", body: "Export filtered trades and metrics to CSV for your own records or your accountant." },
      ]}
      method={{
        title: "Derived only from what the data shows",
        lead: "If a metric cannot be calculated from your history, it is not shown.",
        steps: [
          { title: "Positions from deals", body: "MT5 deals are grouped into positions by position ID, so partial closes and scale-ins are handled correctly. Duplicates are detected and ignored." },
          { title: "Risk/reward only with a stop", body: "Risk/reward is calculated only for trades that had a stop loss at entry. Trades without one are counted and listed, not guessed." },
          { title: "Session by open time", body: "Each trade is attributed to the session active when it opened; overlaps go to the later-opening session." },
        ],
      }}
      limits={[
        "Require manual entry for synced trades.",
        "Estimate stop losses or risk you never set.",
        "Mark manually added trades as verified.",
      ]}
      faqs={[
        { q: "Can I add trades from other platforms?", a: "Manual and CSV-imported trades are supported for journaling, clearly marked as unverified. They never count toward community verification." },
        { q: "What happens to notes if I disconnect?", a: "Your notes and tags stay with your Treidify account. Synced trade data stops updating until you reconnect." },
      ]}
    />
  );
}
