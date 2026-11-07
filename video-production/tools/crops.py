"""Cuts individual Treidify interface cards out of the 3840x2160 captures (assets/ui) into film/public/ui.
Boxes are given in 1920x1080 CSS pixels (the capture viewport) and scaled by 2. Layered animation in the film
re-assembles these real cards; nothing is redrawn."""
from PIL import Image
import json, os
SRC = os.path.join(os.path.dirname(__file__), "../assets/ui")
DST = os.path.join(os.path.dirname(__file__), "../film/public/ui")
os.makedirs(DST, exist_ok=True)
S = 2
boxes = {
  "dashboard": {"d-health": (276,96,803,232), "d-balance": (822,96,1118,232), "d-pnl": (1131,96,1377,232), "d-win": (1390,96,1636,232), "d-pf": (1649,96,1895,232),
                 "d-chart": (276,252,1144,681), "d-ai": (1163,252,1486,465), "d-macro": (1163,486,1486,681), "d-sidebar": (12,12,240,1068), "d-greeting": (270,14,900,84)},
  "analysis": {"a-top": (276,165,1895,456), "a-entry": (276,474,1077,910), "a-risk": (1094,474,1895,910)},
  "macro": {"m-gold": (276,497,804,722), "m-dxy": (821,497,1350,722), "m-silver": (1367,497,1895,722), "m-rs": (276,740,943,1024), "m-dxygold": (960,740,1895,1024), "m-head": (276,80,1200,145)},
  "accounts": {"ac-list": (276,165,1895,320), "ac-list-l": (276,165,980,320), "ac-connect": (276,336,1077,668), "ac-demo": (1094,336,1895,668)},
  "health": {"h-kpis": (276,167,1895,381), "h-equity": (276,398,1262,734), "h-dd": (1279,398,1895,734), "h-month": (276,751,1895,1001)},
  "journal": {"j-cal": (276,168,1895,984), "j-head": (276,80,900,145)},
  "journal-2": {"j-kpis": (276,100,1895,320), "j-perf": (276,669,804,1080), "j-symbol": (821,669,1350,1000), "j-session": (1367,669,1895,1000)},
  "coach": {"c-periods": (276,167,1895,357), "c-patterns": (276,375,1895,725), "c-head": (276,80,900,145)},
}
# Landing-page sections are element screenshots at 2x of the section; boxes there are in device pixels.
dev = {
  "land-coach": {"lc-card": (2021,386,3070,1507), "lc-session": (770,1008,1335,1488), "lc-stops": (1360,1008,1925,1488)},
  "land-macro": {"lm-markets": (672,888,1418,1700), "lm-sessions": (1454,888,2386,1700), "lm-events": (2424,888,3166,1700)},
}
meta = {}
for src, items in boxes.items():
  im = Image.open(f"{SRC}/{src}.png")
  for name, (x0,y0,x1,y1) in items.items():
    im.crop((x0*S,y0*S,x1*S,y1*S)).save(f"{DST}/{name}.png", optimize=False); meta[name] = {"src": src, "box": [x0,y0,x1,y1], "w": x1-x0, "h": y1-y0}
# The landing sections are re-captured at 4x density (assets/ui-4x) so they stay sharp when enlarged in 4K.
for src, items in dev.items():
  hi = src == "land-macro"  # the 4x coach capture tiles badly in Chromium, so the coach uses the 2x capture
  im = Image.open(f"{SRC}-4x/{src}.png" if hi else f"{SRC}/{src}.png")
  k = 2 if hi else 1
  for name, (x0,y0,x1,y1) in items.items():
    im.crop((x0*k,y0*k,x1*k,y1*k)).save(f"{DST}/{name}.png"); meta[name] = {"src": src, "box": [x0/S,y0/S,x1/S,y1/S], "w": (x1-x0)/S, "h": (y1-y0)/S}
# full frames used as camera plates
for f in ["dashboard","markets-clean","markets-1h","markets-fib","markets-liq","markets-4h","markets-15m","analysis","macro","journal","journal-2","health","accounts","coach"]:
  Image.open(f"{SRC}/{f}.png").save(f"{DST}/full-{f}.png")
# pre-blurred, darkened dashboard used as the out-of-focus depth plane (cheaper than a CSS blur at 4K)
from PIL import ImageFilter, ImageEnhance
bl = Image.open(f"{SRC}/dashboard.png").convert("RGB").filter(ImageFilter.GaussianBlur(10))
ImageEnhance.Brightness(bl).enhance(0.42).save(f"{DST}/full-dashboard-blur.png")
json.dump(meta, open(f"{DST}/../crops.json","w"), indent=1)
print(len(meta), "crops")
