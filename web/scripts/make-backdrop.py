# Procedural "night studio" backdrop for Treidify: an abstract architectural interior (tall window bays with distant
# city light), blurred so no object is recognisable, lit by the brand blue, violet and pink. Generated, not stock.
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
rng = np.random.default_rng(7)
W, H = 2400, 1500
img = Image.new("RGB", (W, H), (9, 10, 14))
d = ImageDraw.Draw(img, "RGBA")
# window bays: tall panes with mullions, cool deep blue glow inside, brighter near horizon
for i, x0 in enumerate(range(-80, W, 300)):
    w = 250
    top, bot = 120, int(H * 0.68)
    for y in range(top, bot, 6):
        t = (y - top) / (bot - top)
        a = int(10 + 70 * t ** 2.6)
        c = (int(22 + 22 * t), int(25 + 20 * t), int(38 + 30 * t), a)
        d.rectangle([x0, y, x0 + w, y + 6], fill=c)
    d.rectangle([x0 + w, top, x0 + w + 50, bot], fill=(8, 9, 13, 255))  # mullion
    d.rectangle([x0, int(top + (bot - top) * 0.45), x0 + w, int(top + (bot - top) * 0.45) + 14], fill=(8, 9, 13, 220))
# distant city lights (bokeh) in the lower window band
for _ in range(260):
    x = rng.uniform(0, W); y = rng.uniform(H * 0.38, H * 0.66)
    r = rng.uniform(4, 16)
    warm = rng.random() < 0.68
    col = (255, 196, 140) if warm else (150, 170, 255)
    d.ellipse([x - r, y - r, x + r, y + r], fill=col + (int(rng.uniform(70, 220)),))
img = img.filter(ImageFilter.GaussianBlur(16))
a = np.asarray(img).astype(np.float32) / 255
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def glow(cx, cy, rx, ry, col, k):
    g = np.exp(-(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2))[..., None]
    return g * np.array(col, np.float32) / 255 * k
a += glow(W * 0.08, H * 0.12, W * 0.35, H * 0.4, (35, 80, 255), 0.16)   # electric blue, top left
a += glow(W * 0.62, H * 0.30, W * 0.38, H * 0.45, (124, 65, 237), 0.13)  # violet, centre right
a += glow(W * 0.92, H * 0.72, W * 0.30, H * 0.35, (227, 111, 213), 0.12) # pink, lower right
# floor: dark stone with a soft violet reflection of the bays
floor = (yy > H * 0.70)[..., None]
refl = np.flipud(a[int(H * 0.40):int(H * 0.70)])
refl = np.asarray(Image.fromarray((np.clip(refl, 0, 1) * 255).astype(np.uint8)).resize((W, H - int(H * 0.70))).filter(ImageFilter.GaussianBlur(40))).astype(np.float32) / 255
base = np.zeros_like(a); base[int(H * 0.70):] = 0.035 + refl * 0.35
m = (1 / (1 + np.exp(-(yy - H * 0.70) / 18)))[..., None]
a = a * (1 - m) + base * m
# vignette and grade toward near-black
v = 1 - 0.65 * np.clip(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H * 0.45) / (H * 0.75)) ** 2, 0, 1)
a = a * v[..., None]
a = np.clip(a * 1.5, 0, 1)
out = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
noise = (rng.normal(0, 2.2, (H, W, 1))).astype(np.float32)
out = Image.fromarray(np.clip(np.asarray(out).astype(np.float32) + noise, 0, 255).astype(np.uint8))
import sys
dst = sys.argv[1]
out.resize((1920, 1200), Image.LANCZOS).save(f"{dst}/studio-1920.webp", quality=72, method=6)
out.resize((1080, 1350), Image.LANCZOS).save(f"{dst}/studio-1080.webp", quality=70, method=6)
out.resize((640, 400), Image.LANCZOS).save(f"{dst}/studio-preview.png")
