import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Subscription Terms", alternates: { canonical: "/legal/subscription-terms" } };

export default function Page() {
  return (
    <LegalPage
      title="Subscription Terms"
      intro="How Treidify's free plan, 72-hour Premium trial and paid subscriptions work."
      sections={[
        { heading: "Free plan", body: ["A free account needs no payment details and includes the features listed on the Pricing page."] },
        { heading: "72-hour Premium trial", body: ["Each person may start one Premium trial. It lasts 72 hours from activation, needs no payment card and ends automatically. Nothing is charged when it ends; your account returns to the free plan. Trial eligibility is tied to your identity, not your device, so creating additional accounts to repeat the trial is not permitted."] },
        { heading: "Paid plans", body: ["Premium is offered monthly or annually at the prices shown at checkout, including any applicable taxes. Payments are processed by Stripe. Subscriptions renew automatically at the end of each period until cancelled, and you will be told this clearly before you pay."] },
        { heading: "Cancellation", body: ["Cancel any time from Settings > Billing. Premium stays active until the end of the period you paid for. Consumers in the UK and EU have a 14-day right to cancel a new subscription; by starting to use Premium immediately you acknowledge that a proportionate amount may be deducted from any refund."] },
        { heading: "Changes of plan", body: ["Upgrades take effect immediately with a prorated charge. Downgrades take effect at the end of the current period."] },
        { heading: "Failed payments", body: ["If a renewal payment fails we retry and notify you. If it still fails, Premium ends and your account returns to the free plan; your data is kept."] },
        { heading: "Price changes", body: ["We will give at least 30 days' notice of a price change before your next renewal, and you can cancel before it applies."] },
        { heading: "Community access is not for sale", body: ["Subscriptions never grant Verified Pro or Whale Room access. Those depend only on verified trading performance."] },
      ]}
    />
  );
}
