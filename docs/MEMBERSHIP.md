# Membership, waitlist and owner admin panel

## Model (web/src/server/membership)
- `membership` (one row per user): approval status `pending | approved | suspended | revoked`, role `member | admin`, selected plan (intent only), notes.
- `access_grant`: manual access without payment, `trial` or `complimentary`, `essential | premium`, exact UTC `starts_at`/`ends_at` (null = unlimited). At most one open grant per user (unique partial index).
- Billing stays in `entitlement`/`subscription`/`payment` and is written only by the payment webhook. A paid subscription counts on its own, so payments can be switched on later without changing this system.
- `email_notification`: every transactional email with a unique dedupe key and an honest status (`sent` only when the provider returned an id; otherwise `not_configured` or `failed`).
- `feedback`: early-tester feedback with an optional WebP screenshot.
- Every admin change is written to `audit_log` inside the same transaction.

## Rules (rules.ts, unit tested)
Owner → unlimited Premium. Suspended/revoked → no access. Approved + open grant inside its window → that plan. Paid subscription → its plan. Approved with nothing current → expired. Everything else → pending (waitlist).
Checked from the database on every page (`requireOnboarded`), server action (`requireMember`) and API route (`apiMember`). The scheduled sweep only sends emails and tidies statuses.

## Owner
The owner is the single `owner_binding` row (one user ID). No route writes it. Production was already bound; migration 0008 binds the verified owner mailbox only if the slot is empty. To move it: `npx tsx scripts/assign-owner.ts <userId> --replace` with database access. `TREIDIFY_OWNER_USER_ID` can pin it.

## Scheduled job
`GET /api/cron/membership` (Bearer `CRON_SECRET`): hourly via GitHub Actions (web-cron.yml) and daily via Vercel Cron. It also runs (throttled) whenever the app or the admin panel is used.

## Approve a test member
Settings › Members (Admin Panel) › Pending Approval › Manage › choose Complimentary Premium or Free trial › 3/7/14/21/30/90 days, custom days, custom date or unlimited › Approve › Confirm.
