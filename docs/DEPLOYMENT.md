# Deploying Treidify web

Updated 2026-10-31. One Next.js deployment serves both the public website and the private trading platform.
Below, `example.com` stands for the domain you bought. Replace it everywhere with the real one.

| Host | Serves | Notes |
| --- | --- | --- |
| `example.com` | Public website | Requests for `/app`, `/login` and `/signup` are redirected to the app host |
| `www.example.com` | Redirect | Permanent redirect to `example.com` |
| `app.example.com` | Private platform and sign-in | `/` opens `/app`, and marketing paths go back to `example.com` |

The routing lives in `web/src/lib/hosts.ts` (unit tested) and runs in `web/src/proxy.ts`. If `NEXT_PUBLIC_APP_URL` is
empty, or equals the site URL, everything is served from one host. Preview deployments work this way.

## Architecture (audited 2026-10-31)

| Layer | What the repo uses | Production home |
| --- | --- | --- |
| Website and app | Next.js 16 App Router, React 19, TypeScript, Tailwind v4, in `web/` | **Vercel** (native Next.js host, no changes needed) |
| Backend | Next.js route handlers and server actions in the same app (`web/src/app/api`, `web/src/server`) | Vercel Functions, same deployment |
| Database | PostgreSQL 14+ via Drizzle ORM; migrations in `web/drizzle` | **Neon** Postgres (serverless, free tier, Vercel integration) |
| Auth | Better Auth: email and password with verification, TOTP two-step, Google and Apple when configured | Inside the app; sessions stored in Postgres |
| Email | Resend HTTP API | Resend, with the domain verified |
| Python backend (`backend/`) | FastAPI analytics prototype for the paused native app | Not deployed; the web app does not call it |
| Workers (account sync, news) | Not built yet (Phase F) | Fly.io, Railway or Render later; they must not run as Vercel functions |

## What happens on every deploy

- `web/vercel.json` makes Vercel run `npm ci`, then `npm run build:vercel`.
- `build:vercel` runs `scripts/predeploy.ts` first. On **production** builds it:
  1. checks every required variable (https URLs, secret lengths, the cookie domain matching both hosts, no
     secret-looking `NEXT_PUBLIC_` variable, the dev outbox off). The rules are in `web/src/lib/deploy-env.ts`.
  2. applies pending database migrations, using `DATABASE_URL_UNPOOLED` when present (the Neon integration sets it).
  If either step fails, the build fails and **the previous deployment keeps serving traffic**.
- Preview builds skip both steps unless `MIGRATE_PREVIEW=1` is set. Only set that when previews have their own
  database branch.
- GitHub Actions (`.github/workflows/web-ci.yml`) runs typecheck, unit tests, the build and the end-to-end journeys on
  every push and pull request.
- `GET /api/health` returns `200` with `{"ok":true,"database":"up",…}` when the deployment can reach the database.
  It reports only booleans and the commit hash, never a variable's value.

## 1. Database (Neon)

