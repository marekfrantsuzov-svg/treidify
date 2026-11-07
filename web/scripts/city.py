# Treidify landing backdrop v2: a dark high-floor interior at night, floor-to-ceiling windows onto a lit city,
# blurred like a shallow-depth photograph. Fully procedural (no stock, no recognisable place).
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
rng = np.random.default_rng(11)
W, H = 2880, 1620
HZ = int(H * 0.62)                      # horizon / floor line inside the room
sky = np.zeros((H, W, 3), np.float32)
t = np.linspace(0, 1, H)[:, None]
sky[:] = (np.array([6, 7, 14]) * (1 - t) + np.array([26, 22, 44]) * t)[:, None, :][:, 0][:, None, :]
img = Image.fromarray(sky.clip(0, 255).astype(np.uint8))
d = ImageDraw.Draw(img, "RGBA")
# skyline: three depth rows of towers with lit windows
for row, (base, hmin, hmax, dim, wmin, wmax) in enumerate([(HZ - 20, 120, 380, 0.45, 60, 150), (HZ + 10, 220, 620, 0.75, 80, 200), (HZ + 40, 360, 900, 1.0, 120, 260)]):
    x = -50
    while x < W:
        bw = int(rng.uniform(wmin, wmax)); bh = int(rng.uniform(hmin, hmax)); top = base - bh
        c = int(14 + 10 * dim)
        d.rectangle([x, top, x + bw, base], fill=(c, c + 2, c + 10, 255))
        for wy in range(top + 14, base - 6, int(18 + 6 * dim)):
            for wx in range(x + 8, x + bw - 8, int(16 + 6 * dim)):
                if rng.random() < 0.22:
                    warm = rng.random() < 0.72
                    col = (255, int(rng.uniform(170, 215)), int(rng.uniform(110, 160))) if warm else (190, 205, 255)
                    a = int(rng.uniform(90, 230) * dim)
                    d.rectangle([wx, wy, wx + int(7 + 4 * dim), wy + int(9 + 4 * dim)], fill=col + (a,))
        x += bw + int(rng.uniform(6, 40))
# interior: window wall with mullions and a transom, solid dark wall on the right third (behind the product)
room = Image.new("RGBA", (W, H), (0, 0, 0, 0)); r = ImageDraw.Draw(room)
r.rectangle([0, 0, W, int(H * 0.08)], fill=(6, 6, 9, 255))                  # ceiling band
for mx in list(range(0, int(W * 0.62), int(W * 0.115))) + [int(W * 0.86)]:
    r.rectangle([mx - 14, 0, mx + 14, HZ + 30], fill=(7, 7, 10, 255))          # mullions
r.rectangle([0, int(H * 0.30), int(W * 0.62), int(H * 0.30) + 10], fill=(7, 7, 10, 235))  # transom
r.rectangle([int(W * 0.62), 0, int(W * 0.84), HZ + 30], fill=(9, 9, 13, 250))  # wall pier behind the device
# bokeh: a few bright out-of-focus city lights
for _ in range(140):
    bx = rng.uniform(0, W * 0.62) if rng.random() < 0.85 else rng.uniform(W * 0.84, W); by = rng.uniform(H * 0.18, HZ)
    br = rng.uniform(10, 34); warm = rng.random() < 0.7
    col = (255, 196, 130) if warm else (170, 190, 255)
    d.ellipse([bx - br, by - br, bx + br, by + br], fill=col + (int(rng.uniform(40, 120)),))
img = Image.alpha_composite(img.convert("RGBA"), room).convert("RGB")
# warm interior lamp glows near the floor
a = np.asarray(img).astype(np.float32)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def glow(cx, cy, rx, ry, col, k):
    g = np.exp(-(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2))[..., None]
    return g * np.array(col, np.float32) * k
a += glow(W * 0.30, HZ - 30, W * 0.07, H * 0.12, (255, 170, 90), 0.55)
a += glow(W * 0.47, HZ + 10, W * 0.05, H * 0.08, (255, 160, 90), 0.35)
a += glow(W * 0.80, H * 0.55, W * 0.18, H * 0.30, (150, 80, 230), 0.22)       # brand violet spill, right
a += glow(W * 0.10, H * 0.25, W * 0.25, H * 0.35, (40, 80, 255), 0.10)        # cool blue, top left
img = Image.fromarray(a.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(20))
a = np.asarray(img).astype(np.float32)
# glossy floor: blurred, dimmed reflection of the window wall
refl = np.flipud(a[HZ - (H - HZ):HZ])
refl = np.asarray(Image.fromarray(refl.astype(np.uint8)).filter(ImageFilter.GaussianBlur(28))).astype(np.float32)
fl = np.linspace(0.38, 0.06, H - HZ)[:, None, None]
orig = a.copy()
a[HZ:] = 7 + refl * fl
for k in range(60):
    w = k / 60
    a[HZ + k] = orig[HZ + k] * (1 - w) * 0.6 + a[HZ + k] * (0.4 + 0.6 * w)
a = a  # floor already replaced; soften seam
a = np.asarray(Image.fromarray(a.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32)
# grade: darken overall and toward the edges, keep blacks deep
v = 1 - 0.55 * np.clip(((xx - W * 0.45) / (W * 0.75)) ** 2 + ((yy - H * 0.45) / (H * 0.8)) ** 2, 0, 1)
a = a * v[..., None] * 0.92
a += rng.normal(0, 1.8, a.shape[:2])[..., None]
out = Image.fromarray(a.clip(0, 255).astype(np.uint8))
dst = sys.argv[1]
out.resize((1920, 1080), Image.LANCZOS).save(f"{dst}/city-1920.webp", quality=74, method=6)
out.crop((0, 0, int(H * 0.75), H)).resize((900, 1350), Image.LANCZOS).save(f"{dst}/city-900.webp", quality=72, method=6)
out.resize((960, 540)).save(f"/tmp/claude-0/bg2/city-preview.png")
