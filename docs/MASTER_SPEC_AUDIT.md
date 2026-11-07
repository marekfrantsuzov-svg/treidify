# Treidify master spec: Phase A audit, plan and issue register

Date: 2026-11-07. Branch: `claude/project-thread-ohhxfz`. Rollback point: `main` at `832a21e` (PR #23, live in production); tag `pre-master-spec-2026-11-07` on that commit.

Method: read the whole `web/` codebase and git history, ran it locally (Postgres 16, a fresh account with the clearly labelled sample MT5 account), ran typecheck, unit tests and a production build, measured a production build (`next start`), inspected the live homepage from a real browser, and studied hybridtrader.ai's motion. What could not be checked from here is listed as such; nothing below is a guess presented as fact.

Status words: **Working** (verified end to end), **Partial** (works with stated gaps), **Broken** (fails today), **Not implemented**, **Blocked** (needs an external account, key, payment or decision).

---

## 1. Architecture inventory

| Area | What is there |
|---|---|
| Frontend | Next.js 16.4.3 App Router, React 19.3, strict TypeScript, all in `web/`. Server components by default; client islands for charts, motion and forms. |
| Rendering | Marketing pages static (homepage ISR 1 h). Every `/app/*` page is dynamic and server-rendered per request; layout awaits session + plan + accounts + unread count, the page then awaits all its data before sending anything (no `Suspense` streaming inside pages). |
| Backend | Next.js route handlers and server actions (`src/server/*`). The FastAPI `backend/` is unused by the web app. |
| Database | Postgres via Drizzle (Neon in production). 49 tables, 6 migrations, migrations run automatically on production builds (`scripts/predeploy.ts`). |
| Auth | Better Auth 1.7: email + password with required email verification, TOTP 2FA, username, admin, multi-session, rate limiting on. Google and Apple wired but off until keys exist. Cookies shared across `treidify.com` and `app.treidify.com`. |
| Billing | **Stripe not implemented.** Only a webhook endpoint that verifies and answers 503 until keys exist; no checkout, no portal, no subscription state handling. The 72 h trial is a no-card, one-time DB flag (`entitlement.trialStartedAt`). |
| Entitlements | `planState()` is correct and server-side, but **`hasFeature()` is never called**: no premium route, action or API checks the plan. Plans are Free / Premium only. |
| Hosting | Vercel (root `web/`, auto-deploy from `main`), Neon Postgres, Resend email. Function region not pinned in `vercel.json` (Vercel default); Neon region not recorded in the repo. |
| Integrations | Twelve Data free key (live gold, FX, crypto, computed DXY; silver and indices refused by the free plan), Finnhub free (news live, economic calendar refused → official US schedule + FRED public values), FRED, MetaApi (token set; first real connect pending), Anthropic (`claude-opus-5-5` for every AI call; key not set in production). |
| Charts | `lightweight-charts` 5 with Treidify's own overlay engine (zones, Fibonacci, liquidity, structure) in `components/terminal`. |
| AI | `src/server/ai/claude.ts` (chart report, desk notes, coach). Notes cached 30 min. No per-user usage limit or cost tracking. |
| UI and CSS | Tailwind 4 plus four stacked global stylesheets: `globals.css` (v1–v2), `system.css` (v3), `glass.css` (v4), and now `v5.css`. Works, but specificity fights are the main source of design regressions (see issue D-1). |
| Motion | `motion` 12 (Framer Motion). One library, kept. |
| Font | Inter 4 variable with optical sizing, self-hosted from `@fontsource-variable/inter` via `next/font/local`. This is the font on the live site and stays. |
| Logo | Official gradient T: `public/brand/treidify-t-{64,128,256,512}.{png,webp}`, rendered by `components/ui/wordmark.tsx`. Untouched. |
| Tests | 29 Vitest files (247 passing, 13 DB tests skipped without a DB), 4 Playwright journeys. CI (`web-ci.yml`): typecheck, unit, build, DB tests, e2e. Plus `prod-smoke`, `service-verify`, `market-verify`, `live-render`, `web-cron` workflows. |
| Monitoring | `lib/monitoring.ts`: structured JSON error lines to Vercel logs and an optional `ERROR_WEBHOOK_URL`. No Sentry, no alerting, no latency metrics. `/api/health` reports provider configuration. |
| Mobile | Responsive web with its own phone shell (top bar, 5-tab bottom nav, drawer). PWA manifest; `viewport-fit=cover`. |

## 2. Route map

Public (`treidify.com`): `/` home, `/features`, `/how-it-works`, `/pricing`, `/brokers`, `/about`, `/contact`, `/help`, feature pages (`/account-health`, `/ai-coach`, `/macro-desk`, `/market-intelligence`, `/chart-analysis`, `/journal`, `/community`), legal (`/legal/terms|privacy|cookies|risk-disclosure|subscription-terms`), auth (`/login`, `/login/two-factor`, `/signup`, `/forgot-password`, `/reset-password`, `/goodbye`), `/onboarding`.

App (`app.treidify.com/app`): dashboard `/app`, `/app/markets`, `/app/ai-analysis`, `/app/intelligence`, `/app/macro` and `/app/macro/[indicator]`, `/app/news` and `/app/news/[id]` (calendar lives at `/app/news?tab=calendar`; `/app/calendar` redirects), `/app/accounts` (`/app/settings/accounts` redirects), `/app/performance`, `/app/journal`, `/app/coach`, `/app/community` and `/app/community/agents/[id]`, `/app/notifications`, `/app/settings` (+ `profile`, `preferences`, `security`, `plan`, `accounts`).

API: `/api/auth/*`, `/api/health`, `/api/market/{candles,intel,status}`, `/api/account/{live,export}`, `/api/journal/screenshot/[id]`, `/api/contact`, `/api/client-error`, `/api/cron/{sync,community}`, `/api/webhooks/billing`. Dev only: `/dev/outbox`, `/dev/icons`.

There is no admin interface beyond Better Auth's admin plugin (no diagnostics view).

## 3. Feature status

| Feature | Status | Evidence / note |
|---|---|---|
| Sign up, verify email, log in, log out, reset password, TOTP | Working | e2e journey A; ran it locally today. |
| Google sign-in | Blocked | Needs `GOOGLE_CLIENT_ID/SECRET` in Vercel. |
| Apple sign-in | Blocked | Needs the paid Apple Developer Program (Marek declined for now). |
| Theme (dark default, light, persisted on account) | Working | PR #23. |
| XAUUSD chart, 8 timeframes, zones, Fibonacci, liquidity, structure | Working | Real engine; live bars in production via Twelve Data free. |
| Per-timeframe analysis and 50-pip rule | Working | `lib/trading/pips.ts`, `setup.ts`; WAIT / NO VALID SETUP when the structural stop is over 50 pips. Fib 88.6% level to confirm in Phase E. |
| Signal quality | Partial | Shows "None" unless a documented rule produces a value; no invented %. Methodology doc must cover it before any number appears. |
| Market Overview (forex, metals, indices, crypto) | Partial | Gold, FX, crypto, DXY live. Silver, indices, oil refused on the free data plan and labelled as such. |
| Market news | Working | Finnhub free, sanitised, source + time + link. Commercial display licence is not covered by the free plan. |
| Economic calendar | Partial | Official US schedules + FRED actuals; no forecasts and no non-US events (Finnhub calendar refused on free). |
| Macro Desk | Partial | FRED-backed tiles and explanations. "Empty Macro Desk" happens when FRED fetches fail or time out; the UI then shows "could not be loaded". |
| MT5 connection (MetaApi) | Partial / Blocked | Code complete, read-only proof via `investorMode`, owner bound. Marek's real connect hit a 403 then a timeout (see §5). Needs a successful real connect. |
| Account analytics, journal, P&L calendar, Account Health | Working on synced and sample data | Sample account clearly badged. Health score methodology exists in code; needs a written doc (Phase E) and an insufficient-data state check. |
| AI market analysis, AI coach, chart upload | Blocked | Code complete; `ANTHROPIC_API_KEY` not set in production. No usage limits yet. |
| Community with labelled AI analysts | Working | Analysts labelled AI. |
| Billing (Standard / Premium, monthly / annual, 72 h card trial) | Not implemented | Only the webhook shell. See Phase F. |
| Plan enforcement on the server | Not implemented | `hasFeature()` unused; premium endpoints are open to every signed-in user. |
| Admin diagnostics | Not implemented | |
| Error alerting, latency monitoring | Not implemented | Logs only. |
| Product analytics funnel | Partial | Consent-gated Plausible-style script; no event funnel. |

## 4. Prioritized issue register

P0 = security, money or correctness; P1 = core function; P2 = experience; P3 = polish.

| ID | P | Area | Issue | Fix |
|---|---|---|---|---|
| S-1 | P0 | Entitlements | No server-side plan checks: every signed-in user reaches every premium page, action and AI call. | One `requireFeature()` guard used by pages, actions and API routes; tests per entitlement (Phase F). |
| S-2 | P0 | Billing | No subscription system; the spec's paid plans, card-first trial, portal and webhooks do not exist. | Stripe Checkout + Billing Portal + idempotent webhook ledger (Phase F). |
| S-3 | P0 | Copy | Site says "72 hours of Premium, no card". True today, wrong the day the card-required trial ships. | Switch copy in the same release as billing. |
| S-4 | P1 | Security | No Content-Security-Policy header (HSTS, frame and type headers exist). | Add a nonce-based CSP in report-only first (Phase G). |
| S-5 | P1 | AI cost | Every AI call uses the largest model with no per-user quota or spend tracking. | Per-user daily limits, model by task, spend log (Phase E/G). |
| M-1 | P0 | MetaApi | `metaApi.call()` has no request timeout; connect retries up to 5 × 10 s of sleeps inside one request whose limit is 60 s. A slow MetaApi or broker check runs into the Vercel function limit and the user sees a timeout instead of "still checking". | Abort each call at 15 s, return "pending" after ~25 s and continue the check in the background (cron/poll), with the connection states the spec lists. |
| M-2 | P1 | MetaApi | If the account lookup after creation fails, the region falls back to `new-york`; client calls to the wrong regional host time out. | Read the region from the provisioning response or retry the lookup; never guess. |
| M-3 | P1 | MetaApi | The real failure on Marek's account has not been read from logs yet (403 reason was surfaced in PR #22). | Phase E: reproduce with his next attempt, read Vercel logs and MetaApi account state. |
| P-1 | P1 | Performance | App pages await every provider (market data, news, calendar, macro, MetaApi live state) before the first byte. In production one slow or rate-limited provider holds the whole page. | Stream: render the shell and cached data at once, put each provider card behind `Suspense`, read market data from the shared Postgres cache only. |
| P-2 | P1 | Performance | Client navigation measured at 240–630 ms before the URL even changes and 440–870 ms to ready content, on a production build where every provider failed instantly (sandbox has no egress), so this is pure app overhead. Live numbers will be higher. | Prefetch sidebar routes, move the per-request layout queries to cached reads, keep the template transition from re-mounting heavy trees, measure again. |
| P-3 | P2 | Performance | First-load JS 226–335 KB (compressed) per app route; dashboard heaviest. | Bundle analysis, lazy chart and motion islands (Phase G). |
| D-1 | P2 | Design system | Four global stylesheets override each other (v1 → v5). | After approval, fold v3–v5 into one token file and delete dead rules (Phase D). |
| D-2 | P2 | iPhone | Black/grey strip above the site in Safari: `html` had no background and the sticky header was transparent, so iOS 26 Safari, which samples the page instead of `theme-color`, fell back to its own light chrome. | Fixed on this branch (`v5.css`): canvas colour on `html`, header band in the same colour, standalone-mode padding. Needs a real iPhone check, normal Safari and installed PWA. |
| D-3 | P2 | Landing | Hero animation was limited to a fade; no scroll story. | v5 hero on this branch; scroll storytelling in Phase C. |
| D-4 | P3 | Dashboard | Card titles in gradient text, violet-tinted surfaces, purple glows on every card. | v5: white titles, graphite glass, gradient only on actions and selection. |
| O-1 | P1 | Observability | No alerting for sync failures, webhook failures, provider freshness. | Sentry (or webhook) + a small admin diagnostics page (Phase G). |
| O-2 | P2 | Data licence | Twelve Data free and Finnhub free are not licensed for commercial display. | Must upgrade before paid launch (memory: Twelve Data Venture $149/mo). Marek's decision, already noted. |

## 5. MetaApi timeout: what the code shows

1. `src/server/sync/metaapi.ts` `call()` uses `fetch` with no `AbortSignal`; a hung TCP connection waits until the platform kills the function.
2. `createConnection()` loops up to 5 times on HTTP 202 sleeping `min(10, retry-after)` seconds each, all inside the user's request. Worst case is about 50 s of sleeping plus five provider calls, against `maxDuration = 60` on `/app/accounts`.
3. After creation the region comes from `api.account(id)`; if that call fails it silently becomes `new-york`. Accounts provisioned in `london`, `vint-hill` or `singapore` would then be queried on the wrong host and time out on every sync.
4. Sync treats `DEPLOYED` + `DISCONNECTED_FROM_BROKER` as broker rejection, and redeploys `UNDEPLOYED` accounts; that is correct, but none of these states reach the UI as the spec's distinct states yet.

These are concrete defects whatever the provider-side cause turns out to be. The provider-side cause (billing, credentials, server name) still has to be read from logs on Marek's next attempt.

## 6. Performance baseline (production build, this container)

Direct load, warm server, authenticated, provider calls failing instantly because the container has no outbound access to the vendors:

| Route | TTFB ms | Load ms | JS KB (compressed) |
|---|---|---|---|
| `/` | 7 | 152 | 257 |
| `/app` | 24 | 165 | 335 |
| `/app/markets` | 30 | 98 | 306 |
| `/app/journal` | 21 | 241 | 234 |
| `/app/macro` | 61 | 142 | 244 |
| `/app/news?tab=calendar` | 33 | 154 | 226 |
| `/app/accounts` | 68 | 112 | 232 |
| `/app/coach` | 20 | 104 | 229 |

Sidebar navigation (click → URL change / content ready): Markets 577 / 805, AI Coach 631 / 867, Macro 315 / 706, Dashboard 241 / 622, Markets again 398 / 448, Dashboard again 305 / 438.

Live homepage from Marek's browser (treidify.com): TTFB 59 ms, DOMContentLoaded 227 ms, load 596 ms, 380 KB transferred. Live app routes need a signed-in measurement (Phase G), or Vercel Speed Insights.

## 7. Design direction v5 "Graphite Glass" (Phase B, on this branch)

- Canvas: near-black `#0A0B0F`, graphite glass, white and neutral grey type. Brand accent is the site's CTA gradient, sampled from the reference screenshots: `#2350FF → #4A55FB → #7C41ED → #E36FD5`. Used on primary buttons, the selected sidebar item, icon strokes, small progress marks. Cards no longer glow violet; titles are white.
- Four material levels: L1 navigation (sidebar, headers), L2 cards, L3 featured (chart, AI analysis, hero device), L4 overlays (menus, dialogs, drawer). Charts and figures stay on dense fills.
- Backdrop: a generated, heavily blurred night-studio interior (`public/brand/backdrop/*.webp`, 12–17 KB, not stock, nothing recognisable) under restrained blue/violet/pink light. Off in light theme and under reduced transparency.
- Light theme: pearl and porcelain glass with the same hierarchy.
- Motion (built after studying hybridtrader.ai, own implementation): CSS-only entrance sequence that starts at first paint (background → nav → headline lines → copy → actions → product stage in depth), a scroll-linked device that eases from its presentation angle, a perspective light floor that flattens and fades, floating fact chips, all transform/opacity, all off under reduced motion. hybridtrader.ai uses the same kind of stack (Next.js, Motion, CSS keyframes; no GSAP/WebGL): 3D grid floor, gradient-orbit borders, flowing SVG lines, floating chips, scroll reveals.
- Logo and Inter unchanged.

## 8. Implementation plan

| Phase | Deliverable | Depends on |
|---|---|---|
| A | This audit, rollback tag, baseline | done |
| B | v5 tokens + materials + hero + header + dashboard on v5 (branch previews) | **Marek's visual approval** |
| C | Full landing: product walkthrough with scroll-driven focus, feature stories (analysis, account analytics, coach, macro, journal, community), pricing with animated toggle, FAQ, footer, mobile | B approved |
| D | App shell and every route on v5; stylesheet consolidation; shared motion; mobile layouts | B approved |
| E | MetaApi fixes M-1..M-3 and state machine; verify market data, news, calendar, AI; methodology docs for Account Health and any quality score; Fibonacci 88.6% | Marek's next MT5 attempt; Anthropic key for AI |
| F | Stripe: Standard $24 / $195.84, Premium $49 / $399.84, 72 h card-first trial with plan choice, entitlements + account limits (1 vs 2), portal, idempotent webhooks, lifecycle tests in Stripe test mode | Marek's Stripe account (test keys in Vercel), Stripe Tax decision |
| G | Streaming + caching for navigation, bundle work, CSP, AI quotas, Sentry/alerts, admin diagnostics, authorization tests | none |
| H | Release-readiness report: full test suite, devices, screenshots, billing, accessibility | C–G |
| I | Production deploy | **Marek's approval** (this spec overrides the older standing auto-merge) |

## 9. Needed from Marek

1. Visual approval of the v5 previews (or changes).
2. Stripe: an account in test mode with `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` added in Vercel (never in chat), and whether to use Stripe Tax for EU VAT as an Estonian company. VAT treatment and consumer terms need an accountant or lawyer; the code will not claim compliance.
3. Annual prices: $195.84 and $399.84 are exactly 32% off 12 months; confirmed by the spec.
4. Classification of features the spec leaves open: economic calendar, community rooms, chart screenshot analysis, journal exports. Proposed: calendar, community and exports in Standard; chart screenshot analysis in Premium (it is an AI feature).
5. Data licences before paid launch (Twelve Data commercial plan, a licensed news/calendar feed).
6. The purple bull in the sidebar is not in the new reference. Keep it (current locked element) or drop it.
