# Treidify: production design, animation and performance report

Date: 2026-11-07. Branch: `claude/project-thread-ohhxfz` (rebased on `main` at 0fad5c9, so the MetaApi sync fixes from
PRs #25–#27 are kept). Not deployed: production needs Marek's approval. Rollback point: `main@0fad5c9`.

Status words used below:
- **Implemented**: the code is in.
- **Tested**: it was checked in this container with tests or rendered screenshots.
- **Partial**: some of it is done; the rest is listed.
- **Not implemented**: not done.

## Phase 0: why the build looked different from the approved dashboard

| Cause found | Fix |
|---|---|
| v5 used a blue-led gradient (#2350FF → #E36FD5) and neutral graphite cards. The approved dashboard is violet, lavender and magenta over violet-tinted glass. | Tokens recalibrated from pixels sampled in the approved image: ring #C46AF5 → #EB76FA, "All" pill #9652FC, signal bar #A853FB, WAIT text #DB79D1, cards #342C41 at ~50%. |
| The backdrop was a grey "night studio" photo. The approved image has soft violet and magenta light pools and diagonal light. | A generated aura backdrop (`web/scripts/aura.py`, no stock imagery). |
| Four stylesheets fought over specificity (globals → system → glass → v5). `--brand-violet` was still #105BFF (blue) in dark mode. | v5.css is the one token source, overriding values only, so there is no second system. Old blue values were overridden at the right specificity. |
| Balance, P&L, win rate and profit factor sat in one merged panel. The approved image has four separate glass cards. | Each metric is its own card. Values size to their card (container query), so they never clip. |
| The 1H selected pill was white and the WAIT badge was amber. | Violet-to-magenta pill, violet-tinted WAIT band, as in the approved image. |
| The sidebar had the bull illustration and a large Premium card. | The approved composition: no illustration, a compact Premium row. |
| A technical connection bar ("owner master password", "refreshes every 30 s"), env var names in empty states, and data-plan notes under charts. | Removed (see Phase 9). |
| Every dashboard section waited for every provider. | Each section streams behind its own Suspense boundary (Phase 5). |

**Font.** I compared glyph shapes in the approved images, then rendered them:
- The headline face is a grotesque in the SF Pro Display family, which cannot be licensed for the web.
- The closest licensable match measured was **Geist**, with glyph overlap 0.84 against the reference. Inter Display scored 0.64.
- So Geist is used for display type (hero, navigation, buttons) and Inter for UI text.
- This is a close match, not an identification. If Marek has the original font file or its name, it can replace Geist through one variable (`--font-display`).

## Status by phase

| Phase | Item | Status |
|---|---|---|
| 1 | Violet / lavender / magenta / charcoal tokens (`--bg-primary`, `--surface-glass`, `--accent-*`, `--positive` #21D58C, `--negative` #FF5B79, …) in `web/src/app/v5.css` | Implemented, tested (screens) |
| 1 | Type scale: hero 50–88 px desktop, 42–54 px mobile. Card titles 16.5 px. Values 21–32 px, sized to the card. | Implemented, tested |
| 1 | Primitives | Partial |
| 2 | Layered glass: diagonal gradient, rim brighter at the top, inner top reflection, soft drop shadow, pointer sheen. Less blur on phones. Reduced-transparency and no-blur fallbacks. | Implemented, tested |
| 3 | Safe area: html background equals the header colour, no separate strip, standalone padding. viewport-fit=cover and theme-color stay in place. | Implemented. Not tested on a real iPhone. |
| 3 | Mobile header: menu, logo, notifications, avatar. Every target is at least 44 px on touch screens. | Implemented, tested |
| 3 | "MT5 Connected" account card | Implemented, tested (typecheck and render; no real account here) |
| 3 | Metrics: Account Health full width, then a 2 × 2 grid. No clipping from 320 px up. | Implemented, tested |
| 3 | Health ring | Implemented, tested |
| 3 | Floating glass dock: Dashboard, Markets, Analysis, Calendar, Community. Safe-area padding. Content clears it (checked: main has 92 px bottom padding, the dock is 66 px). | Implemented, tested |
| 4 | Hourly MT5 sync | Implemented, tested (DB test) |
| 5 | Navigation speed | Partial (see measurements) |
| 6 | Landing, all 13 sections in order | Implemented, tested |
| 6 | Hero: new copy, violet light trails, timeline | Implemented, tested |
| 6 | Product showcase | Implemented, tested |
| 7 | Feature presentations | Implemented, tested |
| 8 | System applied to every app page | Partial |
| 9 | Technical text removed | Implemented, tested |
| 10 | Billing | Implemented, unit-tested. Not tested against Stripe. |
| 11 | Micro-interactions | Partial |
| 12 | Breakpoints: 320, 375, 390, 430, 768, 1024, 1440, 1920, and landscape 844×390, 932×430, 1024×1366 | Tested |
| 13 | Production-build performance audit | Tested (numbers below) |
| 14 | Screenshots | Done |

Details for the rows marked above:

- **Primitives (Partial).** Implemented as shared classes and components:
  - classes: `.dcard`/`.glass-card` (GlassCard), `.glass-panel`, `.grad-border` (GradientBorder), `.pill-violet`/`.tf-pill`, `.wait-badge`, `.health-chip` (StatusBadge), `.acct-status`
  - components: `SlidingPill`, `PlanGate`, `PricingCards`, `AppShell` (DashboardShell, DesktopSidebar, MobileNavigation), skeleton `Slot`s
  - not done: a separate React component per name in the brief (GlassButton, AnimatedSection and others). The existing Button, Reveal and AppShell cover those roles.
- **"MT5 Connected" account card.** Shows equity, floating P&L, status, "Last sync N min ago", a stale state after 75 min or on error, and Refresh. The password type is never shown.
- **Health ring.** Fills once, violet to lavender-pink. Statuses are Strong (80+), Moderate (50–79) and At risk (under 50). "How this is scored" links to the methodology table on the Account Health page, which shows this account's points per part.
- **Hourly MT5 sync.**
  - One policy, `ACCOUNT_REFRESH_INTERVAL = 60 * 60 * 1000`, in `web/src/config/sync.ts`.
  - A server-side timestamp is claimed atomically, so every tab, device and background job shares one slot and no two calls run at once.
  - No broker call on mount or navigation: pages render stored figures, and one timer fires when they turn an hour old.
  - Manual Refresh (POST) is limited to once every 2 minutes per account.
  - The background job syncs only accounts more than an hour old.
  - The DB test proves: no call within the hour, the manual gap is enforced, and access is re-checked.
- **Navigation speed (Partial).** Done:
  - Dashboard sections stream with skeletons in place.
  - The page transition is opacity/transform, 200 ms, no blur.
  - Client router cache: 30 s dynamic, 180 s static.
  - `optimizePackageImports`.

  Not done: caching the per-request layout queries, and moving the chart workspaces off the main thread.
- **Landing, 13 sections in order:** navigation, hero, product showcase, trading intelligence (figures and the tool index), account analytics, AI market analysis, Macro Desk and calendar, journal and Account Health, AI coach, how it works, plans, FAQ (new), final CTA, footer. The App Store teaser was removed from the homepage.
- **Hero.**
  - Copy: "Know where gold reacts. Understand why it moves."
  - Background: SVG strokes with flowing dash and scroll drift. Phones draw 3 of the 6 trails.
  - Timeline: background and nav at 0–250 ms, headline at 150–650 ms, text from 350 ms, CTA from 500 ms, product at 600–1300 ms.
  - The entrance does not replay on reload or back navigation in the same tab.
  - Reduced motion turns all of it off.
- **Product showcase.** The dashboard grows into place as it scrolls in (scroll-linked, no scroll-jacking). Four notes stagger in. Phones get their own layout: the phone app plus a list of notes. Figures are labelled as illustrative.
- **Feature presentations.** The existing AI analysis, account, journal, coach and macro scenes were kept and recoloured. Macro and news scenes show labelled example items, not fabricated headlines presented as real.
- **System applied to every app page (Partial).** Every page inherits the tokens, glass, pills and type. Checked: Dashboard, Markets, Journal, Macro, Account Health, Accounts, Plan. Not checked one by one: Community, News, Coach, AI Chart Analysis, Onboarding, Auth. Obsolete style layers (globals/system/glass) were not deleted, only overridden. A CSS clean-up pass is still open.
- **Technical text removed:**
  - env var names in empty states (EmptyState no longer renders `needs`)
  - "ANTHROPIC_API_KEY / FRED_API_KEY" messages
  - provider names in error messages
  - "data plan limit / free data plan, updates every N min" under charts
  - "refreshes every 30 s", the master-password wording, "No provider data"

  Kept: the sample-data notice (it only appears when market data is not connected), source attribution, delayed-data and risk notices.
- **Billing.**
  - Plans:
    - Essential: $24/mo or $195.84/yr, 1 account, analytics, Health and journal. No AI, news or macro.
    - Premium: $49/mo or $399.84/yr, 2 accounts, everything.
    - Annual is 32% off.
  - Trial: 3 days, card required, renews automatically. One trial per person.
  - Stripe: Checkout, the Customer Portal, and signed webhooks. The webhook is the only thing that grants access.
  - Server-side enforcement:
    - `requireFeature()` in the coach, chart and news AI actions
    - section layouts gated for Coach, AI Chart Analysis, News and Macro
    - dashboard News, Impact and Macro cards replaced by a Premium card on Essential
    - account limit checked on connect
  - The "72 hours of Premium, no card" copy is removed everywhere. The subscription terms are rewritten for the card trial.
  - Users on the old no-card trial keep it until it ends, then drop to no plan.
- **Micro-interactions (Partial).** Sliding pills (leading edge first, as in Marek's recordings), count-up figures, ring fill, card hover sheen, button press. A full pass over every control's hover, focus, disabled and loading states was not done.
- **Breakpoints.** No horizontal overflow on `/`, `/pricing`, `/app`, `/app/settings/plan`, `/app/markets` or `/app/journal`. A timeframe-strip overflow at 320 px was found and fixed.

## Measurements (production build, this container)

The container has no GPU, so rendering, and above all backdrop blur, runs on a software rasteriser. Data providers fail instantly because there is no outbound access. So paint-bound numbers here are worse than on a real phone or laptop, and network-bound numbers are better.

| Route | LCP ms | CLS | TTFB ms | JS KB |
|---|---|---|---|---|
| `/` | 916 | 0 | 9 | 259 |
| `/pricing` | 256 | 0 | 6 | 259 |
| `/app` | 816 | 0.03 | 40 | 332 |
| `/app/markets` | 788 | 0.002 | 44 | 305 |
| `/app/journal` | 548 | 0.079 | 29 | 234 |
| `/app/macro` | 788 | 0 | 62 | 244 |
| `/app/coach` | 644 | 0 | 22 | 229 |
| `/app/performance` | 540 | 0 | 23 | 223 |

- **LCP under 2.5 s: met** on every route measured.
- **CLS under 0.1: met.** The journal is the highest, at 0.079.
- **Cached route transitions** (no server request, served from the router cache): the URL changes 47–157 ms after the click, and the first paint of the new page follows at 155–465 ms.
  - Before: 240–630 ms to the URL change, 440–870 ms to content.
  - The under-200 ms target is met for the transition itself. The paint after it is not, in this container. That paint is chart and glass rendering on software graphics, and it needs a real-device check with Vercel Speed Insights.
- **INP proxy** (worst event duration while clicking timeframe and category tabs): 288–512 ms here, 160–240 ms with backdrop blur switched off.
  - The JavaScript handlers take 6–20 ms. The rest is software painting.
  - **Not met here.** Needs a real-device measurement before claiming the 200 ms target.

## Tests

- Typecheck: clean.
- Production build: passes.
- Unit and DB tests: 272 pass and 2 fail, run against a fresh Postgres.
  - The 2 failures are in `market/multi-asset.test.ts`.
  - They fail the same way on untouched `main` in this container, so they are not from this work.
- New tests:
  - billing: plans, prices, discount, feature split, planState, webhook signature
  - hourly sync: a DB test

## What Marek needs to do before billing goes live

These go in Vercel, as server env vars:
- `STRIPE_SECRET_KEY` (test mode first)
- `STRIPE_WEBHOOK_SECRET`
- the four price IDs:
  - `STRIPE_PRICE_ESSENTIAL_MONTHLY`
  - `STRIPE_PRICE_ESSENTIAL_ANNUAL`
  - `STRIPE_PRICE_PREMIUM_MONTHLY`
  - `STRIPE_PRICE_PREMIUM_ANNUAL`

In Stripe:
- Point a webhook at `/api/webhooks/billing`. The events are listed in that route.
- Enable the Customer Portal.

Stripe Tax and Estonian VAT need professional review. The rewritten subscription terms should get a legal read.

## Not done in this pass

- Real-iPhone Safari and installed-app (PWA) testing of the safe area.
- A real-device INP measurement.
- Deleting the old style layers.
- A per-control state audit.
- Stripe end-to-end in test mode: this needs the keys above.
