# Dark marble plinth for the hero device (procedural). Transparent PNG/WebP, 2200x520.
import sys, numpy as np
from PIL import Image, ImageFilter
rng = np.random.default_rng(5)
W, H = 2200, 520
TOP = 130                                   # height of the visible top face
def fbm(w, h, oct=6):
    z = np.zeros((h, w), np.float32)
    for o in range(oct):
        s = 2 ** o; n = rng.random((max(2, h // (64 // min(s, 32))), max(2, w // (64 // min(s, 32))))).astype(np.float32)
        z += np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)).astype(np.float32) / 255 / (o + 1)
    return z / z.max()
def smooth(gw, gh):
    r = rng.random((gh, gw)).astype(np.float32)
    return np.asarray(Image.fromarray((r * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(30))).astype(np.float32) / 255
n = smooth(14, 4) * 0.8 + smooth(40, 10) * 0.2; n2 = smooth(10, 3)
speck = fbm(W, H)
g = np.mgrid[0:H, 0:W].astype(np.float32)
s1 = np.sin(g[1] * 0.0042 + g[0] * 0.0105 + n * 1.3)
s2 = np.sin(g[1] * 0.0021 - g[0] * 0.006 + n2 * 1.1 + 1.3)
vein = np.exp(-(s1 ** 2) / 0.0025) * 0.2 + np.exp(-(s2 ** 2) / 0.0012) * 0.12
base = 0.03 + speck * 0.03
rgb = np.stack([base + vein * 0.30, base + vein * 0.29, base * 1.15 + vein * 0.34], -1)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
top = yy < TOP
# top face: polished, catches violet and pink light from the device, brighter toward the back edge
sheen = np.exp(-(((xx - W * 0.45) / (W * 0.36)) ** 2)) * (1 - 0.6 * yy / TOP) * top
rgb[top] = rgb[top] * 1.5 + 0.07
rgb += sheen[..., None] * np.array([0.36, 0.24, 0.50])
# front edge highlight line between faces, front face darker toward the bottom
edge = np.exp(-((yy - TOP) / 2.2) ** 2)
rgb += edge[..., None] * np.array([0.35, 0.28, 0.45]) * np.exp(-(((xx - W * 0.45) / (W * 0.42)) ** 2))[..., None]
rgb[~top] *= np.clip(1.05 - (yy[~top] - TOP)[:, None] / (H - TOP) * 0.75, 0.25, 1)
alpha = np.ones((H, W), np.float32)
alpha *= np.clip(np.minimum(xx, W - xx) / 160, 0, 1)            # soft ends
alpha *= np.clip((H - yy) / 140, 0, 1)                          # fades into the floor
img = np.dstack([np.clip(rgb, 0, 1) * 255, alpha * 255]).astype(np.uint8)
out = Image.fromarray(img, "RGBA").filter(ImageFilter.GaussianBlur(0.6))
out.save(f"{sys.argv[1]}/plinth.webp", quality=80, method=6)
out.resize((1100, 260)).save("/tmp/claude-0/bg2/plinth-preview.png")
