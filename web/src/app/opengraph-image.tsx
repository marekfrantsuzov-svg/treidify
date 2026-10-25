import { ImageResponse } from "next/og";

export const alt = "Treidify: Trade With Intelligence. Not Guesswork.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 88, background: "radial-gradient(900px 500px at 15% 0%, rgba(46,108,255,0.35), transparent 60%), linear-gradient(180deg,#050a18,#02040a)", color: "#eef3fc", fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1, color: "#c7d0dd", display: "flex", alignItems: "center", gap: 10 }}>
          Treidify <span style={{ width: 12, height: 12, borderRadius: 12, background: "#4d8dff" }} />
        </div>
        <div style={{ marginTop: 36, fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>Trade With Intelligence.</div>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02, color: "#7aaaff" }}>Not Guesswork.</div>
        <div style={{ marginTop: 36, fontSize: 30, color: "#b4c0d6" }}>Verified account analytics · Gold & DXY intelligence · AI coaching</div>
      </div>
    ),
    size,
  );
}
