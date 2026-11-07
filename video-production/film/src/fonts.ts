import { continueRender, delayRender, staticFile } from "remotion";

// Treidify's own type: Geist (display) and Inter (body), the same files the web app ships.
const faces: [string, string, string][] = [
  ["Geist", "fonts/Geist-Variable.woff2", "100 900"],
  ["Inter", "fonts/inter-latin-wght-normal.woff2", "100 900"],
];
let started = false;
export function loadFonts() {
  if (started || typeof document === "undefined") return;
  started = true;
  const h = delayRender("fonts");
  Promise.all(
    faces.map(([family, file, weight]) => {
      const f = new FontFace(family, `url(${staticFile(file)}) format("woff2")`, { weight });
      return f.load().then((ff) => document.fonts.add(ff));
    }),
  )
    .then(() => continueRender(h))
    .catch((e) => { console.error(e); continueRender(h); });
}
