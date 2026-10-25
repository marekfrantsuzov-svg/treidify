import type { Metadata } from "next";
import { BookCheck, CalendarRange, Clock, Scale, Sparkles, TrendingUp } from "lucide-react";
import { FeaturePage } from "@/components/marketing/feature-page";
import { CoachPreview } from "@/components/previews/coach-preview";

export const metadata: Metadata = {
  title: "AI Trading Coach",
  description: "An AI trading coach that analyses your real synced trades: sizing after losses, holding times, sessions, costs and rule breaks, with evidence for every observation.",
  alternates: { canonical: "/ai-coach" },
};

export default function Page() {
  return (
    <FeaturePage
      slug="ai-coach"
      eyebrow="AI Trading Coach"
      plan="Premium"
      title="A coach that reads your trades, not a script."
      lead="Treidify's coach measures how you actually trade from your synced history, explains each pattern with its evidence and sample size, and tells you what you are doing well."
      visual={<div className="mx-auto max-w-3xl"><CoachPreview limit={5} /></div>}
      capabilities={[
        { Icon: Scale, title: "Risk after losses", body: "Detects whether position size grows after losing trades compared with after winners." },
        { Icon: Clock, title: "Holding behaviour", body: "Compares how long you hold losers with winners, and flags early exits on profitable trades." },
        { Icon: TrendingUp, title: "Sessions and instruments", body: "Shows where your results come from: by session, weekday, instrument and trade duration." },
        { Icon: BookCheck, title: "Your rulebook", body: "Set your own rules (max trades per day, max lots, allowed symbols) and every breach is listed." },
        { Icon: CalendarRange, title: "Daily, weekly, monthly reviews", body: "Structured reviews with a discipline score, progress over time and a personal improvement plan." },
        { Icon: Sparkles, title: "Plain-language explanations", body: "AI turns the measured findings into clear coaching. It can only use your computed data, never invent numbers." },
      ]}
      method={{
        title: "Evidence first, AI second",
        lead: "The coach is two layers. Deterministic detectors find patterns; AI only explains what the detectors found.",
        steps: [
          { title: "Minimum samples", body: "Behavioural observations need at least 20 closed trades, and session findings at least 10 trades per session. Small samples never produce confident claims." },
          { title: "Measured, not psychoanalysed", body: "Observations describe behaviour (\"size rose 40% after losses\"), never emotions or conditions. Treidify does not diagnose anything." },
          { title: "Psychology cost, only when defined", body: "Where a counterfactual is clearly defined, such as applying your own stated stop rule, the coach estimates its cost and shows the formula. Otherwise it gives no dollar figure." },
          { title: "Grounded AI", body: "The AI receives only your computed metrics and observations, with instructions to cite them. Its text is labelled as interpretation." },
        ],
      }}
      limits={[
        "Tell you which trade to take next or promise better results.",
        "Diagnose psychological or medical conditions, or label your emotions.",
        "Invent statistics the data cannot support. Missing data is reported as missing.",
        "Share your trades with anyone. Coaching is private to your account.",
      ]}
      faqs={[
        { q: "What data does the coach use?", a: "Closed trades and positions synced from your connected account, your rulebook, and, for context, the market data and events around each trade." },
        { q: "Is my data sent to an AI provider?", a: "Only computed metrics and observations needed for the explanation are sent to our AI provider under a data-processing agreement, and only after you consent. You can turn AI explanations off and keep the deterministic findings." },
        { q: "How is the discipline score calculated?", a: "It is the share of trades in the period that complied with every rule in your rulebook, shown with the list of exceptions. With no rulebook, the score is not shown." },
      ]}
    />
  );
}
