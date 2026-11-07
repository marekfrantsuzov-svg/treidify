// Automated text-collision QA: renders every Nth frame of the commercial with qa=true and reports any two
// visible text boxes (data-qa) that intersect, plus text that leaves the 40px safe margin.
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path"; import fs from "node:fs";
const every = Number(process.argv[2] || 3);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable: process.env.BROWSER || null });
const inputProps = { qa: true, audio: false };
const composition = await selectComposition({ serveUrl, id: "TreidifyCommercial", puppeteerInstance: browser, inputProps });
const rows = [];
const tmp = fs.mkdtempSync("/tmp/qa-");
await renderFrames({ composition, serveUrl, inputProps, puppeteerInstance: browser, outputDir: tmp, imageFormat: "jpeg", jpegQuality: 30, scale: 0.25, everyNthFrame: every, concurrency: 4,
  onBrowserLog: (l) => { if (l.text.startsWith("QA ")) rows.push(l.text); }, onStart: () => {}, onFrameUpdate: () => {} });
await browser.close({ silent: true });
const bad = []; const offs = []; const multi = {};
for (const r of rows) { const [, f, j] = r.match(/^QA (\d+) (.*)$/); const o = JSON.parse(j); if (o.n > 1) multi[f] = o.ids.join('+'); if (o.hits.length) bad.push(`${f}: ${o.hits.join(", ")}`); if (o.off.length) offs.push(`${f}: ${o.off.join(", ")}`); }
fs.writeFileSync("out/qa-report.txt", `frames checked: ${rows.length}\nframes with 2+ text blocks on screen: ${Object.keys(multi).length}\n${[...new Set(Object.values(multi))].join('\n')}\ncollisions: ${bad.length}\n${bad.join("\n")}\nmargin: ${offs.length}\n${offs.join("\n")}\n`);
console.log("frames", rows.length, "collisions", bad.length, "margin", offs.length);
