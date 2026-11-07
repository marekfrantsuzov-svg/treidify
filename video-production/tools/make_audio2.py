"""
Treidify commercial (v2) soundtrack: narration + original score + sound design, mixed against film/commercial.json.

  python3 tools/make_audio2.py  ->  film/public/audio2/mix.wav  (+ vo.wav, music.wav, sfx.wav stems)

Narration: film/public/vo/lineNN.wav (Kokoro TTS, Apache-2.0, voice af_heart with British-English phonemes).
Score: synthesised here (no third-party music). UI sounds: Treidify's own (film/public/sfx).
Deterministic: fixed seeds.
"""
import json, os
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

H = os.path.dirname(os.path.abspath(__file__)); FILM = f"{H}/../film"
TL = json.load(open(f"{FILM}/commercial.json"))
SR = 48000; FPS = TL["fps"]; DUR = TL["durationInFrames"] / FPS; N = int(DUR * SR)
rng = np.random.default_rng(11)
BPM = 100; BEAT = 60 / BPM; BAR = 4 * BEAT
fr = lambda f: f / FPS

def t_(s): return np.arange(int(s * SR)) / SR
def flt(x, f, kind, o=2): return sosfilt(butter(o, f, kind, fs=SR, output="sos"), x, axis=-1)
lp = lambda x, f, o=2: flt(x, min(f, SR / 2 - 100), "low", o)
hp = lambda x, f, o=2: flt(x, f, "high", o)
bp = lambda x, a, b, o=2: flt(x, [a, min(b, SR / 2 - 100)], "band", o)
midi = lambda n: 440 * 2 ** ((n - 69) / 12)
def st(x): return np.stack([x, x]) if x.ndim == 1 else x
def place(buf, sig, at, g=1.0):
    sig = st(sig); i = int(max(at, 0) * SR)
    if i >= buf.shape[1]: return
    j = min(buf.shape[1], i + sig.shape[1]); buf[:, i:j] += g * sig[:, : j - i]
def ir(sec=3.0, decay=2.6, bright=7000):
    n = int(sec * SR); t = np.arange(n) / SR
    x = np.stack([rng.standard_normal(n), rng.standard_normal(n)]) * np.exp(-decay * t)
    x = lp(x, bright); x[:, : int(0.015 * SR)] *= np.linspace(0, 1, int(0.015 * SR))
    return x / np.abs(x).sum(axis=1, keepdims=True) * 38
IR = ir(); IRS = ir(0.6, 9, 9000)
def verb(x, wet=0.3, r=None):
    r = IR if r is None else r; x = st(x)
    w = np.stack([fftconvolve(x[k], r[k])[: x.shape[1]] for k in range(2)])
    return x * (1 - wet) + w * wet
def delay(x, sec, fb=0.35, mix=0.3):
    x = st(x); d = int(sec * SR); out = x.copy(); tap = x.copy()
    for _ in range(6):
        tap = np.roll(tap, d, axis=1); tap[:, :d] = 0; tap = tap[::-1] * fb; out += tap * mix / fb
    return out
def env(n, a, r):
    e = np.ones(n); a = int(a * SR); r = int(r * SR)
    e[:a] = np.linspace(0, 1, a); e[-r:] *= np.linspace(1, 0, r); return e

# ------------------------------------------------------------------ narration
vo = np.zeros((2, N))
for i, f in enumerate(TL["vo"]):
    x, sr = sf.read(f"{FILM}/public/vo/line{i:02d}.wav")
    x = resample_poly(x, SR, sr)
    x = hp(x, 75); x = x + 0.25 * bp(x, 2500, 6000)  # presence
    # gentle compression (soft knee on a smoothed envelope)
    e = np.sqrt(np.maximum(lp(x ** 2, 30), 0)) + 1e-6; g = np.minimum(1, (0.12 / e) ** 0.35); x = x * g
    place(vo, x, fr(f))
