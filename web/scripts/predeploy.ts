/**
 * Runs before `next build` on Vercel (see web/vercel.json).
 *
 * Production deployments: checks the environment, then applies pending database migrations. If either step
 * fails, the build fails and the previous deployment keeps serving traffic, so a bad config never goes live.
 * Migrations use DATABASE_URL_UNPOOLED (set by the Neon integration) when present, else DATABASE_URL.
 *
 * Preview deployments: no checks and no migrations, unless MIGRATE_PREVIEW=1 (only use that when previews have
 * their own database branch; never point a preview at the production database with it on).
 */
import { spawnSync } from "node:child_process";
import { checkProductionEnv } from "../src/lib/deploy-env";

const target = process.env.VERCEL_ENV ?? (process.env.CI ? "ci" : "local");
const log = (msg: string) => console.log(`[predeploy] ${msg}`);

function migrate() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) { log("No database URL, skipping migrations."); return; }
  log("Applying database migrations…");
  const r = spawnSync("npx", ["drizzle-kit", "migrate"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  if (r.status !== 0) { console.error("[predeploy] Migrations failed. The build stops here and the current deployment stays live."); process.exit(1); }
  log("Migrations are up to date.");
}

if (target === "production") {
  const { errors, warnings } = checkProductionEnv(process.env);
  for (const w of warnings) console.warn(`[predeploy] WARNING: ${w}`);
  if (errors.length) {
    console.error("[predeploy] Production environment is not ready. Fix these in Vercel, Project Settings, Environment Variables (Production):");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  log("Production environment checks passed.");
  migrate();
} else if (target === "preview" && process.env.MIGRATE_PREVIEW === "1") {
  migrate();
} else {
  log(`Target "${target}": no checks or migrations needed.`);
}
