# MetaApi account sync: setup, security and costs

Treidify connects MetaTrader 4 and 5 accounts through [MetaApi](https://metaapi.cloud) and only ever **reads** them.

## What you configure

### MetaApi (app.metaapi.cloud)

1. Sign up and start the plan's **7-day trial** (one trial per account, plus a $5 sign-up bonus). Nothing in Treidify
   needs a paid plan until the trial ends.
2. **API access → Generate token.** Use a token that can manage accounts (provisioning) and read account data (MetaApi
   REST API). Treidify never calls a trading endpoint, so trading permission is not needed if the token form lets you
   narrow it.
3. You do **not** add accounts in MetaApi by hand. Treidify creates them when a user connects (type `cloud-g2`, which is
   required because only G2 reports whether the investor password was used).

### Vercel (Project → Settings → Environment Variables → Production)

| Variable | Value | Required |
|---|---|---|
| `METAAPI_TOKEN` | The MetaApi token. `METAAPI_API_KEY`, `METAAPI_API_TOKEN`, `METAAPI_KEY` are also accepted. | Yes |
| `TREIDIFY_OWNER_USER_ID` | Not needed. Only to pin the owner to a specific account ID by hand. | No |
| `TREIDIFY_OWNER_EMAIL` | Not needed. The owner email is built in (`marekfrantsuzov@gmail.com`); set this only to change it. | No |
| `CRON_SECRET` | Any long random string. Also add it as a GitHub repository secret `CRON_SECRET`, and add a repository variable `APP_URL` = `https://app.treidify.com`, so the 10-minute background sync runs. | For background sync |
| `METAAPI_MAX_ACCOUNTS` | Total MetaApi accounts Treidify may hold (cost cap). Default 5. | Optional |
| `METAAPI_MAX_ACCOUNTS_PER_USER` | Per normal user. Default 3. | Optional |
| `METAAPI_MAX_ACCOUNTS_OWNER` | For the owner. Default 10. | Optional |
| `METAAPI_RELIABILITY` | `regular` (default, cheaper) or `high` (MetaApi's recommendation for production uptime). | Optional |

After changing variables, **redeploy** (Deployments → ⋯ → Redeploy). `https://app.treidify.com/api/health` then shows
`providers.sync: true`, `accountSync.tokenVar` (the variable name it found, never the value) and
`accountSync.ownerBound` (true once the owner has signed in with the verified owner email).

### Owner and users: nothing to configure per person

- **Owner.** Sign up or sign in at app.treidify.com as `marekfrantsuzov@gmail.com` (Google sign-in, or email and the
  verification link). On that verified account's first visit, Treidify binds the owner role to its permanent account ID
  in the database. **Settings → Security** then says "Owner access is active". No Vercel or GitHub change is involved.
- **Everyone else** signs up with Google or email and connects their own MetaTrader account from **Accounts** with the
  investor password. Each user sees only their own accounts.

## Security model

- **Owner rights** belong to exactly one account: the first account whose **verified** email is the owner email
  (Gmail dots and +tags count as the same inbox). It is bound by its immutable user ID in a single-row database slot,
  so no later account, even one on the same inbox, can take or share it, and an admin "impersonate user" session never
  gets owner rights. The bound owner also loses the rights if their email stops matching. Identity and verification
  always come from the database, never from the browser, and the role is separate from the admin role tools.
- **Normal users can only submit an investor password.** The server refuses the "master" option for anyone but the
  owner before anything is sent to MetaApi.
- **Proof, not labels.** After MetaApi connects, Treidify reads `investorMode` from the account information. A normal
  user's connection is accepted only when it is exactly `true`. `false` (a master password typed into the investor
  field) or missing are refused: the MetaApi account, including the password MetaApi holds, is deleted immediately, and
  no balance, position or deal is stored. The check repeats on every sync and live refresh.
- **The owner** may connect with a master password. The account is labelled "Master (owner) · read-only use".
- **Treidify never trades.** The MetaApi client has no trade, modify or close method, and a test fails the build if
  one is added or any code calls a MetaApi trade endpoint.
- **Passwords** go from Treidify's server to MetaApi over TLS. They are never stored in Treidify's database, never
  logged (error text is redacted), and never sent back to the browser. MetaApi holds them; **Disconnect** deletes the
  MetaApi account and with it the stored password. **Delete** also removes all synced data from Treidify.
- Every account operation and API route is authenticated and scoped to the signed-in user's own accounts. Another
  user's account ID behaves exactly like a missing one.
- Rate limits: 5 connection attempts per user per hour, 12 manual syncs per hour, 30 live refreshes per minute, and
  MetaApi is called at most once every 20 seconds per account for live values.

## Freshness, stated exactly

- Balance, equity, floating P&L and open positions **refresh every 30 seconds while a dashboard is open**.
- Closed-trade history syncs every 10 minutes in the background (GitHub Actions calls `/api/cron/sync`), when a
  dashboard is open and the last sync is over 5 minutes old, and on **Sync now**.
- This is polling over MetaApi's REST API, not streaming. The dashboard shows "Updated N s ago" and warns when figures
  are more than 15 minutes old.

## Costs and limits (checked 2026-11-02 on metaapi.cloud)

- **Regular**: $30/month, includes one MT account. **Extended**: $100/month (dedicated servers, priority support).
  Both have a one-time 7-day trial and a $5 sign-up bonus. Business is quoted for 250+ accounts.
- Each **additional connected account is billed pay-as-you-go per account-hour** on top of the plan. MetaApi's site
  does not publish the hourly rate on the pricing page right now; check the cost estimator in the MetaApi app before
  opening sign-ups. `METAAPI_MAX_ACCOUNTS` caps how many Treidify can create.
- `high` reliability runs redundant servers and costs more than `regular`.
- REST rate limits are counted in CPU credits (base 1,000/s, 6,000/min per application, scaling with deployed
  accounts). Deal-history calls cost 75 credits plus 0.65 per deal returned. Treidify's load (one info and one
  positions call per open dashboard every 30 s, history every 10 min) stays far below this.
