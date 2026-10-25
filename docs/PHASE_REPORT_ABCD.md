# Phase report: A, B, C and D (approved white and black glass design)

Date: 2026-10-25. Branch `claude/project-thread-md0wgm`.

## Phase A: audit

- Kept: public site (Stage 2), accounts, onboarding, trial, settings and data rights (Stage 3), the analytics engine and its tests, the database schema (45 tables, already covering sync, news, community, billing and admin).
- Gaps against the final brief: the design system, the custom icon system, the dashboard layout, five missing app sections (Macro Desk, Global News, AI Chart Analysis, AI Coach, Economic Calendar), and every external integration (phases E to J).

## Phase B: design system

- `web/src/app/globals.css`: light and dark tokens retuned separately. Light is frosted white over silver with restrained blue. Dark is black and midnight navy with silver reflections and blue edges. The background has static glass ribbons and no continuous animation.
- `web/src/components/icons/glass-icon.tsx`: 22 custom glyphs drawn on a 24-unit grid with no icon library. Each one has a translucent body, a luminous rim, a specular highlight, a glass tile and an active blue state. They are pure SVG and CSS, so they stay sharp at any size. The development gallery is at `/dev/icons`.

## Phase D: dashboard

- The shell (`components/app/app-shell.tsx`) has:
  - A sidebar with the 10 sections from the brief and the account connection status.
  - A greeting with the live session line.
  - Search (⌘K) over pages, markets and settings.
  - A date selector with 7D, 30D, 90D, This Month, Custom and All.
  - A theme switch, notifications and the profile menu.
  - On mobile, a glass tab bar (Home, Markets, AI, Community, More) and a More sheet.
- The dashboard (`app/app/page.tsx`) follows the reference in four rows:
  1. Account Health: Health score, Total Balance, Net P&L and Win Rate, with sparklines, rings and an expandable equity curve.
  2. XAUUSD and DXY charts with timeframes and clickable zones, plus a news card.
  3. Macro Desk, AI Chart Analysis and Community.
  4. Open Positions and Recent Trades.
- New pages: Macro Desk, Global News, AI Chart Analysis (upload with validation), AI Coach, Economic Calendar and Settings › Trading accounts.

## Phase C: public site

- The hero now reads "Your Trading Intelligence." with the approved supporting line and the buttons Get Started Free and Explore Features.
- The hero preview renders the real dashboard components on labelled sample data.
- Marketing feature and ecosystem sections use the glass icon tiles.

## Tests

- Typecheck, 24 unit tests and a production build pass.
- Playwright Journey A passes on desktop and mobile. It now also opens all nine navigation sections and confirms that the charts and news are honestly labelled.
- Screenshots were taken at 1440 px and 390 px in light and dark mode, with no horizontal overflow and no console errors.

## Comparison with the approved image

Matching:

- Sidebar order and active state.
- Greeting, search, date selector and avatar.
- Card proportions and corner radii.
- The four-card health row with ring, sparklines and win ring.
- Chart cards with timeframe chips and green and red zones.
- The three-column middle and lower rows.
- The positions table and the recent trades list.
- The dark and light treatments.

Different on purpose, until providers are connected:

- **News cards.** They show branded category illustrations instead of news photos, because there is no licensed feed yet and headlines are never invented.
- **Chart and macro values.** They come from labelled sample candles.
- **Community card.** It shows the room rules instead of posts, because posting is phase H.
- **Logo.** The reference shows a blue "T" mark. It is not drawn, because the logo file has not been supplied and the logo is never redrawn. The typeset wordmark stays until the file arrives.

## Not done yet

| Phase | What remains | What you need to provide |
| --- | --- | --- |
| E | MT4/MT5 sync, reconciliation against the provider, positions and history import | MetaApi token, a test MT5 account with its investor password |
| F | Live XAUUSD, DXY, XAGUSD and yields; news ingestion with licensed images; the calendar | A market-data vendor; a news vendor whose licence covers images |
| G | Vision chart analysis, the coach and its reports, Ask the Macro Desk | Anthropic API key |
| H | Posts, comments, reactions, Pro and Whale verification, moderation and appeals | None (built on the synced data from phase E) |
| I | Stripe checkout, notification delivery, the admin panel | Stripe account and price confirmation |
| J | Workers for sync and news, production deploy, domain and SSL | Hosting approval (Vercel + Neon, plus a worker host such as Railway or Fly), the domain and DNS access |
