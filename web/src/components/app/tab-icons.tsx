import { cn } from "@/lib/cn";

/**
 * Treidify tab-bar icons, drawn on a 24-unit grid. Each has two states:
 * outline (inactive, inherits the text colour) and a dimensional fill (active): a violet-to-pink body,
 * a white specular highlight across the top and a soft inner detail, so the selected tab reads as lit glass.
 */
export type TabGlyph = "home" | "markets" | "ai" | "community" | "more";

const OUTLINE: Record<TabGlyph, string> = {
  home: "M4.5 10.4 11.1 4.6a1.4 1.4 0 0 1 1.8 0l6.6 5.8c.3.27.5.66.5 1.07V18.5a2 2 0 0 1-2 2h-2.8a.7.7 0 0 1-.7-.7v-4.1a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v4.1a.7.7 0 0 1-.7.7H6a2 2 0 0 1-2-2v-7.03c0-.41.18-.8.5-1.07Z",
  markets: "M6.5 9.5h2a.8.8 0 0 1 .8.8v5.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8v-5.4a.8.8 0 0 1 .8-.8Z M7.5 6.5v3 M7.5 16.5v3 M11 6h2a.8.8 0 0 1 .8.8v7.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8V6.8A.8.8 0 0 1 11 6Z M12 3.5V6 M12 15v4.5 M15.5 11h2a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8v-3.4a.8.8 0 0 1 .8-.8Z M16.5 8v3 M16.5 16v2.5",
  ai: "M11 4c.5 3.9 2.4 5.9 6.3 6.4-3.9.5-5.8 2.5-6.3 6.4-.5-3.9-2.4-5.9-6.3-6.4C8.6 9.9 10.5 7.9 11 4Z M17.6 14.6c.25 1.8 1.1 2.7 2.9 2.9-1.8.25-2.65 1.1-2.9 2.9-.25-1.8-1.1-2.65-2.9-2.9 1.8-.2 2.65-1.1 2.9-2.9Z",
  community: "M9.2 4.6a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2Z M3.6 18.6c.55-3.1 2.85-4.9 5.6-4.9s5.05 1.8 5.6 4.9c.1.6-.35 1.1-.95 1.1H4.55c-.6 0-1.05-.5-.95-1.1Z M15.6 5.2a2.7 2.7 0 0 1 0 5.4 M17.2 13.9c1.9.45 3.1 1.85 3.45 3.9.1.55-.3 1-.85 1h-1.6",
  more: "M5.8 4.5h3.4a1.3 1.3 0 0 1 1.3 1.3v3.4a1.3 1.3 0 0 1-1.3 1.3H5.8a1.3 1.3 0 0 1-1.3-1.3V5.8a1.3 1.3 0 0 1 1.3-1.3Z M14.8 4.5h3.4a1.3 1.3 0 0 1 1.3 1.3v3.4a1.3 1.3 0 0 1-1.3 1.3h-3.4a1.3 1.3 0 0 1-1.3-1.3V5.8a1.3 1.3 0 0 1 1.3-1.3Z M5.8 13.5h3.4a1.3 1.3 0 0 1 1.3 1.3v3.4a1.3 1.3 0 0 1-1.3 1.3H5.8a1.3 1.3 0 0 1-1.3-1.3v-3.4a1.3 1.3 0 0 1 1.3-1.3Z M16.5 13.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z",
};

/** Filled bodies for the active state, with an optional detail drawn on top in white. */
const FILLED: Record<TabGlyph, { body: string; detail?: string }> = {
  home: { body: "M4.5 10.4 11.1 4.6a1.4 1.4 0 0 1 1.8 0l6.6 5.8c.3.27.5.66.5 1.07V18.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7.03c0-.41.18-.8.5-1.07Z", detail: "M10 20.4v-4.2a1.2 1.2 0 0 1 1.2-1.2h1.6a1.2 1.2 0 0 1 1.2 1.2v4.2" },
  markets: { body: "M6.5 9.5h2a.8.8 0 0 1 .8.8v5.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8v-5.4a.8.8 0 0 1 .8-.8Z M11 6h2a.8.8 0 0 1 .8.8v7.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8V6.8A.8.8 0 0 1 11 6Z M15.5 11h2a.8.8 0 0 1 .8.8v3.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8v-3.4a.8.8 0 0 1 .8-.8Z", detail: "M7.5 6.5v3 M7.5 16.5v3 M12 3.5V6 M12 15v4.5 M16.5 8v3 M16.5 16v2.5" },
  ai: { body: OUTLINE.ai },
  community: { body: "M9.2 4.6a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2Z M3.6 18.6c.55-3.1 2.85-4.9 5.6-4.9s5.05 1.8 5.6 4.9c.1.6-.35 1.1-.95 1.1H4.55c-.6 0-1.05-.5-.95-1.1Z M15.6 5.2a2.7 2.7 0 0 1 0 5.4c-.3 0-.5-.2-.4-.5.5-1.4.5-2.9 0-4.4-.1-.3.1-.5.4-.5Z M17.2 13.9c1.9.45 3.1 1.85 3.45 3.9.1.55-.3 1-.85 1h-2.1c-.3 0-.5-.25-.55-.55-.25-1.5-.9-2.75-1.85-3.75-.3-.3 0-.75.4-.7.5.02 1 .05 1.5.1Z" },
  more: { body: OUTLINE.more },
};

/** Gradients used by the active icons. Rendered once by the tab bar. */
export function TabIconDefs() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <linearGradient id="tab-fill" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#7a63ff" />
          <stop offset="0.55" stopColor="#533ff5" />
          <stop offset="1" stopColor="#ed74ce" />
        </linearGradient>
        <linearGradient id="tab-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="tab-top"><rect x="0" y="0" width="24" height="12" /></clipPath>
      </defs>
    </svg>
  );
}

export function TabIcon({ name, active, size = 26, className }: { name: TabGlyph; active?: boolean; size?: number; className?: string }) {
  const f = FILLED[name];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={cn("tab-icon overflow-visible", active && "is-active", className)}>
      {active ? (
        <g className="tab-icon-fill">
          <path d={f.body} fill="url(#tab-fill)" fillRule="evenodd" />
          <path d={f.body} fill="url(#tab-shine)" fillRule="evenodd" clipPath="url(#tab-top)" />
          <path d={f.body} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.6" strokeLinejoin="round" />
          {f.detail && <path d={f.detail} fill="none" stroke={name === "markets" ? "url(#tab-fill)" : "#ffffff"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
      ) : (
        <path d={OUTLINE[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
