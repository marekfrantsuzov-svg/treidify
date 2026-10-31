import { cn } from "@/lib/cn";

/**
 * Treidify glass icon system. Every glyph is drawn here (no icon library) on a 24-unit grid, then
 * rendered as a translucent body, a luminous rim and a specular highlight, so light appears to
 * pass through it. Gradients are defined once in <GlassIconDefs/> and follow the active theme.
 */
export type GlassIconName =
  | "dashboard" | "macro" | "markets" | "news" | "ai" | "journal" | "coach" | "community" | "calendar"
  | "settings" | "profile" | "bell" | "search" | "upload" | "shield" | "link" | "spark" | "more" | "gold" | "dollar" | "yield" | "silver";

function gear() {
  const teeth = 8, rOut = 9.4, rIn = 7.2, cx = 12, cy = 12;
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? rOut : rIn;
    const pad = i % 2 === 0 ? 0.09 : 0.02;
    pts.push(`${(cx + r * Math.cos(a0 + pad)).toFixed(2)} ${(cy + r * Math.sin(a0 + pad)).toFixed(2)}`, `${(cx + r * Math.cos(a1 - pad)).toFixed(2)} ${(cy + r * Math.sin(a1 - pad)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z M12 8.6a3.4 3.4 0 1 0 0 6.8a3.4 3.4 0 1 0 0-6.8Z`;
}
const GEAR = gear();

/** Filled body shapes (evenodd) and optional detail strokes for each glyph. */
const GLYPHS: Record<GlassIconName, { body: string; detail?: string }> = {
  dashboard: { body: "M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v6A1.5 1.5 0 0 1 9.5 13h-4A1.5 1.5 0 0 1 4 11.5Z M13 5.5A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v2A1.5 1.5 0 0 1 18.5 9h-4A1.5 1.5 0 0 1 13 7.5Z M13 12.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5Z M4 16.5A1.5 1.5 0 0 1 5.5 15h4a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5Z" },
  macro: { body: "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17Z", detail: "M3.8 12h16.4 M12 3.6c2.6 2.4 3.6 5.3 3.6 8.4s-1 6-3.6 8.4 M12 3.6C9.4 6 8.4 8.9 8.4 12s1 6 3.6 8.4 M5.4 7.6h13.2 M5.4 16.4h13.2" },
  markets: { body: "M5 8.5A1 1 0 0 1 6 7.5h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z M10.5 5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1Z M16 10a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1Z", detail: "M7 5v2.5 M7 15.5V19 M12.5 2.8v1.7 M12.5 15.5v4 M18 6.5V9 M18 15.5V18" },
  news: { body: "M3.5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12.5a1.5 1.5 0 0 1-1.5 1.5H5.5a2 2 0 0 1-2-2Z M18.5 8.5h1a1 1 0 0 1 1 1v8.5a2 2 0 0 1-2 2Z", detail: "M6.5 8h8 M6.5 11.5h8 M6.5 15h5" },
  ai: { body: "M11 3.5c.5 3.7 2.3 5.6 6 6.1c-3.7.5-5.5 2.4-6 6.1c-.5-3.7-2.3-5.6-6-6.1c3.7-.5 5.5-2.4 6-6.1Z M17.5 14c.25 1.9 1.1 2.8 3 3c-1.9.25-2.75 1.1-3 3c-.25-1.9-1.1-2.75-3-3c1.9-.2 2.75-1.1 3-3Z" },
  journal: { body: "M6 3.5h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 6 3.5Z", detail: "M8 3.6v16.8 M11 8h5 M11 11h5 M13.5 3.6v5l1.25-1 1.25 1v-5" },
  coach: { body: "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17Z", detail: "M12 7.2a4.8 4.8 0 1 0 0 9.6a4.8 4.8 0 1 0 0-9.6Z M12 10.6a1.4 1.4 0 1 0 0 2.8a1.4 1.4 0 1 0 0-2.8Z M14 10l4.5-4.5 M16.5 5.5h2v2" },
  community: { body: "M9 4.5a3.25 3.25 0 1 0 0 6.5a3.25 3.25 0 1 0 0-6.5Z M2.8 18.2c.6-3.3 3.1-5.2 6.2-5.2s5.6 1.9 6.2 5.2c.15.8-.45 1.3-1.2 1.3H4c-.75 0-1.35-.5-1.2-1.3Z M16.2 6a2.6 2.6 0 1 1 0 5.2 M17.4 13.4c2.1.5 3.5 2 3.9 4.3c.1.6-.3 1.1-.9 1.1h-2.1" },
  calendar: { body: "M4 7.5a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 7.5v10a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5Z", detail: "M4.2 9.5h15.6 M8.5 3.2v3.6 M15.5 3.2v3.6 M8 13h.01 M12 13h.01 M16 13h.01 M8 16.5h.01 M12 16.5h.01" },
  settings: { body: GEAR },
  profile: { body: "M12 3.8a4 4 0 1 0 0 8a4 4 0 1 0 0-8Z M4.3 19c.8-3.8 3.8-5.8 7.7-5.8s6.9 2 7.7 5.8c.15.7-.4 1.2-1.1 1.2H5.4c-.7 0-1.25-.5-1.1-1.2Z" },
  bell: { body: "M12 3.5a5.6 5.6 0 0 0-5.6 5.6v3.2c0 1-.4 2-1.1 2.7l-.6.6c-.6.6-.2 1.6.7 1.6h13.2c.9 0 1.3-1 .7-1.6l-.6-.6c-.7-.7-1.1-1.7-1.1-2.7V9.1A5.6 5.6 0 0 0 12 3.5Z", detail: "M9.8 19.5a2.3 2.3 0 0 0 4.4 0" },
  search: { body: "M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13Z", detail: "M15.4 15.4l4.6 4.6" },
  upload: { body: "M4.5 14.5v2.5a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-2.5h-2v2.5a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5v-2.5Z M12 4l4.5 4.5h-3v6h-3v-6h-3Z" },
  shield: { body: "M12 3.2l7 2.8v5.4c0 4.4-2.9 7.8-7 9.4c-4.1-1.6-7-5-7-9.4V6Z", detail: "M8.8 12.2l2.2 2.2l4.3-4.6" },
  link: { body: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-.9.9 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l.9-.9" },
  spark: { body: "M12 3l1.8 5.6L19.5 10l-5.7 1.5L12 17l-1.8-5.5L4.5 10l5.7-1.4Z" },
  more: { body: "M6 10.2a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 1 0 0-3.6Z M12 10.2a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 1 0 0-3.6Z M18 10.2a1.8 1.8 0 1 0 0 3.6a1.8 1.8 0 1 0 0-3.6Z" },
  gold: { body: "M3.5 17.5l2.6-6h5.8l2.6 6Z M9.6 10.5l2.6-6h5.8l2.6 6Z" },
  dollar: { body: "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17Z", detail: "M14.6 9.2c-.4-1-1.4-1.6-2.6-1.6c-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2s2.8.9 2.8 2.2s-1.2 2.1-2.8 2.1c-1.3 0-2.4-.6-2.8-1.7 M12 6.2v1.4 M12 16v1.6" },
  yield: { body: "M4 18.5h16 M5 15l4-4 3 2.6 6.5-6.6", detail: "M15.2 7h3.3v3.3" },
  silver: { body: "M12 3.5l7.5 4.3v8.4L12 20.5l-7.5-4.3V7.8Z", detail: "M12 3.6v16.8 M4.6 7.8L12 12l7.4-4.2" },
};

const STROKE_ONLY = new Set<GlassIconName>(["link", "yield"]);
/** Glyphs whose detail strokes extend past the body; those draw in accent so they stay visible on light glass. */
const DETAIL_OUTSIDE = new Set<GlassIconName>(["markets", "bell", "search", "coach", "calendar", "yield"]);

/** One shared set of gradients; mount once near the root. */
export function GlassIconDefs() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <linearGradient id="gi-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--gi-top, #8d7cff)" }} />
          <stop offset="1" style={{ stopColor: "var(--gi-bottom, #4a34e8)" }} />
        </linearGradient>
        <linearGradient id="gi-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.5" style={{ stopColor: "var(--gi-rim-mid, #d9b8ff)" }} />
          <stop offset="1" style={{ stopColor: "var(--gi-bottom, #533ff5)" }} />
        </linearGradient>
        <linearGradient id="gi-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="gi-top-half"><rect x="0" y="0" width="24" height="11.5" /></clipPath>
      </defs>
    </svg>
  );
}

