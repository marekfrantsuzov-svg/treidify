export interface HelpArticle { id: string; q: string; a: string }
export interface HelpCategory { id: string; title: string; articles: HelpArticle[] }

export const helpCategories: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting started",
    articles: [
      { id: "create-account", q: "How do I create an account?", a: "Select Get Started Free and sign up with Apple, Google or email. Email sign-ups confirm their address with a link. No payment details are needed." },
      { id: "onboarding", q: "What does onboarding ask me?", a: "Your experience level, the instruments you follow, your time zone and dashboard preferences, and whether you want to connect a trading account now. Every step except the first can be changed later in Settings." },
      { id: "without-account", q: "Can I use Treidify without connecting a broker?", a: "Yes. Market intelligence, bias, zones, news and the Macro Desk work without a connection. Account Health, the journal, coaching and community verification need one." },
    ],
  },
  {
    id: "connecting",
    title: "Connecting MT4 and MT5",
    articles: [
      { id: "investor-password", q: "Where do I find my investor password?", a: "Your broker issues it with the account, usually in the welcome email or client area. In MetaTrader 5 you can set a new one under Tools > Options > Server > Change, choosing the investor password. Never share your master password with anyone, including Treidify." },
      { id: "server-name", q: "Which server name do I enter?", a: "The exact server name shown in MetaTrader when you log in (File > Login to Trade Account), for example BrokerName-Live3. Treidify suggests matches as you type." },
      { id: "sync-status", q: "What do the connection statuses mean?", a: "Connected: syncing normally. Synchronizing: importing history or catching up. Reconnection Required: the broker rejected the login, often because the investor password changed. Connection Error: a temporary provider or broker problem; Treidify retries automatically. The time of the last successful sync is always shown." },
      { id: "history-missing", q: "Why is some of my history missing?", a: "Some broker servers limit how much history an investor login can read. Treidify imports everything available and shows the earliest date it found." },
      { id: "disconnect", q: "How do I disconnect an account?", a: "Settings > Connections > Disconnect. Syncing stops immediately and the stored credential is deleted. Your synced history stays in your journal until you delete it." },
    ],
  },
  {
    id: "numbers",
    title: "Understanding your numbers",
    articles: [
      { id: "net-pnl", q: "How is net P&L calculated?", a: "For each closed trade: profit plus commission, swap and fees. Trades count in the period in which they closed. Deposits and withdrawals are never counted as profit." },
      { id: "balance-vs-pnl", q: "Why doesn't my balance change when I change the period?", a: "Balance and equity are current snapshots of your account. The period selector changes performance metrics such as net P&L, win rate and profit factor." },
      { id: "health-score", q: "What is the Account Health score?", a: "A 0–100 summary of drawdown control (30 points), profit factor (25), expectancy (20), sizing consistency (15) and loss streaks (10), calculated from at least 20 closed trades. Tap the score to see each component. It describes past behaviour and does not predict results." },
      { id: "bias", q: "How is market bias decided?", a: "From confirmed swing highs and lows and the 50-period EMA on each timeframe. Bullish needs higher highs and higher lows with price above the EMA and the last swing low; bearish is the mirror image; anything else is neutral." },
      { id: "sample-data", q: "What does Illustrative or Sample mean?", a: "Marketing pages show the real Treidify interface with generated sample data so you can see how it works. Sample data is always labelled and never appears in your own dashboard." },
    ],
  },
  {
    id: "community",
    title: "Community and verification",
    articles: [
      { id: "eligibility", q: "How do I qualify for the Pro or Whale rooms?", a: "Pro: at least $10,000 verified net realized trading profit in each of the previous three completed calendar months. Whale: at least $50,000 in each of those months. Profit is calculated from synced account data, converted to USD, and excludes deposits, withdrawals and transfers." },
      { id: "privacy-toggles", q: "Who can see my performance?", a: "Nobody, unless you turn it on. Profile visibility, monthly P&L, win rate, history, open positions, entry prices, position sizes and balance each have their own toggle, and changes apply immediately." },
      { id: "report", q: "How do I report a post?", a: "Open the post menu and choose Report. Moderators review reports; promotional spam can lead to a permanent ban. Every decision can be appealed from the notice you receive." },
    ],
  },
  {
    id: "billing",
    title: "Plans and billing",
    articles: [
      { id: "trial", q: "How does the 72-hour trial work?", a: "Start it from your account. Premium unlocks for 72 hours without a card. When it ends, you return to Free automatically and are never charged. One trial per person." },
      { id: "cancel", q: "How do I cancel?", a: "Settings > Billing > Manage subscription. Premium stays active until the end of the period you paid for." },
      { id: "invoices", q: "Where are my invoices?", a: "Settings > Billing lists every invoice with a download link." },
    ],
  },
  {
    id: "privacy",
    title: "Privacy and security",
    articles: [
      { id: "mfa", q: "How do I turn on two-factor authentication?", a: "Settings > Security > Two-factor authentication. Scan the QR code with an authenticator app and save your backup codes." },
      { id: "export", q: "Can I export my data?", a: "Yes. Settings > Privacy > Export data produces a download of your profile, journal, trades and settings." },
      { id: "delete", q: "How do I delete my account?", a: "Settings > Privacy > Delete account. Connected accounts are disconnected and your data is deleted within 30 days, except records the law requires us to keep, such as invoices." },
    ],
  },
];
