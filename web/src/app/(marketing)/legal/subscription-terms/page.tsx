import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Subscription Terms", alternates: { canonical: "/legal/subscription-terms" } };

export default function Page() {
  return (
    <LegalPage
      title="Subscription Terms"
      intro="How Treidify's plans, 3-day trial and subscriptions work."
      sections={[
        { heading: "Plans", body: ["Treidify offers Essential and Premium, monthly or annually, at the prices shown on the Pricing page and at checkout. An account without a plan can sign in but has no paid features."] },
        { heading: "3-day trial", body: ["Each person may have one trial. It lasts 3 days from checkout and requires a valid payment card. Nothing is charged during the trial. Unless you cancel before it ends, your subscription starts automatically at the end of the trial and you are charged the plan price for the period you chose (monthly or yearly). Trial eligibility is tied to you, not your device, so creating additional accounts to repeat the trial is not permitted."] },
        { heading: "Paid plans", body: ["Essential and Premium are offered monthly or annually at the prices shown at checkout, including any applicable taxes. Payments are processed by Stripe. Subscriptions renew automatically at the end of each period until cancelled, and you will be told this clearly before you pay."] },
        { heading: "Cancellation", body: ["Cancel any time from Settings › Plan › Manage billing. Your plan stays active until the end of the period you paid for. Consumers in the UK and EU have a 14-day right to cancel a new subscription; by starting to use a paid plan immediately you acknowledge that a proportionate amount may be deducted from any refund."] },
        { heading: "Changes of plan", body: ["Upgrades take effect immediately with a prorated charge. Downgrades take effect at the end of the current period."] },
        { heading: "Failed payments", body: ["If a renewal payment fails we retry and notify you. If it still fails, the plan ends and paid features are switched off; your data is kept."] },
        { heading: "Price changes", body: ["We will give at least 30 days' notice of a price change before your next renewal, and you can cancel before it applies."] },
        { heading: "Community access is not for sale", body: ["Subscriptions never grant Verified Pro or Whale Room access. Those depend only on verified trading performance."] },
      ]}
    />
  );
}
