# Design system

Code: `ios/Treidify/DesignSystem/`. The visual benchmark image was not received, so values are a first pass to be tuned against it.

## Colour
Every token in `Theme` has separate light and dark values. The two modes are designed individually:
- **Dark:** midnight navy to near-black background (#070D1C to #020409), smoked glass (system material plus a #0D1A33 tint at 50%), electric-blue accent #4D94FF, silver #C7D0DD.
- **Light:** ice white to pale blue (#F5F9FE to #E4EDF9), frosted glass (material plus white at 55%), accent #1660F0, dark navy text #0A1426.
- Text tokens target WCAG AA (at least 4.5:1) against their own background. Market colours: bullish green, bearish red, neutral slate, warning amber (also used for DEMO).

## Surfaces
- `GlassCard`: 24 pt continuous corners, hairline gradient edge (the reflection fades into the hairline), soft 16 pt shadow. Uses Liquid Glass (`glassEffect`) on iOS 26 when built with Xcode 26, and `ultraThinMaterial` plus tint otherwise. With Reduce Transparency it switches to an opaque surface.
- `InsetSurface` for metric wells. `AmbientBackground` uses two radial glows that drift over 28 s. The animation is offset-only (cheap) and disabled under Reduce Motion.

## Type and layout
Dynamic Type text styles only (no fixed sizes). Numbers use rounded, monospaced digits. Spacing scale 4/8/12/16/20/28, 16 pt screen margins, 44 pt minimum hit targets for icon buttons.

## Motion
Springs around 0.3 s for selection and ease-out 0.15 s for presses. Every animation checks Reduce Motion. There are no looping animations except the ambient drift.

## Sound and haptics (`InteractionFeedbackManager` + `FeedbackPolicy`)
| Event | Haptic | Sound |
|---|---|---|
| Navigation, card expand | selection / soft | none |
| Button tap | light impact | tap |
| Tab switch, filter select | selection | tick |
| Theme switch | soft impact | toggle |
| Success, trial activated, MT5 connected | success | success / activate / connect |
| Error | error | error |

Rules: sounds are off by default and haptics are on; each has its own toggle. Sounds use the ambient session, are silenced by the silent switch and mix with other audio. The same event within 0.12 s is suppressed. Under VoiceOver no sounds play and only outcome haptics remain. Nothing fires on scroll, chart inspection or data refresh. The sounds are original sine synthesis (`tools/generate_sounds.py`), at about −20 dBFS peak, played at 35% volume.
