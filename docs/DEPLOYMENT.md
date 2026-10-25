# Deploying Treidify web

Updated 2026-10-25. One Next.js deployment serves both the public site and the private platform.

| Host | Serves | Notes |
| --- | --- | --- |
| `treidify.com` | Public website | Requests for `/app`, `/login` and `/signup` are redirected to the app host |
| `www.treidify.com` | Redirect | Permanent redirect to `treidify.com` |
| `app.treidify.com` | Private platform and sign-in | `/` opens `/app`, and marketing paths go back to `treidify.com` |

The routing lives in `web/src/lib/hosts.ts`, which has unit tests, and runs in `web/src/proxy.ts`. If `NEXT_PUBLIC_APP_URL` is empty, or equals the site URL, everything is served from one host. Preview deployments work this way.

## Recommended stack

- **Web:** Vercel. Set the project root to `web/`; the framework preset is Next.js.
- **Database:** Neon Postgres 16. Use the pooled connection string for the app and the direct one for migrations.
- **Workers:** Fly.io, Railway or Render. The workers run account sync and news ingestion. These are long-running processes, so they must not run as Vercel functions. They are not built yet and arrive with the live providers in Phase F.
- **DNS:** Cloudflare, if the domain is registered there.

## 1. Database (Neon)

1. Create a project in the region closest to the users, for example `eu-central-1`.
2. Copy the pooled URL into `DATABASE_URL`, adding `?sslmode=require`.
3. Run the migrations once from your machine or from CI, using the direct URL:

   ```bash
   cd web
   DATABASE_URL="postgres://…direct…?sslmode=require" npm run db:migrate
   ```

## 2. Vercel project

1. Import the GitHub repository and set the root directory to `web`.
2. Add the environment variables below for Production. For Preview, use a separate Neon branch.
3. Deploy. The build runs `next build`; CI already runs typecheck, unit tests, build and the end-to-end journeys.

### Environment variables

Secrets go only into Vercel's environment settings. Never paste them into chat or commit them.

| Variable | Value | Required |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooled URL | yes |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | yes |
| `BETTER_AUTH_URL` | `https://app.treidify.com` | yes |
| `NEXT_PUBLIC_SITE_URL` | `https://treidify.com` | yes |
| `NEXT_PUBLIC_APP_URL` | `https://app.treidify.com` | yes, for the two-host setup |
| `AUTH_COOKIE_DOMAIN` | `treidify.com` | yes, for the two-host setup; it shares the session across hosts |
| `DATA_ENCRYPTION_KEY` | `openssl rand -base64 32` | yes; encrypts any stored connection secret |
| `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_TO` | from Resend | needed for real verification emails |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client | optional |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_APP_BUNDLE_ID` | Apple Sign in with Apple | optional, later |
| `NEXT_PUBLIC_PRICES_FINAL`, `NEXT_PUBLIC_PRICE_MONTHLY`, `NEXT_PUBLIC_PRICE_ANNUAL` | `true` and the prices only after approval | until then the site shows "Price announced at launch" |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | `treidify.com` | optional; Plausible analytics, loaded only after consent |
| `ERROR_WEBHOOK_URL` | an error intake URL | optional; server errors are also written to the Vercel logs as JSON |
| `METAAPI_TOKEN`, `MARKET_DATA_*`, `NEWS_*`, `ANTHROPIC_API_KEY`, `STRIPE_*` | provider keys | Phase F; each feature stays labelled "not connected" until its key is set and its adapter has been tested |

## 3. Domains and DNS

In Vercel, under Project, Settings, Domains, add `treidify.com`, `www.treidify.com` and `app.treidify.com`. Set `www` to redirect to `treidify.com` with a 308 redirect.

In Cloudflare DNS, create the records that Vercel shows for each domain. They are usually these:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| A | `@` | the IP that Vercel shows (commonly `76.76.21.21`) | DNS only (grey cloud) |
| CNAME | `www` | the target that Vercel shows (commonly `cname.vercel-dns.com`) | DNS only |
| CNAME | `app` | the target that Vercel shows | DNS only |

Keep these records on "DNS only" so that Vercel can issue and renew the TLS certificates. If you later want Cloudflare's proxy, set SSL/TLS to "Full (strict)" first.

Add the Resend domain records (SPF, DKIM and the optional DMARC) in the same zone.

## 4. Provider callbacks

| Provider | URL to register |
| --- | --- |
| Google OAuth | `https://app.treidify.com/api/auth/callback/google` |
| Sign in with Apple | `https://app.treidify.com/api/auth/callback/apple` |
| Stripe webhook (Phase F) | `https://app.treidify.com/api/webhooks/billing`. It answers 503 until billing is connected, so Stripe retries instead of losing events |

## 5. After the first deploy

1. Visit `https://www.treidify.com/pricing`. It should land on `https://treidify.com/pricing`.
2. Click Get Started Free. It should open `https://app.treidify.com/signup`.
3. Create an account and verify it by email. This needs Resend.
4. Finish onboarding. You should land on `https://app.treidify.com/app`.
5. Open `https://treidify.com` in the same browser. Log In should take you straight to the app, because the session is shared.
6. Load the demo account under Accounts. Check the Dashboard, Performance and Journal, then remove it.
7. Check the Vercel logs for JSON lines with `"level":"error"`. There should be none.

## Workers (Phase F)

Account sync and news ingestion run as separate always-on services, built on the same database and the interfaces in `web/src/server/integrations/types.ts`:

- **sync worker:** backfills and incrementally syncs deals, positions and snapshots for each connected account. It updates `provider_connection.status` and `last_sync_at`, and writes `sync_run` rows.
- **news worker:** pulls licensed news and the economic calendar into `news_event`, `event_source` and `event_impact`.

Neither worker is deployed yet. The UI says so, and nothing is shown as live.
