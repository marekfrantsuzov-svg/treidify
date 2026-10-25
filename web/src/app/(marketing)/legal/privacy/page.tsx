import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/legal/privacy" } };

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="Treidify handles financial data, so privacy is designed in, not added on. This policy explains what we collect, why, how long we keep it and the rights you have, including under the EU and UK GDPR."
      sections={[
        { heading: "Who we are", body: ["Treidify (\"we\") is the controller of personal data processed through treidify.com and the Treidify apps. Our legal entity name, registered address and data-protection contact will be listed here before launch."] },
        { heading: "Data we collect", body: [[
          "Account data: email address, display name, @username, profile picture, country (optional), experience level, followed instruments, time zone and preferences.",
          "Sign-in data: identifiers from Sign in with Apple or Google, hashed passwords for email sign-in, multi-factor settings, session and device information.",
          "Trading-account data you connect: account number, broker server, currency, balance, equity, margin, positions, orders, deals, deposits and withdrawals, commissions and swaps. We never collect your trading (master) password.",
          "Content you create: journal notes, tags, rulebook, chart uploads, community posts, comments and reactions.",
          "Billing data: subscription status and invoices. Card details are handled by Stripe and never reach our servers.",
          "Usage data: security logs and, only with your consent, aggregated analytics.",
        ]] },
        { heading: "Why we use it (lawful bases)", body: [[
          "To provide the service you asked for, including account sync, analytics and coaching (contract).",
          "To verify community eligibility from synced data (contract, and legitimate interest in a fair community).",
          "To keep accounts and data secure, prevent fraud and enforce community rules (legitimate interests, legal obligation).",
          "To send AI-generated explanations of your data (your consent, which you can withdraw at any time).",
          "Analytics cookies or scripts (consent).",
        ]] },
        { heading: "AI processing", body: ["When you use AI features, the minimum necessary computed data (for example metrics and observations, or the chart image you upload) is sent to our AI provider under a data-processing agreement that prohibits training on your data. Raw broker credentials are never sent. You can switch AI explanations off in Settings."] },
        { heading: "Who we share data with", body: ["We use processors under contract: hosting and database, our MetaTrader connectivity provider, market-data and news providers (no personal data), our AI provider, Stripe for payments, and an email provider. We do not sell personal data and we do not share your trading data with brokers or advertisers.", "Public profile and performance information is visible to other members only if you switch it on."] },
        { heading: "International transfers", body: ["Some processors are outside the UK/EEA. Transfers rely on adequacy decisions or Standard Contractual Clauses with supplementary measures."] },
        { heading: "Retention", body: [[
          "Account and trading data: while your account is active, then deleted within 30 days of account deletion, except where law requires longer retention (for example invoices).",
          "Disconnected trading accounts: synced history is kept for your records until you delete it or your account.",
          "Security and audit logs: up to 12 months.",
          "Backups: rolling, overwritten within 35 days.",
        ]] },
        { heading: "Security", body: ["Encryption in transit (TLS) and at rest, encrypted storage of connection secrets, role-based access for staff with audit logging, per-user data isolation, rate limiting and regular backups. No system is perfectly secure; we will notify you and the regulator of a qualifying breach as the law requires."] },
        { heading: "Your rights", body: ["You can access, correct, export (portable JSON/CSV) and delete your data from Settings, and object to or restrict certain processing. You can withdraw consent at any time. You can complain to your local data-protection authority, such as the ICO in the UK."] },
        { heading: "Children", body: ["Treidify is not intended for anyone under 18."] },
        { heading: "Changes", body: ["We will notify you of material changes by email or in the app before they take effect."] },
      ]}
    />
  );
}
