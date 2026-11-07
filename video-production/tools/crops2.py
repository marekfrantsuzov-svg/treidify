"""v2 commercial layers. Cuts real Treidify captures (assets/ui2, 2x desktop / 3x mobile) into film/public/v2.
Chart overlay layers are the pixel difference between a real overlay state and the real clean chart, so the
film can draw Treidify's own liquidity / zone / Fibonacci / structure overlays on in sequence. Nothing is redrawn."""
import os, json, shutil, numpy as np
from PIL import Image, ImageFilter
H = os.path.dirname(os.path.abspath(__file__))
SRC = f"{H}/../assets/ui2"; OLD = f"{H}/../film/public/ui"; DST = f"{H}/../film/public/v2"
os.makedirs(DST, exist_ok=True); meta = {}
def save(im, name, w, h, jpg=False):
    if jpg: im.convert("RGB").save(f"{DST}/{name}.jpg", quality=93); ext = "jpg"
    else: im.save(f"{DST}/{name}.png"); ext = "png"
    meta[name] = {"file": f"v2/{name}.{ext}", "w": w, "h": h}
# full screens
for n in ["dash", "clean", "journal", "macro", "health", "accounts", "structliq"]:
    for t in ["light", "dark"]:
        save(Image.open(f"{SRC}/k-{n}-{t}.png"), f"full-{n}-{t}", 1920, 1080, jpg=True)
for n in ["dash", "markets", "journal", "health", "accounts", "macro"]:
    for t in ["light", "dark"]:
        save(Image.open(f"{SRC}/m-{n}-{t}.png"), f"mob-{n}-{t}", 393, 852, jpg=True)
im = Image.open(f"{SRC}/m-dash-light-full.png"); save(im, "mob-dash-light-full", 393, im.height // 3, jpg=True)
# chart + overlay layers (CSS box)
CB = (272, 290, 1452, 952); S = 2
box = tuple(v * S for v in CB); cw, ch = CB[2] - CB[0], CB[3] - CB[1]
for t in ["light", "dark"]:
    clean = Image.open(f"{SRC}/k-clean-{t}.png").convert("RGB").crop(box)
    save(clean, f"chart-clean-{t}", cw, ch, jpg=True)
    c = np.asarray(clean).astype(np.int16)
    for n in ["liq", "zones", "fib", "struct", "structliq"]:
        st = Image.open(f"{SRC}/k-{n}-{t}.png").convert("RGB").crop(box)
        s = np.asarray(st).astype(np.int16)
        d = np.abs(s - c).max(-1).astype(np.float32)
        a = np.clip((d - 5) * 14, 0, 255).astype(np.uint8)
        a = np.asarray(Image.fromarray(a).filter(ImageFilter.MaxFilter(3)))
        rgba = np.dstack([np.asarray(st), a]).astype(np.uint8)
        save(Image.fromarray(rgba, "RGBA"), f"ov-{n}-{t}", cw, ch)
        save(st, f"chart-{n}-{t}", cw, ch, jpg=True)
# cards (CSS boxes)
CARDS = {
  "dash": {"d-health": (276,96,803,232), "d-balance": (822,96,1118,232), "d-pnl": (1131,96,1377,232), "d-win": (1390,96,1636,232), "d-pf": (1649,96,1895,232), "d-chart": (276,252,1144,681), "d-ai": (1163,252,1486,465), "d-macro": (1163,486,1486,681)},
  "macro": {"m-gold": (276,497,804,722), "m-dxy": (821,497,1350,722), "m-silver": (1367,497,1895,722), "m-rs": (276,740,943,1024), "m-dxygold": (960,740,1895,1024)},
  "health": {"h-kpis": (276,167,1895,381), "h-equity": (276,398,1262,734), "h-dd": (1279,398,1895,734)},
  "journal": {"j-cal": (276,168,1895,984)},
  "accounts": {"ac-list": (276,165,980,320)},
}
for src, boxes in CARDS.items():
    for t in ["light", "dark"]:
        im = Image.open(f"{SRC}/k-{src}-{t}.png")
        for name, (x0, y0, x1, y1) in boxes.items():
            save(im.crop((x0*S, y0*S, x1*S, y1*S)), f"{name}-{t}", x1-x0, y1-y0)
lm = Image.open(f"{SRC}/land-macro-light.png")
for name, (x0, y0, x1, y1) in {"lm-markets": (672,888,1418,1700), "lm-sessions": (1454,888,2386,1700), "lm-events": (2424,888,3166,1700)}.items():
    save(lm.crop((x0, y0, x1, y1)), f"{name}-light", (x1-x0)//2, (y1-y0)//2)
for n in ["lm-events", "lc-card", "lc-session", "lc-stops"]:
    im = Image.open(f"{OLD}/{n}.png"); shutil.copy(f"{OLD}/{n}.png", f"{DST}/{n}-dark.png")
    sc = 2 if n.startswith("lc") else 4  # landing macro was captured at 4x
    meta[f"{n}-dark"] = {"file": f"v2/{n}-dark.png", "w": im.width // sc, "h": im.height // sc}
shutil.copy(f"{H}/../../web/public/brand/treidify-t-512.png", f"{DST}/t-512.png"); meta["t-512"] = {"file": "v2/t-512.png", "w": 512, "h": 512}
json.dump(meta, open(f"{DST}/../v2.json", "w"), indent=1)
print(len(meta), "layers")
