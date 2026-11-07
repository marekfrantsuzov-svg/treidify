# Treidify visual system v3

Introduced 2026-11-02. Source of truth: `web/src/app/system.css`, loaded right after `globals.css`.

## Principles
- Neutral foundation: Marshmallow White `#F0F0F0` page, white opaque surfaces in light; neutral charcoal (`#0B0B0D` page, `#141417` surfaces) in dark. No violet tint in the greys.
- Galactic Violet `#105BFF` is the one interactive accent (`#5B8CFF` in dark for contrast). Bubblegum Pink `#FE85D0` appears only inside the brand gradient (`--accent-grad`), which is reserved for brand moments: the logo, the Account Health ring, the homepage primary action, Premium.
- Green and red are reserved for profit, loss, demand and supply.
- Surfaces are opaque with a hairline border and almost no shadow. No backdrop blur on cards, no reflections, no glows, no animated gradients. Blur is kept only on the floating mobile nav and the scrolled top bar, where content passes underneath.
- Typography carries the hierarchy: Inter 4 with the optical-size axis (Display cut at large sizes), tabular figures on every number, sentence-case labels, one dominant figure per block.

## Tokens
| Role | Token | Range |
|---|---|---|
| Display | `--fs-display` / `.ts-display` | 44 → 96px, lh 1.02, tracking −0.042em |
| Section heading | `--fs-h2` / `.ts-h2` | 32 → 60px, lh 1.08 |
| Card heading | `--fs-h3` / `.ts-h3` | 18 → 24px |
| Lead | `--fs-lead` / `.ts-lead` | 17 → 20px |
| Body | `--fs-body` / `.ts-body` | 15 → 17px, lh 1.55 |
| Label | `--fs-label` / `.ts-label` | 13 → 14px |
| Large metric | `--fs-metric-xl` / `.ts-metric-xl` | 40 → 72px, weight 500 |

Spacing `--sp-1 … --sp-40` in 4px steps; gutters `--gutter` 20 / 24 / 32px. Radii `--r-s 8`, `--r-m 12`, `--r-l 16`, `--r-xl 20`. Motion: press 140ms, standard 220ms, reveal 480ms, `--ease-std`; page arrival is a 280ms fade with a 6px rise; nothing loops.

## Where things live
- Homepage composition: `web/src/components/marketing/ed/` (`ed.css` is loaded only by the homepage after `lx/landing.css`, whose mockup and chart styles it reuses).
- Dashboard metrics panel: `.d-metrics.dcard` / `.d-metric` in `system.css`, markup in `components/app/dashboard/health-strip.tsx`.
- All-caps tracked utility labels are neutralised globally (`.uppercase[class*="tracking-"]`); write new labels in sentence case.

## v4 "Dark Glass" (2026-11-07)

`web/src/app/glass.css` loads after `system.css` and supersedes its flat-surface rules:

- **Dark is the default** (`next-themes` `defaultTheme="dark"`). A stored explicit choice always wins; signed-in choices are
  saved to `profile.dashboard_prefs.theme` (`saveThemePreference`) and applied on other devices by `AccountThemeSync`.
  Switching goes through `lib/theme-switch.ts` (View Transitions crossfade, instant under reduced motion).
- **Brand colours come from the logo**: indigo `#5B3FE6`, violet `#6C33DB`, purple `#B535E3`, magenta `#F249ED`,
  pink `#FB8BF3`, lavender `#9D86F3` (`--logo-grad`). Accent: `#9179FF` dark, `#5B3FE6` light. Green/red stay for P&L.
- **Ambient light**: `components/brand/ambient.tsx` (radial lights on two layers, slow transform drift, pointer parallax,
  grain, vignette). It also writes `--mx/--my` on the hovered `.dcard` for the hover light.
- **Glass**: `.dcard` and `.glass` get translucent fills, `backdrop-filter`, a 1px illuminated rim (`::before`, masked
  gradient), layered shadows and a pointer light (`--spot`). Popovers use `.glass-strong` (near-opaque).
- **Gradient text** only on `.dcard-title`, `.page-title`, `.title-grad`, hero accents and highlighted figures. Icons in
  those titles use the `#tdy-stroke` gradient paint.
- **Sidebar**: floating glass panel, gliding active pill, collapsible icon rail with glass tooltips (`treidify.side-rail`).
- **Market Overview** (`dashboard/market-overview.tsx`): asset cards with sparklines from the same 25 fetched 1H bars as the
  price and 24h change, category filter, sort, expandable 24h range and structure. No series = labelled, never invented.
- **Homepage**: `ed/silk.tsx` (SVG silk light, paused off-screen), `ed/hero.tsx` (3D stage that settles on scroll and
  tilts toward the pointer), `ed/glass-landing.css` (glass scenes, light pools, gradient accents).
- Reduced motion turns off drift, parallax, silk pulses, chip bobbing and view transitions; reduced transparency and
  browsers without `backdrop-filter` fall back to near-opaque surfaces.
