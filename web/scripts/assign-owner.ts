/**
 * Assigns the Treidify owner role to one user ID. Needs DATABASE_URL (database access only; there is no web route
 * for this). Usage: npx tsx scripts/assign-owner.ts <userId> [--replace]
 * Production is already bound (see /api/health accountSync.ownerBound); use --replace only to move the role deliberately.
 */
import { assignOwner } from "../src/server/owner-binding";

const [userId, flag] = process.argv.slice(2);
if (!userId) { console.error("Usage: npx tsx scripts/assign-owner.ts <userId> [--replace]"); process.exit(1); }
assignOwner(userId, { replace: flag === "--replace" })
  .then((u) => { console.log(`Owner is now ${u.id} (${u.email}).`); process.exit(0); })
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
