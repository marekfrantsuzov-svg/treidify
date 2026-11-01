const ITEMS = [
  "XAUUSD", "DXY", "XAGUSD", "15M · 1H · 4H zones", "5M confirmation", "50-pip structural stop", "Fibonacci", "Liquidity maps",
  "MT5 read-only sync", "Economic calendar", "P&L calendar", "AI trading coach", "Light and dark",
];

/** A slow marquee of what Treidify covers. Capabilities only: no logos, customer counts or invented stats. */
export function CapabilityStrip() {
  return (
    <div className="lx-strip" aria-label="What Treidify covers">
      <div className="lx-strip-track">
        <ul>{ITEMS.map((t) => <li key={t}>{t}</li>)}</ul>
        <ul aria-hidden>{ITEMS.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
    </div>
  );
}
