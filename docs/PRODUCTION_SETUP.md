# Production setup: keys and accounts

Set these in **Vercel → treidify → Settings → Environment Variables (Production)**, then redeploy. Never commit them or paste them into chat. After a deploy, the "Production smoke check" GitHub workflow prints `/api/health`, which shows which providers are switched on (booleans only).

| Feature | Variables | Where to get them | Cost (checked 2026-11-02) |
| --- | --- | --- | --- |
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud Console → APIs & Services → Credentials → OAuth client (Web). Authorised redirect URI: `https://app.treidify.com/api/auth/callback/google`. Publish the consent screen. | Free |
| Apple sign-in | `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` (and optional `APPLE_APP_BUNDLE_ID`) | Apple Developer → Identifiers → Services ID, domain `app.treidify.com`, return URL `https://app.treidify.com/api/auth/callback/apple`; the secret is a JWT signed with a Sign in with Apple key | Apple Developer Program, $99/yr |
| Market data | `MARKET_DATA_PROVIDER=twelvedata`, `MARKET_DATA_API_KEY`, optional `MARKET_DATA_DXY_SYMBOL` | twelvedata.com | Grow $29–79/mo (internal display); **Venture $499/mo for external display in a commercial app** |
| MT5 sync | `METAAPI_TOKEN` | metaapi.cloud → API token with account management | Regular $30/mo incl. 1 MT account, 7-day trial; usage billed on top |
| News + calendar | `NEWS_PROVIDER=finnhub`, `NEWS_API_KEY` | finnhub.io | Free key is personal/non-commercial and may not include the economic calendar; commercial tiers are expensive, so a licensed alternative may be needed before a paid launch |
| AI | `ANTHROPIC_API_KEY` | console.anthropic.com | Pay per use (Claude Opus 5.5, $4/$20 per million tokens in/out); briefs and desk notes are cached |
| Scheduled jobs | `CRON_SECRET` (Vercel) + the same value as GitHub secret `CRON_SECRET`, GitHub variable `APP_URL=https://app.treidify.com` | any long random string | Free |
| Encryption | `DATA_ENCRYPTION_KEY` | 32 random bytes, base64 | Free |

Without a key, each feature shows a clear "not connected" state and never sample data presented as live.
