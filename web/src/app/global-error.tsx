"use client";

import { useEffect } from "react";

/** Last-resort boundary when the root layout itself fails. Plain HTML, no providers. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/client-error", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: error.message.slice(0, 500), digest: error.digest, path: location.pathname, where: "global" }) }).catch(() => {});
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#05070d", color: "#e8edf7" }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 22 }}>Treidify could not load.</h1>
          <p style={{ opacity: 0.75 }}>The error has been logged.{error.digest ? ` Reference ${error.digest}.` : ""}</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 999, border: 0, background: "#3b82f6", color: "white", fontWeight: 600 }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
