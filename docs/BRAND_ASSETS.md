# Brand assets

**The approved Treidify logo and the dashboard reference image were not received.** Following the brief, no substitute logo has been drawn. The app shows the typeset wordmark and leaves the symbol slot empty until the real artwork is added.

## Files needed

| Asset | Format | Goes to |
|---|---|---|
| Symbol: blue/silver geometric T with ascending candlesticks, no text | Master PNG ≥ 2048 px on a transparent background, or vector PDF/SVG | `Assets.xcassets/BrandMark.imageset` (PDF with "Preserve Vector Data", or @1x/@2x/@3x PNG) |
| Wordmark "Treidify" | Vector PDF/SVG, light and dark versions if they differ | `Assets.xcassets/Wordmark.imageset` (the typeset fallback is replaced automatically) |
| Dashboard benchmark image | PNG/JPG | Design review only; not bundled |

## App icon pipeline

```bash
python3 -m pip install pillow
python3 tools/make_app_icon.py path/to/treidify-symbol.png
```

This produces the three iOS icon appearances at 1024 × 1024 from the symbol (scaled to 72% of the canvas and centred, never redrawn):
- **Default:** symbol on near-black navy #050914, opaque (required for the App Store icon).
- **Dark:** symbol on a transparent background.
- **Tinted:** a grayscale luminance version, which the system tints.

The icon contains the symbol and candlesticks only, with no wordmark or tagline. For the iOS 26 Liquid Glass layered icon, import the layered symbol into Icon Composer (Xcode 26+) and add the resulting `.icon` file to the target. Check the result against Apple's current icon guidance before submission.