vo = verb(vo, 0.06, IRS)
vo = vo / np.abs(vo).max() * 0.9

# ------------------------------------------------------------------ score (100 BPM, D major / B minor)
music = np.zeros((2, N))
# progression per bar: Dmaj9, Bm11, Gmaj7(#11), Asus4->A
CH = [[50, 57, 61, 64, 66, 69], [47, 54, 57, 61, 64, 66], [43, 50, 54, 57, 62, 66], [45, 52, 57, 59, 62, 64]]
ROOT = [38, 35, 43, 33]
def pad_note(f0, sec):
    t = t_(sec); out = np.zeros(len(t))
    for d in (-0.08, 0.0, 0.07):
        ff = f0 * 2 ** (d / 12)
        out += 2 * ((ff * t + rng.random()) % 1) - 1
    return lp(out / 3, 1400 + f0 * 2) * env(len(t), 0.9, 1.2)
def pluck(f0, sec=1.2):
    n = int(sec * SR); p = max(2, int(SR / f0)); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for k in range(n):
        out[k] = buf[k % p]; buf[k % p] = 0.996 * 0.5 * (buf[k % p] + buf[(k + 1) % p])
    return lp(out, 5200) * env(n, 0.002, 0.4)
PL = {}
def pl(n):
    if n not in PL: PL[n] = pluck(midi(n))
    return PL[n]
def kick():
    t = t_(0.5); f = 42 + 95 * np.exp(-t * 30)
    return np.tanh(1.4 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)) * 0.9
def hat(): t = t_(0.08); return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * 60)
K, HT = kick(), hat()

T_BRIGHT = fr(440)            # the score opens up on "Meet Treidify"
T_END = fr(3972)             # logo hit
nb = int(DUR / BAR) + 2
pads = np.zeros((2, N)); plucks = np.zeros((2, N)); drums = np.zeros((2, N)); bass = np.zeros((2, N))
for b in range(nb):
    t0 = T_BRIGHT + b * BAR
    if t0 >= T_END: break
    c = CH[b % 4]
    for k, n in enumerate(c[:4]):
        s = pad_note(midi(n), BAR + 1.2); pan = 0.35 * (k - 1.5) / 1.5
        place(pads, np.stack([s * (1 - pan), s * (1 + pan)]), t0, 0.12)
    # bass
    bt = t_(BAR); bs = np.sin(2 * np.pi * midi(ROOT[b % 4]) * bt) * env(len(bt), 0.02, 0.3)
    place(bass, bs, t0, 0.35)
    # 8th-note arpeggio from the chord, ping-pong delayed later
    arp = [c[2], c[3], c[4], c[5], c[4], c[3], c[2], c[5]] if len(c) > 5 else c
    for k in range(8):
        tt = t0 + k * BEAT / 2
        if tt < fr(1380) and k % 2: continue  # thinner in S2-S3, fuller from S4
        place(plucks, pl(arp[k] + 12), tt, 0.16 if k % 2 == 0 else 0.11)
    # drums from S3 (Liquidity) until the logo; softer during S7
    for k in range(4):
        tt = t0 + k * BEAT
        if fr(760) <= tt < fr(3940):
            if k in (0, 2) or tt > fr(1960): place(drums, K, tt, 0.55 if fr(3150) < tt < fr(3600) else 0.75)
        if fr(1380) <= tt < fr(3940):
            for h in (0.5, 0.75):
                place(drums, HT * (0.5 if h == 0.75 else 0.9), tt + h * BEAT, 0.12)
plucks = delay(plucks, BEAT * 0.75, 0.35, 0.35)
music += verb(pads, 0.45) + verb(plucks, 0.3) + bass + drums

