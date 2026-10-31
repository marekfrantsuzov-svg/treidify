import type { Metadata } from "next";
import { Activity, Gauge, LineChart, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { FeaturePage } from "@/components/marketing/feature-page";
import { AccountHealthPreview } from "@/components/previews/account-health-preview";

export const metadata: Metadata = {
  title: "Account Health",
  description: "Connect MT4 or MT5 read-only and see real balance, equity, P&L, win rate, drawdown and an explained Account Health score.",
  alternates: { canonical: "/account-health" },
};

export default function Page() {
  return (
    <FeaturePage
      slug="account-health"
      eyebrow="Account Health"
      plan="Free and Premium"
      title="Your trading account, finally understood."
      lead="The first thing you see in Treidify is your own account: what it holds now, what it earned in the period you choose, and how healthy the way you trade really is."
      visual={<AccountHealthPreview />}
      capabilities={[
        { Icon: Wallet, title: "Balance and equity, now", body: "Current balance, equity, margin and floating P&L as live snapshots from your synced account, never mixed with period results." },
        { Icon: LineChart, title: "P&L for any period", body: "7D, 30D, 90D, this month, a custom range or all time. Net P&L, win rate and profit factor recalculate for the period instantly." },
        { Icon: Activity, title: "Equity and drawdown chart", body: "An interactive equity curve with realized versus unrealized results, daily and cumulative views and drawdown from peak." },
        { Icon: Gauge, title: "Account Health score", body: "A 0–100 summary of drawdown control, profit factor, expectancy, sizing consistency and loss streaks, with every component shown." },
        { Icon: RefreshCw, title: "Always in sync", body: "Connected, Synchronizing, Reconnection Required or Connection Error, with the time of the last successful sync on screen." },
        { Icon: ShieldCheck, title: "Verified, not typed in", body: "Numbers come from provider-synced account history and are calculated on the server. Manual entries are never labelled verified." },
      ]}
      method={{
        title: "How the numbers are calculated",
        lead: "Every figure has one documented definition, the same in the dashboard, the journal and community verification.",
        steps: [
          { title: "Separate trading from cash flows", body: "Trading profit, deposits, withdrawals, commissions, swaps and floating P&L are stored separately, so a deposit never looks like profit." },
          { title: "Net P&L per trade", body: "Profit plus commission, swap and fees, attributed to the period in which the trade closed." },
          { title: "Win rate and profit factor", body: "Win rate is wins divided by wins plus losses; break-even trades are counted separately. Profit factor is gross profit divided by gross loss." },
          { title: "Drawdown on trading-only equity", body: "Measured from the running peak of capital plus realized trading P&L, excluding deposits and withdrawals, so funding changes do not hide or invent drawdowns." },
          { title: "Currency conversion", body: "Accounts in other currencies are converted to USD for comparison using timestamped FX rates at the time of each deal." },
        ],
      }}
      limits={[
        "Show fictional or sample profits on your own dashboard. If no account is connected you see a connection invitation, not made-up numbers.",
        "Ask for your trading (master) password or any withdrawal permission. Only a read-only investor password is used.",
        "Place, modify or close trades on your account.",
        "Claim that the Health score predicts future results. It summarises past risk and consistency.",
      ]}
      faqs={[
        { q: "Do I need to connect an account to use Treidify?", a: "No. Market intelligence works without a connection. Account Health, the journal, coaching and community verification need a connected MT4 or MT5 account." },
        { q: "Which brokers work?", a: "Most brokers that offer MetaTrader 4 or 5 and allow investor-password access. Connection support depends on our connectivity provider and your broker's server; we test each connection when you add it. See Supported brokers." },
        { q: "How far back does history go?", a: "As far as your broker's server provides through the connection. Some brokers limit the history available to investor logins; Treidify shows the earliest date it could import." },
        { q: "Is the Health score financial advice?", a: "No. It is a transparent summary of your past trading metrics with each component explained. It does not tell you what to trade." },
      ]}
    />
  );
}
