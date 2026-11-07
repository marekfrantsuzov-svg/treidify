// Renders QA stills of selected frames with a single bundle:  node stills.mjs out_dir 100 300 460 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
const [out, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable: process.env.BROWSER || null });
const composition = await selectComposition({ serveUrl, id: "TreidifyStill", puppeteerInstance: browser });
for (const fr of frames) {
  await renderStill({ composition, serveUrl, frame: Number(fr), output: path.join(out, `f${String(fr).padStart(4, "0")}.jpg`), imageFormat: "jpeg", jpegQuality: 80, puppeteerInstance: browser, scale: Number(process.env.SCALE || 0.5) });
  console.log("still", fr);
}
await browser.close({ silent: true });