Easiest path: in Vercel, open the project, then **Storage**, **Create Database**, **Neon**. Connect it to the project
for Production. Vercel then sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` itself, and no connection string ever
passes through chat or a file.

If you create Neon separately instead: pick the region closest to your users (for example `aws-eu-central-1`), then
paste the **pooled** URL into Vercel as `DATABASE_URL` and the **direct** URL as `DATABASE_URL_UNPOOLED`, both
ending in `?sslmode=require`.

Set the Vercel Functions region to match the database: **Settings**, **Functions**, **Function Region**
(for example Frankfurt `fra1` for `eu-central-1`).

## 2. Vercel project

1. **Add New**, **Project**, then import `marekfrantsuzov-svg/treidify` from GitHub.
2. **Root Directory:** `web`. Framework: Next.js (detected). Leave the build and install commands as they are;
   `web/vercel.json` sets them.
3. **Production Branch:** `main` (Settings, Git). Every merge to `main` deploys to production. Every other branch and
   pull request gets its own preview URL.
4. Add the environment variables below under **Settings**, **Environment Variables**, scoped to **Production**.
5. Deploy.

### Environment variables

Enter secrets only in Vercel's dashboard. Never paste them into chat, and never commit them.
Variables prefixed `NEXT_PUBLIC_` are visible in the browser, so they hold URLs and flags only; the build refuses a
`NEXT_PUBLIC_` name that looks like a secret.

| Variable | Value | Required |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooled URL (set by the integration) | yes |
| `DATABASE_URL_UNPOOLED` | Neon direct URL (set by the integration), used for migrations | recommended |
| `BETTER_AUTH_SECRET` | output of `openssl rand -base64 32` | yes |
| `BETTER_AUTH_URL` | `https://app.example.com` | yes |
| `NEXT_PUBLIC_SITE_URL` | `https://example.com` | yes |
| `NEXT_PUBLIC_APP_URL` | `https://app.example.com` | yes, for the two-host setup |
| `AUTH_COOKIE_DOMAIN` | `example.com` | yes, for the two-host setup; shares the session across both hosts |
| `DATA_ENCRYPTION_KEY` | another `openssl rand -base64 32` (different from the auth secret) | yes |
| `RESEND_API_KEY` | from Resend | needed before anyone can register (verification email) |
| `EMAIL_FROM` | `Treidify <noreply@example.com>` | with Resend |
| `CONTACT_TO` | the inbox for the contact form | with Resend |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client | optional |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_APP_BUNDLE_ID` | Sign in with Apple | optional, later |
| `NEXT_PUBLIC_PRICES_FINAL`, `NEXT_PUBLIC_PRICE_MONTHLY`, `NEXT_PUBLIC_PRICE_ANNUAL` | `true` and the prices, only after approval | until then the site shows "Price announced at launch" |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | `example.com` | optional; Plausible, loaded only after consent |
| `ERROR_WEBHOOK_URL` | an error intake URL | optional; errors also go to the Vercel logs as JSON |
| `METAAPI_TOKEN`, `MARKET_DATA_*`, `NEWS_*`, `ANTHROPIC_API_KEY`, `STRIPE_*` | provider keys | Phase F; each feature stays labelled "not connected" until its key is set and its adapter is tested |

Do **not** add `NEXT_PUBLIC_APP_URL` or `AUTH_COOKIE_DOMAIN` to the Preview environment. Preview URLs live on
`*.vercel.app`, where a cookie for `example.com` would be rejected and sign-in would fail.

## 3. Connect the domain

### In Vercel

**Settings**, **Domains**, then add all three: `example.com`, `www.example.com` and `app.example.com`. When Vercel
asks, choose to redirect `www.example.com` to `example.com`. Vercel then lists the exact DNS records each one needs.

### At your registrar (or Cloudflare, if the domain's nameservers point there)

Open the DNS settings for the domain. First delete any parking or "URL forwarding" records the registrar created for
`@` and `www`. Then add:

| Type | Name / Host | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | the IP Vercel shows for the apex (commonly `76.76.21.21`) | Auto or 3600 |
| CNAME | `www` | the target Vercel shows (commonly `cname.vercel-dns.com`) | Auto or 3600 |
| CNAME | `app` | the target Vercel shows (commonly `cname.vercel-dns.com`) | Auto or 3600 |

Use the values Vercel shows if they differ; newer projects can get a project-specific IP and target.

- **Cloudflare:** set all three records to **DNS only** (grey cloud), so Vercel can issue and renew certificates.
- **CAA records:** if the zone has any, add `0 issue "letsencrypt.org"` or certificates cannot be issued.
- **Email:** later, add the SPF, DKIM and DMARC records that Resend shows, in the same zone. They do not conflict
  with the records above.

### HTTPS

Vercel issues and renews TLS certificates automatically once each record resolves, normally within minutes. HTTP
redirects to HTTPS, and the app sends HSTS. There is nothing to buy or upload.

### Verify

1. In Vercel, **Domains** should show **Valid Configuration** for all three names.
2. From a terminal (or dnschecker.org):

   ```bash
   dig +short A example.com          # the Vercel IP
   dig +short CNAME www.example.com  # the Vercel target
   dig +short CNAME app.example.com  # the Vercel target
   curl -sI https://www.example.com/pricing | grep -i location   # https://example.com/pricing
   curl -s https://app.example.com/api/health                    # {"ok":true,"database":"up",…}
   ```

DNS changes usually show within minutes, but can take up to 48 hours on some registrars.

## 4. Provider callbacks

| Provider | URL to register |
| --- | --- |
| Google OAuth | `https://app.example.com/api/auth/callback/google` |
| Sign in with Apple | `https://app.example.com/api/auth/callback/apple` |
| Stripe webhook (Phase F) | `https://app.example.com/api/webhooks/billing`. It answers 503 until billing is connected, so Stripe retries instead of losing events |

## 5. Smoke test after the first deploy

1. `https://www.example.com/pricing` lands on `https://example.com/pricing`.
2. Get Started Free opens `https://app.example.com/signup`.
3. Create an account and confirm it from the email (needs Resend).
4. Finish onboarding; you land on `https://app.example.com/app`.
5. Open `https://example.com` in the same browser. Log In goes straight to the app, because the session is shared.
6. Under Accounts, load the demo account. Check Dashboard, Performance and Journal on desktop and phone, then remove it.
7. In Vercel, **Logs**, filter for `"level":"error"`. There should be none.

## Rolling back

In Vercel, **Deployments**, open the last good one and choose **Promote to Production** (instant). Keep migrations
additive (add tables and columns; drop old ones only in a later release), so the previous version keeps working on
the newer schema.

## Workers (Phase F)

Account sync and news ingestion run as separate always-on services on the same database, against the interfaces in
`web/src/server/integrations/types.ts`. Neither is deployed yet; the UI says so, and nothing is shown as live.
