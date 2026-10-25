# Treidify web platform

Next.js 16 (App Router), React 19, strict TypeScript, Tailwind v4, PostgreSQL with Drizzle ORM, Better Auth.

## Run locally

```bash
cd web
npm ci
cp .env.example .env.local        # fill DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_SITE_URL
npm run db:migrate                # applies drizzle/*.sql
npm run dev                       # http://localhost:3000
```

Without `RESEND_API_KEY`, emails (verification, password reset, account deletion) are not sent. In development they
appear at `/dev/outbox`, which returns 404 in production.

To see the dashboard with data before account sync exists, attach a clearly badged sample account to a user:

```bash
npm run seed:sample -- you@example.com   # development only; rows use source = "sample"
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests, including the shared analytics vectors in `../shared/test-vectors` |
| `npm run test:e2e` | Playwright journeys (desktop and mobile) against a running dev server and real database |
| `npm run build` | Production build |
| `npm run db:generate` | Generate a migration after changing `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |

CI (`.github/workflows/web-ci.yml`) runs typecheck, unit tests and build, then the end-to-end journeys against Postgres 16.

## Layout

```
src/app/(marketing)     public site
src/app/(auth)          sign up, sign in, two-step sign-in, password reset
src/app/onboarding      7-step onboarding
src/app/app             signed-in app: dashboard, markets, journal, community, notifications, settings
src/app/api             auth, contact, data export
src/server              auth, database, entitlements (trial), provider status, server actions
src/lib/analytics       deterministic engines (bias, levels, zones, performance, health, periods)
e2e/                    Playwright journeys
scripts/                development-only helpers
```

## Rules the code enforces

- Access is decided on the server (`src/server/entitlements.ts`). The 72-hour trial starts once per account, needs no card and never converts to a paid plan.
- Every external dependency is checked in `src/server/providers.ts`. When one is missing, the UI says so instead of showing sample data as live. Sample data is always badged.
- Privacy settings default to private. Uploaded images are re-encoded with sharp, which strips metadata.
- Users can export all of their data (`/api/account/export`) and delete their account (password or email confirmation).