# S1: tense intro, low drone + accelerating ticks + riser, cut to silence at the "STOP CHASING" hit
t = t_(fr(440)); drone = np.zeros(len(t))
for n in (38, 45, 50): drone += np.sin(2 * np.pi * midi(n) * t + rng.random())
drone = lp(drone * (0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * t)), 600) * env(len(t), 0.6, 0.3) * 0.18
drone[int(fr(298) * SR):] *= np.linspace(1, 0, len(drone) - int(fr(298) * SR)) ** 4
place(music, drone, 0)
k = 0.2; step = 0.32
while k < fr(296):
    tk = hp(rng.standard_normal(int(0.03 * SR)), 3000) * np.exp(-np.arange(int(0.03 * SR)) / SR * 140)
    place(music, tk, k, 0.18); k += step; step = max(0.11, step * 0.975)
def riser(sec):
    t = t_(sec); nz = rng.standard_normal(len(t)); out = np.zeros(len(t))
    for s in range(24):
        a, b = s * len(t) // 24, (s + 1) * len(t) // 24; fc = 300 * (20 ** (s / 24))
        out[a:b] = bp(nz[a:b], fc * 0.7, fc * 1.4)
    return out * np.linspace(0, 1, len(t)) ** 2
place(music, verb(riser(2.2) * 0.25, 0.4), fr(300) - 2.2)

# Sonic logo: three bell notes + resolved chord, then tail
def bell(f0, sec=3.5):
    t = t_(sec); m = np.sin(2 * np.pi * f0 * 1.4 * t) * 2.2 * np.exp(-t * 2.5)
    return np.sin(2 * np.pi * f0 * t + m) * np.exp(-t * 1.6)
for k, (n, dt) in enumerate([(74, 0.0), (81, 0.18), (78, 0.36)]):
    place(music, verb(delay(bell(midi(n)) * 0.2, BEAT / 2, 0.3, 0.25), 0.45), T_END + dt)
for n in (38, 50, 57, 62, 66, 69, 74):
    s = pad_note(midi(n), DUR - T_END) * 0.9
    place(music, verb(s, 0.5), T_END - 0.05, 0.11)
place(music, verb(np.sin(2 * np.pi * midi(26) * t_(4)) * np.exp(-t_(4) * 1.1), 0.3), T_END, 0.5)

# ------------------------------------------------------------------ SFX
SX = f"{FILM}/public/sfx"
def ui(name):
    x, sr = sf.read(f"{SX}/treidify_{name}.wav", always_2d=True); x = resample_poly(x.mean(1), SR, sr)
    return x / (np.abs(x).max() + 1e-9)
UI = {k: ui(k) for k in ("tap", "tick", "toggle", "connect", "success", "activate", "error")}
def whoosh(sec=0.7, lo=300, hi=3800):
    t = t_(sec); nz = rng.standard_normal(len(t)); out = np.zeros(len(t))
    for s in range(30):
        a, b = s * len(t) // 30, (s + 1) * len(t) // 30; fc = lo + hi * np.sin(np.pi * s / 30) ** 1.5
        out[a:b] = bp(nz[a:b], fc * 0.6, fc * 1.6)
    e = np.sin(np.pi * np.linspace(0, 1, len(t))) ** 2
    return verb(np.stack([out * e * np.linspace(1.2, 0.6, len(t)), out * e * np.linspace(0.6, 1.2, len(t))]), 0.3)
def impact():
    t = t_(1.8); sub = np.sin(2 * np.pi * (36 + 44 * np.exp(-t * 10)) * t) * np.exp(-t * 3)
    body = lp(rng.standard_normal(len(t)), 1600) * np.exp(-t * 14) * 0.3
    return verb(np.tanh(1.3 * (sub + body)), 0.35)
def accent():  # text reveal: airy flick + soft low thump
    t = t_(0.5); air = hp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 18) * 0.25
    th = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 25)) * t) * np.exp(-t * 14) * 0.6
    return verb(air + th, 0.25)
