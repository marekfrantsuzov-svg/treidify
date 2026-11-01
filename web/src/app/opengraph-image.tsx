import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Treidify: Trade With Intelligence. Not Guesswork.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/brand/treidify-t-256.png"))).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 88, background: "radial-gradient(900px 500px at 15% 0%, rgba(83,63,245,0.4), transparent 60%), linear-gradient(180deg,#0c0818,#040308)", color: "#f4f2fa", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1, color: "#d2cce4", display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={72} height={72} alt="" />
          Treidify
        </div>
        <div style={{ marginTop: 36, fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>Trade With Intelligence.</div>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02, color: "#ed74ce" }}>Not Guesswork.</div>
        <div style={{ marginTop: 36, fontSize: 30, color: "#b4c0d6" }}>Verified account analytics · Gold & DXY intelligence · AI coaching</div>
      </div>
    ),
    size,
  );
}
