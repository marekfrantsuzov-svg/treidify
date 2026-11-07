# Treidify "aura" backdrop, calibrated to Marek's approved dashboard (2026-11-07): charcoal violet canvas, soft violet,
# lavender and magenta light pools and a few long diagonal light trails, heavily blurred. Generated, not stock.
# Usage: python3 scripts/aura.py  -> public/brand/backdrop/aura-1920.webp, aura-1080.webp (portrait)
import numpy as np
from PIL import Image, ImageFilter
def make(W, H, portrait=False, seed=3):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u, v = xx / W, yy / H
    base = np.array([11, 9, 17], np.float32) / 255
    img = np.ones((H, W, 3), np.float32) * base
    # top is a touch lifted (#1c1726), bottom drops to near black
    img += (np.array([16, 12, 24], np.float32) / 255)[None, None] * np.clip(1 - v * 1.4, 0, 1)[..., None]
    def pool(cx, cy, rx, ry, col, k):
        d = ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2
        return np.exp(-d)[..., None] * (np.array(col, np.float32) / 255)[None, None] * k
    P = [(0.17, 0.62, 0.10, 0.45, (132, 69, 232), 0.55), (0.62, 0.08, 0.16, 0.20, (168, 90, 245), 0.38),
         (0.92, 0.12, 0.14, 0.22, (219, 110, 219), 0.42), (0.58, 0.52, 0.10, 0.30, (132, 69, 232), 0.30),
         (0.98, 0.70, 0.10, 0.28, (214, 138, 243), 0.20), (0.36, 0.02, 0.22, 0.10, (90, 70, 160), 0.30)]
    if portrait:
        P = [(0.1, 0.2, 0.35, 0.16, (132, 69, 232), 0.5), (0.9, 0.06, 0.35, 0.10, (219, 110, 219), 0.4),
             (0.7, 0.55, 0.30, 0.18, (168, 90, 245), 0.28), (0.15, 0.85, 0.35, 0.14, (214, 138, 243), 0.16)]
    for p in P: img += pool(*p)
    # long diagonal light trails (very soft): violet → lavender → magenta
    for i in range(7 if not portrait else 5):
        ang = np.deg2rad(rng.uniform(58, 72)); x0 = rng.uniform(0.05, 1.05)
        dist = np.abs((u - x0) * np.cos(ang) + (v * H / W) * np.sin(ang) * (-1) + (v * H / W) * 0)  # line through (x0,0)
        nx, ny = np.cos(ang), -np.sin(ang) * (W / H)
        dist = np.abs((u - x0) * np.sin(ang) - v * (H / W) * np.cos(ang) * 1.0)
        w = rng.uniform(0.004, 0.012)
        col = [(168, 90, 245), (214, 138, 243), (219, 110, 219), (132, 69, 232)][i % 4]
        fade = np.clip(1 - v * rng.uniform(0.9, 1.4), 0, 1)
        img += (np.exp(-(dist / w) ** 2) * fade)[..., None] * (np.array(col, np.float32) / 255)[None, None] * rng.uniform(0.08, 0.18)
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(W / 160))
    # fine grain so the gradients do not band
    a = np.asarray(im).astype(np.float32) + rng.normal(0, 1.6, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
make(1920, 1080).save("public/brand/backdrop/aura-1920.webp", quality=82, method=6)
make(1080, 1920, portrait=True).save("public/brand/backdrop/aura-1080.webp", quality=82, method=6)
