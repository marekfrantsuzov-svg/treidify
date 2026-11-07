# Final narration: one clip per line (af_heart style, British phonemes) + per-word timings.
import json, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("/home/user/tts/kokoro-v1.0.onnx", "/home/user/tts/voices-v1.0.bin")
LINES = [
 "Ever feel like you're chasing the market, instead of understanding it?",
 "Meet Treidify.",
 "Discover liquidity,", "supply and demand zones,", "and Fibonacci levels.", "All in one place.",
 "Understand market structure.",
 "Learn where to wait, what to look for, and why patience matters.",
 "No more chasing every move.",
 "Connect your trading account, and bring your trading history into one intelligent workspace.",
 "Track your profit and loss, review your performance, and discover patterns in your trading decisions.",
 "See what you're doing well, where you're making mistakes, and what you could improve.",
 "Stay informed with important market news, and understand how economic events can influence price.",
 "Your analysis.", "Your performance.", "Your learning.", "All in one place.",
 "Treidify.", "Trade with clarity.",
]
OUT = "/home/user/treidify/video-production/film/public/vo/"
import os; os.makedirs(OUT, exist_ok=True)
res = []
for i, text in enumerate(LINES):
    a, sr = k.create(text, voice="af_heart", speed=0.92, lang="en-gb")
    sf.write(f"{OUT}line{i:02d}.wav", a, sr)
    words = text.split()
    # comma groups
    groups, cur = [], []
    for w in words:
        cur.append(w)
        if w.endswith(","): groups.append(cur); cur = []
    if cur: groups.append(cur)
    # find internal pauses: 10 ms RMS frames
    hop = sr // 100
    rms = np.array([np.sqrt(np.mean(a[j:j+hop]**2)) for j in range(0, len(a)-hop, hop)])
    th = max(rms) * 0.02
    sil = rms < th
    gaps = []  # (start,end) seconds of silences >= 80ms inside
    j = 0
    while j < len(sil):
        if sil[j]:
            s = j
            while j < len(sil) and sil[j]: j += 1
            if (j - s) >= 8 and s > 5 and j < len(sil) - 5: gaps.append((s/100, j/100))
        else: j += 1
    gaps = sorted(gaps, key=lambda g: g[1]-g[0], reverse=True)[:len(groups)-1]
    gaps.sort()
    bounds = [0.0] + [x for g in gaps for x in g] + [len(a)/sr]
    spans = [(bounds[2*n], bounds[2*n+1]) for n in range(len(groups))] if len(gaps) == len(groups)-1 else [(0, len(a)/sr)]
    if len(spans) != len(groups): groups = [words]
    wt = []
    for g, (s0, s1) in zip(groups, spans):
        ph = [max(2, len(k.tokenizer.phonemize(re.sub(r"[^\w']", "", w), "en-gb"))) for w in g]
        tot = sum(ph); t = s0
        for w, p in zip(g, ph):
            d = (s1 - s0) * p / tot
            wt.append({"w": w, "t0": round(t, 3), "t1": round(t + d, 3)}); t += d
    res.append({"i": i, "text": text, "dur": round(len(a)/sr, 3), "gaps": gaps, "words": wt})
    print(i, round(len(a)/sr, 2), len(groups), gaps)
json.dump(res, open(OUT + "lines.json", "w"), indent=1)
