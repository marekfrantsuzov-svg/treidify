# Web platform status

Updated 2026-10-25. Honest record of what works, what is labelled sample, and what waits on accounts only Marek can create.

## Working now (tested)

| Area | State | Evidence |
| --- | --- | --- |
| Public site | 19 pages, dark and light, mobile and desktop | production build, no horizontal overflow at 390 and 1440 px |
| Email sign-up and sign-in | Verification required, 10+ character passwords, rate limits, reset flow | Playwright Journey A |
| Two-step sign-in (TOTP) | Set up with QR or key, backup codes, required at next sign-in | Playwright Journey A |
| Sessions | List devices, sign out one or all others; password change signs out others | manual check |
| Onboarding | 7 steps, resumable, risk acknowledgement required, AI consent optional | Playwright Journey A |
| 72-hour trial | Server-side, one per account, no card, ends on its own | Playwright Journey A, `entitlements.ts` conditional update |
| Dashboard | Account Health first; periods 7D, 30D, 90D, This Month (user time zone), Custom, All | unit tests for periods; screenshots with a sample account |
| Profile and privacy | Username, bio, photo upload (re-encoded), 8 privacy toggles defaulting to private, position delay | Playwright Journey A |
| Preferences | Time zone, markets, dashboard options, AI consent | manual check |
| Data rights | JSON export without secrets; account deletion | route returns 401 when signed out (e2e) |
| Contact form | Stored as a support ticket; emailed when Resend is configured | code path |

## Labelled sample (never shown as live)

- Markets page charts run the real engine on generated candles, badged "Illustrative data".
- Journal and community previews use a sample account, badged "Sample account".
- Development seed accounts use `source = "sample"` and are badged on the dashboard.

## Not built yet, and what each needs

| Feature | Needs |
| --- | --- |
| MT4/MT5 account sync | MetaApi token and a test MT5 account (investor password) |
| Live XAUUSD and DXY prices | Market-data vendor and key, DXY decision |
| News and calendar engine | News vendor and key |
| AI coach, Macro Desk, chart analysis | Anthropic API key |
| Payments | Stripe account; price confirmation (proposed $29/month, $290/year) |
| Google and Apple sign-in | Google OAuth client; Apple Developer membership for Sign in with Apple |
| Real email delivery | Resend account and a verified sending domain |
| Hosting | Vercel and Neon (recommended) or equivalent, plus the domain |
| Community rooms, alerts, search, admin panel | Built in later stages on top of the schema already in place |
