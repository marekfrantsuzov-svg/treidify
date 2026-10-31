/**
 * Production environment preflight. Runs before every production build (scripts/predeploy.ts), so a
 * misconfigured deployment fails to build and the previous version stays live, instead of going out broken.
 * Pure function, no I/O, so it is unit tested.
 */

export interface EnvReport { errors: string[]; warnings: string[] }

type Env = Record<string, string | undefined>;

const httpsHost = (value: string | undefined): string | null => {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.host : null;
  } catch {
    return null;
  }
};

/** Names a browser bundle must never carry: anything prefixed NEXT_PUBLIC_ is inlined into frontend code. */
const SECRET_NAME = /(SECRET|TOKEN|PASSWORD|PRIVATE|API_KEY|DATABASE_URL|DSN)/;

export function checkProductionEnv(env: Env): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const need = (name: string, why: string) => { if (!env[name]?.trim()) errors.push(`${name} is not set (${why}).`); };

  need("DATABASE_URL", "Postgres connection string");
  need("BETTER_AUTH_SECRET", "signs sessions; generate with: openssl rand -base64 32");
  need("BETTER_AUTH_URL", "public URL where sign-in lives");
  need("NEXT_PUBLIC_SITE_URL", "public website URL");
  need("DATA_ENCRYPTION_KEY", "encrypts stored connection secrets; generate with: openssl rand -base64 32");

  if (env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length < 32) errors.push("BETTER_AUTH_SECRET must be at least 32 characters.");
  if (env.DATA_ENCRYPTION_KEY && Buffer.from(env.DATA_ENCRYPTION_KEY, "base64").length !== 32) errors.push("DATA_ENCRYPTION_KEY must be 32 bytes, base64 encoded.");

  const site = httpsHost(env.NEXT_PUBLIC_SITE_URL);
  const authHost = httpsHost(env.BETTER_AUTH_URL);
  if (env.NEXT_PUBLIC_SITE_URL && !site) errors.push("NEXT_PUBLIC_SITE_URL must be a full https:// URL.");
  if (env.BETTER_AUTH_URL && !authHost) errors.push("BETTER_AUTH_URL must be a full https:// URL.");
  if (env.DATABASE_URL && !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) errors.push("DATABASE_URL must start with postgres:// or postgresql://.");

  const appRaw = env.NEXT_PUBLIC_APP_URL?.trim();
  const app = appRaw ? httpsHost(appRaw) : null;
  if (appRaw && !app) errors.push("NEXT_PUBLIC_APP_URL must be a full https:// URL, or empty for a single host.");

  if (app && site && app !== site) {
    // Two-host setup: site on the main domain, platform on app.<domain>.
    const cookie = env.AUTH_COOKIE_DOMAIN?.trim().replace(/^\./, "");
    if (!cookie) errors.push("AUTH_COOKIE_DOMAIN must be set to the main domain so the session is shared between the site and the app.");
    else if (![site, app].every((h) => h === cookie || h.endsWith(`.${cookie}`)))
      errors.push(`AUTH_COOKIE_DOMAIN (${cookie}) must be the parent domain of both ${site} and ${app}.`);
    if (authHost && authHost !== app) errors.push(`BETTER_AUTH_URL should point at the app host (${app}), where sign-in lives.`);
  } else if (env.AUTH_COOKIE_DOMAIN?.trim() && site) {
    const cookie = env.AUTH_COOKIE_DOMAIN.trim().replace(/^\./, "");
    if (site !== cookie && !site.endsWith(`.${cookie}`)) errors.push(`AUTH_COOKIE_DOMAIN (${cookie}) does not match the site host ${site}; sign-in cookies would be rejected.`);
  }

  if (env.DEV_OUTBOX === "1") errors.push("DEV_OUTBOX must not be enabled in production; it would swallow verification emails.");

  for (const name of Object.keys(env)) {
    if (name.startsWith("NEXT_PUBLIC_") && SECRET_NAME.test(name.slice("NEXT_PUBLIC_".length)))
      errors.push(`${name} looks like a secret, but NEXT_PUBLIC_ variables are shipped to every browser. Rename it without the NEXT_PUBLIC_ prefix.`);
  }

  if (!env.RESEND_API_KEY?.trim())
    warnings.push("RESEND_API_KEY is not set: sign-up, password reset and account deletion cannot send their emails, so new users cannot finish registering.");
  if (env.NEXT_PUBLIC_PRICES_FINAL === "true" && !(env.NEXT_PUBLIC_PRICE_MONTHLY && env.NEXT_PUBLIC_PRICE_ANNUAL))
    warnings.push("NEXT_PUBLIC_PRICES_FINAL is true but the prices are not both set; the site keeps showing \"Price announced at launch\".");

  return { errors, warnings };
}
