#!/usr/bin/env python3
"""Builds the three iOS app-icon variants from the APPROVED Treidify symbol.

Input: the official symbol artwork (geometric T + candlesticks, NO wordmark or
tagline) as a high-resolution PNG with a transparent background.
Output (into AppIcon.appiconset, Contents.json updated):
  AppIcon-1024.png         default: symbol on a near-black navy background, opaque
  AppIcon-1024-dark.png    dark appearance: symbol on transparent background
  AppIcon-1024-tinted.png  tinted appearance: grayscale luminance on transparent
The symbol is never redrawn; it is only scaled and centred with Apple's
recommended safe margin. For Liquid Glass layered icons (Icon Composer, Xcode
26+), import the same layered source into an .icon file instead.

Usage: python3 tools/make_app_icon.py path/to/treidify-symbol.png
Requires Pillow.
"""
import json
import pathlib
import sys

from PIL import Image, ImageOps

SIZE = 1024
SYMBOL_FRACTION = 0.72          # symbol bounding box relative to the canvas
BACKGROUND = (5, 9, 20, 255)    # near-black midnight navy (#050914)
OUT = pathlib.Path(__file__).resolve().parent.parent / "ios/Treidify/Resources/Assets.xcassets/AppIcon.appiconset"


def fitted(symbol: Image.Image) -> Image.Image:
    bbox = symbol.getbbox()
    if bbox is None:
        sys.exit("The symbol image is fully transparent.")
    symbol = symbol.crop(bbox)
    target = int(SIZE * SYMBOL_FRACTION)
    scale = target / max(symbol.size)
    symbol = symbol.resize((round(symbol.width * scale), round(symbol.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(symbol, ((SIZE - symbol.width) // 2, (SIZE - symbol.height) // 2))
    return canvas


def main(src: str) -> None:
    symbol = Image.open(src).convert("RGBA")
    if min(symbol.size) < 512:
        print("warning: source is smaller than 512 px; supply a larger master for a crisp icon")
    layer = fitted(symbol)

    default = Image.new("RGBA", (SIZE, SIZE), BACKGROUND)
    default.alpha_composite(layer)
    default.convert("RGB").save(OUT / "AppIcon-1024.png")  # App Store icon must be opaque

    layer.save(OUT / "AppIcon-1024-dark.png")

    gray = ImageOps.grayscale(layer.convert("RGB"))
    tinted = Image.merge("RGBA", (gray, gray, gray, layer.getchannel("A")))
    tinted.save(OUT / "AppIcon-1024-tinted.png")

    contents = json.loads((OUT / "Contents.json").read_text())
    names = ["AppIcon-1024.png", "AppIcon-1024-dark.png", "AppIcon-1024-tinted.png"]
    for image, name in zip(contents["images"], names):
        image["filename"] = name
    (OUT / "Contents.json").write_text(json.dumps(contents, indent=2) + "\n")
    print("Wrote", ", ".join(names))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
