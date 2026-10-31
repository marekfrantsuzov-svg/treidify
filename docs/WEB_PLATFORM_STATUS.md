# Web platform status

Updated 2026-10-25, after the "Public website + private trading platform" update. This file records what works now, what is labelled as sample data, and what is still waiting on accounts that only Marek can create.

## Working now (tested)

| Area | State | Evidence |
| --- | --- | --- |
| Public homepage | Hero "Your Trading Intelligence. All in One Place." with the real dashboard and 8 floating widgets labelled "Demo". The session clock is the only live widget, because it is computed from the visitor's own clock. Eight sections, the final CTA, and a footer with every required link | `e2e/site.spec.ts`; screenshots at 390 and 1440 px in light and dark |
| Pricing | Free and Premium. The Premium price shows "Price announced at launch" until `NEXT_PUBLIC_PRICES_FINAL=true` and both prices are set. The 72-hour trial needs no card and does not bill automatically | `e2e/site.spec.ts` checks that no `$29` or `$290` appears |
| Two hosts | `treidify.com` (site), `app.treidify.com` (app), www redirect, one shared session | `src/lib/hosts.test.ts` |
| Sign-up, sign-in, two-step sign-in, sessions | Email verification, TOTP, backup codes, device list | Playwright Journey A |
| Onboarding and the 72-hour trial | 7 steps. The trial is enforced on the server, once per account | Playwright Journey A |
| Overview (dashboard) | Account Health first, with periods. Today's outlook is built from the market clock, structure and the user's own trades; it gives no price predictions | `outlook.test.ts`; Journey A |
| Performance Analytics | 12 metrics, equity curve, drawdown from peak, net profit by month, and breakdowns by instrument, session, weekday and direction | `breakdown.test.ts`; Journey A |
| Trading Journal | Closed trades filtered by instrument, direction, outcome, session and review state, 25 per page. Each trade can carry notes, setup tags, mistake tags and a lesson, saved per user with an ownership check | Journey A saves an entry and filters on it |
| Account Connections | Account list with sync status, a read-only MT4/MT5 connect form (turned off until sync is configured), and one-click load or removal of the demo account | Journey A |
| Live News | Coverage categories, impact legend, link to the economic calendar. No headlines until a feed is connected | Journey A |
| Settings, profile, privacy, export, deletion | As before | Journey A |
| Error handling | Error boundaries for the app, the site and the whole page, each with a reference ID. Server errors are reported through `onRequestError`. Loading skeletons for app pages | build; code path |
| Integration interfaces | Typed contracts for sync, market data, news, AI and billing. Each service is reported as configured or not, and as verified or not | `integrations.test.ts` |
| Secret storage | AES-256-GCM sealing with `DATA_ENCRYPTION_KEY` | `secret-box.test.ts` |

Totals: 52 unit tests and 6 Playwright runs (3 journeys, each on desktop and mobile), all passing. The production build is clean.

## Visual system (2026-10-31 redesign)

Colours come from Marek's reference: Marshmallow White `#F0F0F0`, Galactic Violet `#533FF5` and Bubblegum Pink `#ED74CE`. The violet and pink were sampled from the swatches, because the printed hex labels on them were wrong. All tokens are in `web/src/app/globals.css`, and green and red stay reserved for profit, loss, bullish and bearish. The motion is modelled on the reference recording:
- `page-flow` and `page-in` templates fade and stagger each section in over about 340 ms.
- `SlidingPill` (`web/src/components/ui/sliding-pill.tsx`) stretches the active pill from the old item to the new one, used in the sidebar, the mobile tab bar, settings categories, tabs and segmented controls.
- Buttons use `press` for lift and press feedback.
- Headline figures count up on arrival, and sparklines draw in.

Every animation is switched off under reduced motion.

## Labelled as sample data (never shown as live)

- **Homepage widgets:** marked "Demo". The economic calendar widget says it is "Example schedule, not this week's events".
- **Market charts and the Overview "Structure" line:** they run the real zone engine on generated candles and are badged as sample candles.
- **Demo account:** generated trades with `source = "sample"`, badged "Sample" on every screen. It never counts toward community verification.

## Remaining integrations, and what each needs

| Integration | What is built | What it still needs |
| --- | --- | --- |
| MT4/MT5 sync (MetaApi) | Interface, read-only connect form and action, `provider_connection` and `sync_run` tables | A MetaApi token and a test MT5 account with its investor password. Then the adapter, the sync worker on a non-Vercel host, and an end-to-end test |
| Market data (XAUUSD, DXY, silver, yields) | Interface, zone and bias engines | Choice of vendor, an API key, and a decision on how DXY is sourced. Then the adapter and the candle cache |
| News and economic calendar | Interface (with licensed-image fields), schema, UI states | Choice of news vendor and a key with image licensing. Then the news worker |
| AI (chart reading, coach reviews, Macro Desk Q&A) | Interface, chart upload validation, coach observations | An Anthropic API key. Then the adapter, prompt evaluations and usage limits |
| Payments | Interface, webhook endpoint (answers 503 until connected), entitlements | A Stripe account, approved prices, and the Price IDs for monthly and annual |
| Email | Resend sender with a development outbox | A Resend account and a verified domain |
| Google and Apple sign-in | Wired, turned on by environment variables | A Google OAuth client. For Apple, a Developer membership, later |
| Error monitoring | `reportError` hook and an optional webhook | Optional: a Sentry DSN, to connect inside `src/lib/monitoring.ts` |
| Hosting and domain | `docs/DEPLOYMENT.md`, `web/vercel.json`, production preflight and automatic migrations (`web/scripts/predeploy.ts`), `/api/health` | Marek's Vercel project (linked to GitHub) with a Neon database, the env values entered in Vercel, and the DNS records at the registrar. The domain is bought (2026-10-31) |
| Community rooms, alerts, search, admin panel | Schema and rules | Built on top of verified sync data |
