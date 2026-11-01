/** Generates public/brand/waves-{light,dark}.svg, the pink-violet silk lines behind the app (reference 1). Run: node scripts/gen-waves.mjs */
import { writeFileSync } from "node:fs";
const OUT = new URL("../public/brand/", import.meta.url).pathname;
function band(n, w, y0, amp, phase, spread) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const off = (k - n / 2) * spread;
    const a = amp * (0.75 + 0.25 * Math.sin(k * 0.35 + phase));
    let d = "";
    for (let x = 0; x <= w; x += 40) {
      const y = y0 + off + a * Math.sin((x / w) * Math.PI * 1.6 + phase + k * 0.045) + a * 0.35 * Math.sin((x / w) * Math.PI * 3.2 + k * 0.09);
      d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`;
    }
    out.push(d);
  }
  return out;
}
const W = 1600, H = 1000;
const TOP = band(24, W, 120, 70, 0.6, 3.4), BOTTOM = band(28, W, 880, 80, 2.4, 3.8);
for (const [name, c1, c2] of [["light", "#c9a8ff", "#f07cc9"], ["dark", "#5b45d6", "#b8559d"]]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="a" x1="0" x2="1"><stop offset="0" stop-color="${c1}" stop-opacity="0"/><stop offset=".45" stop-color="${c1}" stop-opacity=".55"/><stop offset="1" stop-color="${c2}" stop-opacity=".9"/></linearGradient><linearGradient id="b" x1="0" x2="1"><stop offset="0" stop-color="${c2}" stop-opacity=".85"/><stop offset=".6" stop-color="${c1}" stop-opacity=".45"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></linearGradient></defs><g fill="none" stroke-width=".9" vector-effect="non-scaling-stroke"><path stroke="url(#a)" vector-effect="non-scaling-stroke" d="${TOP.join("")}"/><path stroke="url(#b)" vector-effect="non-scaling-stroke" d="${BOTTOM.join("")}"/></g></svg>`;
  writeFileSync(`${OUT}waves-${name}.svg`, svg);
}