export function Glyph({ name, size = 20, className }: { name: GlassIconName; size?: number; className?: string }) {
  const g = GLYPHS[name];
  const strokeOnly = STROKE_ONLY.has(name);
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={cn("relative z-[2] overflow-visible", className)} aria-hidden>
      {strokeOnly ? (
        <path d={g.body} fill="none" stroke="url(#gi-body)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <path d={g.body} fill="url(#gi-body)" fillRule="evenodd" opacity="0.92" />
          <path d={g.body} fill="none" stroke="url(#gi-rim)" strokeWidth="0.9" strokeLinejoin="round" opacity="0.9" />
          <path d={g.body} fill="url(#gi-shine)" fillRule="evenodd" clipPath="url(#gi-top-half)" opacity="0.7" />
        </>
      )}
      {g.detail && <path d={g.detail} fill="none" stroke={DETAIL_OUTSIDE.has(name) ? "var(--gi-detail-out, var(--accent))" : "var(--gi-detail, #ffffff)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />}
    </svg>
  );
}

/** A glyph seated in a rounded glass tile. `active` lights the tile in Treidify violet. */
export function GlassIcon({ name, size = 36, active, className, label }: { name: GlassIconName; size?: number; active?: boolean; className?: string; label?: string }) {
  return (
    <span
      className={cn("glass-icon", active && "is-active", className)}
      style={{ width: size, height: size, borderRadius: size * 0.3, ...(active ? ({ "--gi-top": "#ffffff", "--gi-bottom": "#f3dcff", "--gi-rim-mid": "#ffffff", "--gi-detail": "#533ff5", "--gi-detail-out": "#ffffff" } as React.CSSProperties) : {}) }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Glyph name={name} size={Math.round(size * 0.58)} />
    </span>
  );
}
