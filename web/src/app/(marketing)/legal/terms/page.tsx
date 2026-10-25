import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/legal/terms" } };

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms govern your use of Treidify. By creating an account you agree to them. Please read the Risk Disclosure as well: it is part of these terms."
      sections={[
        { heading: "The service", body: ["Treidify provides trading analytics, market information, educational analysis, AI-generated explanations and a community. Treidify does not execute trades, hold client money, manage accounts, provide signals or give personal investment advice. You are solely responsible for your trading decisions."] },
        { heading: "Eligibility and accounts", body: ["You must be at least 18 and able to form a binding contract. Keep your sign-in credentials secure and enable multi-factor authentication. You are responsible for activity on your account."] },
        { heading: "Connecting trading accounts", body: ["You may connect only accounts you own or are authorised to connect, using a read-only investor password. You authorise Treidify and its connectivity provider to read the account data described in the Privacy Policy. You can disconnect at any time."] },
        { heading: "Acceptable use", body: [[
          "No promotion of signal groups, trading services, affiliate or referral links.",
          "No impersonation, fake performance or manipulation of verification.",
          "No harassment, scams, malware or unlawful content.",
          "No scraping, reverse engineering, overloading or attempts to access other users' data.",
        ], "We may remove content, restrict features or suspend or terminate accounts that break these rules. Severe or repeated promotional violations may result in a permanent ban. You can appeal any moderation decision."] },
        { heading: "Your content", body: ["You keep ownership of what you post and upload. You grant Treidify a licence to host and display it as needed to run the service and according to your visibility settings."] },
        { heading: "Data and AI output", body: ["Market data and news come from third-party providers and may be delayed, incomplete or unavailable. AI output can be wrong; it is labelled as interpretation and must not be relied on as fact or advice."] },
        { heading: "Subscriptions", body: ["Paid plans are governed by the Subscription Terms."] },
        { heading: "Disclaimers and liability", body: ["The service is provided \"as is\". To the extent permitted by law, Treidify is not liable for trading losses or for indirect or consequential loss. Nothing in these terms limits liability that cannot be limited by law, including your statutory rights as a consumer."] },
        { heading: "Changes and termination", body: ["We may update these terms with notice. You may close your account at any time from Settings."] },
        { heading: "Governing law", body: ["The governing law and courts will be stated here once Treidify's operating entity is confirmed, without removing mandatory consumer protections of your country of residence."] },
      ]}
    />
  );
}
