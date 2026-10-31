import type { Metadata } from "next";
import { Ban, BadgeCheck, Crown, Eye, Flag, Users } from "lucide-react";
import { FeaturePage } from "@/components/marketing/feature-page";
import { CommunityPreview } from "@/components/previews/community-preview";
import { Container } from "@/components/ui/container";
import { Glass } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeader } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Verified Trader Community",
  description: "A trading community based on verified performance. Pro and Whale rooms are earned through server-verified monthly net profit from synced accounts, never bought.",
  alternates: { canonical: "/community" },
};

const rules = [
  "Promoting external signal groups",
  "Selling trading services, courses or account management",
  "Affiliate and referral links or spam",
  "Impersonation or fake performance",
  "Harassment or abuse",
  "Scam links and unsolicited promotional messages",
];

export default function Page() {
  return (
    <FeaturePage
      slug="community"
      eyebrow="Verified Trader Community"
      plan="Free and Premium"
      title="Trade among verified performers."
      lead="Discuss gold, the dollar and silver with traders whose results are verified from their synced accounts. No screenshots, no self-reported earnings, no paid badges."
      visual={<div className="mx-auto max-w-4xl"><CommunityPreview /></div>}
      capabilities={[
        { Icon: Users, title: "General community", body: "Share educational analysis and charts, comment, react, follow traders and save posts." },
        { Icon: BadgeCheck, title: "Verified Pro Trader Room", body: "For traders with at least $10,000 verified net realized profit in each of the previous three completed calendar months." },
        { Icon: Crown, title: "Whale Room", body: "For traders with at least $50,000 in each of the previous three completed months. Whale members also access the Pro room." },
        { Icon: Eye, title: "You control visibility", body: "Monthly P&L, win rate, history and positions are private by default. Each is a separate opt-in toggle." },
        { Icon: Flag, title: "Report and review", body: "Report any post. Automated detection and human moderators review reports, with an appeal process." },
        { Icon: Ban, title: "No promotion, ever", body: "Selling signals or services and affiliate spam are banned. Repeated or severe violations lead to permanent bans." },
      ]}
      extra={
        <section className="py-16 sm:py-20">
          <Container className="grid gap-10 lg:grid-cols-2">
            <Reveal><SectionHeader eyebrow="Community rules" title="Strictly prohibited" lead="Enforced with automated detection, member reports and moderator review. Severe or repeated promotional violations can result in a permanent ban. Every ban can be appealed." /></Reveal>
            <Reveal delay={0.05}>
              <Glass className="p-6">
                <ul className="grid gap-3">
                  {rules.map((r) => <li key={r} className="flex gap-3 text-[15px] text-ink"><Ban className="mt-0.5 h-4 w-4 shrink-0 text-down" />{r}</li>)}
                </ul>
              </Glass>
            </Reveal>
          </Container>
        </section>
      }
      method={{
        title: "How verification works",
        lead: "Eligibility is calculated by a backend service from provider-synced account data. Verification and public visibility are separate: we can verify your profit without showing it to anyone.",
        steps: [
          { title: "Net realized trading profit", body: "Per completed calendar month: closed-trade profit plus commission, swap and fees. Deposits, withdrawals, transfers and bonuses are excluded." },
          { title: "Converted to USD", body: "Non-USD accounts are converted with timestamped FX rates at each deal's time. Multiple accounts are combined without double-counting internal transfers." },
          { title: "Three complete months", body: "Each of the previous three completed months must meet the threshold, and synced history must cover all three months in full. Incomplete history means not yet eligible." },
          { title: "Recalculated automatically", body: "After every month end and after significant history corrections. If you disconnect the verifying account, verified status lapses after a short grace period." },
          { title: "Anomaly checks", body: "Duplicate connections, repeated resets, suspicious corrections and the same account on multiple profiles are flagged for human review. A flag is never an accusation." },
        ],
      }}
      limits={[
        "Sell access to the Pro or Whale rooms. Subscriptions never change eligibility.",
        "Accept screenshots or self-reported earnings as verification.",
        "Show your balance, positions or entry prices unless you switch them on.",
        "Reveal broker credentials or login details to anyone, ever.",
      ]}
      faqs={[
        { q: "Do I need Premium for the Pro or Whale rooms?", a: "No. Room access depends only on verified performance. Premium unlocks analytics features, not community status." },
        { q: "Can others copy my live positions?", a: "Only if you choose to show positions. You can also delay their publication, which reduces copy-trading risk and protects your privacy." },
        { q: "What if my broker's history is incomplete?", a: "You stay in the general community until the synced history covers three full completed months." },
      ]}
    />
  );
}