def shimmer():
    t = t_(2.0); x = sum(np.sin(2 * np.pi * midi(n) * t) * np.exp(-t * (2 + i)) for i, n in enumerate((86, 90, 93, 98)))
    return verb(delay(x * 0.22, BEAT / 2, 0.4, 0.4), 0.55)
sfx = np.zeros((2, N))
W = lambda f, g=0.5, sec=0.7: place(sfx, whoosh(sec), fr(f) - sec * 0.55, g)
A = lambda f, g=0.6: place(sfx, accent(), fr(f), g)
U = lambda f, k, g=0.35: place(sfx, verb(UI[k], 0.2), fr(f), g)
for k in range(0, 236, 14): U(k + 30, "tick", 0.06 + 0.06 * k / 236)
U(236, "error", 0.25)
place(sfx, impact(), fr(300), 0.8); A(300, 0.5)
W(412, 0.55, 0.9); place(sfx, shimmer(), fr(430), 0.35); U(446, "activate", 0.3)
W(580, 0.45, 0.9); W(724, 0.55, 0.8)
for f in (774, 930, 1086, 1392, 1800, 2442, 3092, 3184, 3354): A(f, 0.55)
for f in (846, 1002, 1158): U(f, "toggle", 0.3)
W(1250, 0.35); W(1400, 0.35)
for f in (1540, 1616, 1640, 1672): U(f, "tap", 0.3)
W(1940, 0.4); W(2000, 0.4)
for p in (2066, 2104, 2142, 2176): U(p + 34, "tick", 0.3)
U(2212, "connect", 0.4); W(2214, 0.45, 1.0)
for k in range(8): U(2296 + 12 * k, "tap", 0.16)
U(2400, "success", 0.3)
W(2556, 0.4); W(2620, 0.45); W(2790, 0.4); W(2862, 0.35)
for k in range(4): U(2672 + 18 * k, "tick", 0.25)
lines = json.load(open(f"{FILM}/public/vo/lines.json"))
for k in (0, 5, 11): U(TL["vo"][11] + int(lines[11]["words"][k]["t0"] * 60), "tap", 0.22)
W(3160, 0.5, 0.9); W(3262, 0.3); W(3452, 0.4)
for f in (3490, 3514, 3538): U(f, "tick", 0.25)
U(3556, "activate", 0.25)
W(3612, 0.5, 0.9); W(3630, 0.3); W(3650, 0.3)
for f in (3636, 3720, 3796, 3872): U(f, "tap", 0.18)
place(sfx, verb(riser(0.9) * 0.35, 0.4), fr(3972) - 0.9)
place(sfx, impact(), fr(3972), 0.55); place(sfx, shimmer(), fr(4086), 0.25)

# ------------------------------------------------------------------ mix
music /= np.abs(music).max(); sfx /= np.abs(sfx).max()
# duck music under the voice: smoothed VO envelope
ve = np.sqrt(np.maximum(lp(vo.mean(0) ** 2, 4), 0)); ve = ve / ve.max()
duck = 1 - 0.55 * np.clip(ve * 6, 0, 1)
duck = lp(duck, 3)
mix = vo * 1.0 + music * 0.42 * duck + sfx * 0.36 * (1 - 0.3 * np.clip(ve * 6, 0, 1))
mix = hp(mix, 25)
fl = int(1.2 * SR); mix[:, -fl:] *= np.linspace(1, 0, fl) ** 1.5
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix = mix / np.abs(mix).max() * 0.89
out = f"{FILM}/public/audio2"; os.makedirs(out, exist_ok=True)
sf.write(f"{out}/mix.wav", mix.T, SR, subtype="PCM_24")
sf.write(f"{out}/vo.wav", vo.T, SR, subtype="PCM_24"); sf.write(f"{out}/music.wav", (music * 0.8).T, SR, subtype="PCM_24"); sf.write(f"{out}/sfx.wav", (sfx * 0.8).T, SR, subtype="PCM_24")
print("ok", DUR)
