/**
 * Checks the official macro sources against their real responses (run by .github/workflows/macro-verify.yml on a
 * GitHub runner, which can reach FRED and federalreserve.gov). Prints values and dates only, never keys.
 */
import { US_RELEASES, compute, fmtLine, latestDate, lineAt } from "../src/server/macro/calc";
import { fred } from "../src/server/macro/fred";
import { addDays, isoDay, zonedToUtc } from "../src/lib/time/zoned";

const key = process.env.FRED_API_KEY?.trim() || null;
const c = fred(key);
const start = "2024-01-01";
const today = isoDay(Date.now());
let failures = 0;
const fail = (m: string) => { failures++; console.log(`  FAIL ${m}`); };

async function main() {
  console.log(`FRED key present: ${Boolean(key)}`);
  console.log("\n== Series (public CSV) ==");
  const ids = [...new Set([...US_RELEASES.flatMap((r) => r.lines.map((l) => l.series)), "DFEDTARL", "CPIAUCNS"])];
  for (const id of ids) {
    try {
      const obs = (await c.csv(id, start, 0)).filter((o) => o.value !== null);
      const last = obs.at(-1), prev = obs.at(-2);
      console.log(`  ${id.padEnd(16)} ${obs.length} obs · last ${last?.date}=${last?.value} · prev ${prev?.date}=${prev?.value}`);
      if (!last) fail(`${id}: no observations`);
    } catch (e) { fail(`${id}: ${(e as Error).message}`); }
  }
  const cpi = new Map((await c.csv("CPIAUCNS", start, 0)).map((o) => [o.date, o.value]));
  const l = latestDate(cpi)!;
  console.log(`\nCPI y/y ${l}: ${fmtLine(compute(cpi, l, "pct_yoy"), { digits: 1, unit: "%", t: "pct_yoy" })}`);

  console.log("\n== FRED release ids ==");
  for (const r of US_RELEASES) {
    try {
      const res = await fetch(`https://fred.stlouisfed.org/release?rid=${r.releaseId}`);
      const title = (await res.text()).match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
      console.log(`  rid ${String(r.releaseId).padEnd(4)} ${r.id.padEnd(7)} → ${res.status} ${title}`);
    } catch (e) { fail(`release ${r.releaseId}: ${(e as Error).message}`); }
  }

  console.log("\n== Federal Reserve FOMC calendar page ==");
  try {
    const html = await (await fetch("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm")).text();
    const i = html.indexOf("2026 FOMC Meetings");
    const seg = html.slice(i, i + 12000).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    console.log(`  2026 section found: ${i >= 0}`);
    console.log(`  ${seg.slice(0, 900)}`);
    const j = html.indexOf("2027 FOMC Meetings");
    console.log(`  2027 section found: ${j >= 0}`);
    if (j >= 0) console.log(`  ${html.slice(j, j + 12000).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 700)}`);
  } catch (e) { fail(`fomc page: ${(e as Error).message}`); }

  if (!key) { console.log("\nNo FRED_API_KEY on this runner: API checks skipped."); return; }
  console.log("\n== FRED API: schedule and vintages ==");
  const from = addDays(today, -10), to = addDays(today, 10);
  for (const r of US_RELEASES) {
    const dates = await c.releaseDates(r.releaseId, from, to, 0);
    console.log(`  ${r.id}: ${dates.join(", ") || "none in window"}`);
    for (const d of dates) {
      const when = zonedToUtc(d, r.timeEt, "America/New_York");
      if (r.id === "fomc") { console.log(`    ${d} ${when.toISOString()} Tallinn ${when.toLocaleString("en-GB", { timeZone: "Europe/Tallinn" })}`); continue; }
      for (const ln of r.lines) {
        const rows = await c.vintages(ln.series, addDays(from, -800), addDays(from, -3), 0);
        const v = lineAt(rows, ln, d, today);
        console.log(`    ${d} ${ln.title.padEnd(28)} Tallinn ${when.toLocaleString("en-GB", { timeZone: "Europe/Tallinn" })} · ${JSON.stringify(v)}`);
      }
    }
  }
}

main().then(() => { console.log(`\nfailures: ${failures}`); process.exit(failures ? 1 : 0); }, (e) => { console.error(e); process.exit(1); });
