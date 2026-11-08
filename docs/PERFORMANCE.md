# Performance (November 2026 pass)

How Treidify stays fast, what was measured, and how to measure again. No design or feature changes were made in this pass.

## Root causes found

1. **Navigation feedback waited for the server.** The sidebar and bottom-nav highlight came from the current URL, which only changes once Next.js commits the new route. With a cold route or a slow server the click looked ignored.
2. **Revisits always went back to the server** after 30 s, and charts re-downloaded their bars on every mount (`/api/market/candles` on each visit to Dashboard, Markets, Analysis, Macro Desk).
3. **Sequential database round trips.** `requireOnboarded` read the profile, then membership; `accountOverview` ran five independent reads one after another; the dashboard's live-account read ran four more in sequence. Each round trip to Neon adds its full network latency.
4. **Market bars were re-read from Postgres on every render** (up to ~40 KB of JSON per series, 8 to 25 series per page) even while the copy was inside the plan's refresh window, and concurrent sections asking for the same series each sent their own read (and provider request).
5. **Loading state was dashboard-shaped for every section**, so content jumped when it arrived.
6. **Landing hero:** the animated product showcase rebuilt itself right after load (a second full render on the main thread), and the hero's largest text faded in from opacity 0, so on a phone its paint waited for scripts. Every first page of a visit also faded in (`.page-in`, app template) before it could paint.

## What changed

| Area | Change |
| --- | --- |
| Shell (`components/app/app-shell.tsx`) | Optimistic active section: the clicked item (sidebar, bottom nav, menu) highlights on the click itself; cleared when the URL changes or after 8 s. |
| Router cache (`next.config.ts`) | `staleTimes.dynamic` 30 s to 60 s: a section visited in the last minute opens from the client cache. Live account values keep their own 30 s polling; freshness labels are computed from bar times. |
| Loading (`app/app/loading.tsx`) | Each section shows its real title, icon and description at once with placeholders shaped like its content. Dashboard keeps its grid placeholder. |
| Session (`server/session.ts`) | Profile and membership read in parallel, memoised per request. |
| Accounts (`server/account-data.ts`, `server/sync/service.ts`) | Independent reads batched with `Promise.all`. |
| DB pool (`server/db/index.ts`) | 5 connections per serverless instance (was 3) so batched reads are not queued. |
| Market data (`server/market/service.ts`) | Per-instance memo of the saved bars, valid only inside the same plan refresh window as the shared database copy; one read and one provider request per series at a time (in-flight sharing). Tests in `multi-asset.test.ts`. |
| Charts (`terminal-chart.tsx`, `intel-chart.tsx`) | Bars this tab already received are shown immediately on remount while inside their refresh window; older copies are never shown, they load fresh. |
| First paint | `.page-in` and the app template fade play only after the first client navigation (`NavMark` in `providers.tsx`). |
| Landing | Showcase no longer rebuilds when it is already on screen at load; the lead paragraph rises without fading from 0; the hero backdrop is preloaded per breakpoint. |
| Health | `/api/health` adds `perf.region` and `perf.dbRttMs` (median of three `select 1`). |

Not changed: XAUUSD 50-pip rule and analysis logic, MetaApi owner/investor rules, auth and membership checks (still read from the database on every request), sample data labelling.

## Measurements (local production build)

Setup: `next build && next start`, Postgres behind a proxy adding 10 ms round trip, market bars pre-seeded locally, one sample MT5 account. Desktop = 1440x900, no throttling. Phone = iPhone 13 profile, 4x CPU slowdown, 150 ms latency, 1.6 Mbit/s. Same scripts on `main` (3c0e024) and this branch. Container rendering is software-only, so absolute numbers are slower than real devices; compare before and after.

Navigation, median ms from click (desktop, 13 sections):

| | before | after |
| --- | --- | --- |
| Highlight on click (first visit) | 89 | 37 |
| Section structure visible (first visit) | 74 | 37 |
| Fully loaded (first visit) | 356 | 342 |
| Revisit, fully loaded | 360 | 40 |

Phone: highlight 83 to 27 ms (first visit), 149 to 24 ms (revisit).

Server render (full HTML, average of 3): Dashboard 547 to 298 ms (DB statements 39 to 18), Markets 270 to 156 (25 to 12), Macro Desk 277 to 202 (26 to 12), Analysis 252 to 150 (23 to 10), Coach 373 to 266, Performance 345 to 231, Journal 429 to 326.

Lighthouse mobile (median of 3): landing 70 to 82 (LCP 4.8 s to 3.8 s, TBT 443 to 258 ms). Desktop landing 96 to 98. Observed phone LCP of the landing hero (DevTools throttling): 5.5 s to 2.0 s. Login and pricing unchanged within noise (89 to 90).

Production before this change (GitHub runner, `perf-prod.yml`): landing mobile 86 (LCP 3.7 s), desktop 99; pricing mobile 94; login mobile 95.

## Remaining bottlenecks

- First visit to a section is bounded by server work plus React's ~300 ms reveal throttle after a loading placeholder. Most of the server time in production is database latency; `/api/health` now reports it.
- Lighthouse's simulated mobile LCP counts the framework scripts (React + Next.js, ~160 KB gzipped) and both variable fonts. Further gains need fewer bytes on the landing page (for example dropping `motion` from the hero's light trails), which is a design-level change.
- Market data on the free Twelve Data plan is limited to 8 requests per minute; cold caches still wait on the provider.

## Measure again

- Production: run the **Production performance check** workflow (Lighthouse + response times from a GitHub runner).
- Health: `curl https://app.treidify.com/api/health` and read `perf`.
