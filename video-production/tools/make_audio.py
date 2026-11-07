"""
Treidify launch film soundtrack + sound design, synthesised from scratch and locked to the film's timeline.

  python3 tools/make_audio.py            -> film/public/audio/soundtrack.wav (music + SFX, mastered)
                                            film/public/audio/music.wav, film/public/audio/sfx.wav (stems)

120 BPM, 4/4, D minor. One beat = 0.5 s = 30 frames at 60 fps; one bar = 2 s = 120 frames, so every scene
boundary in timeline.json (360, 720, 1200, 1680, 2160, 2640, 3000) lands on a downbeat.
UI clicks use Treidify's own interface sounds from ios/Treidify/Resources/Sounds (copied to film/public/sfx).
Everything is deterministic (fixed random seed), so a re-run produces the same file.
"""
import json, os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
FILM = os.path.join(HERE, "..", "film")
TL = json.load(open(os.path.join(FILM, "timeline.json")))
SR = 48000
FPS = TL["fps"]
BPM = TL["bpm"]
BEAT = 60 / BPM
BAR = 4 * BEAT
DUR = TL["durationInFrames"] / FPS
N = int(DUR * SR)
rng = np.random.default_rng(7)

def t_(sec):
    return np.arange(int(sec * SR)) / SR

def lp(x, f, o=2):
    return sosfilt(butter(o, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)

def lp_sweep(x, fc, block=256, o=2):
    """Low-pass whose cutoff follows the array fc (block-wise, filter state carried across blocks)."""
    from scipy.signal import sosfilt_zi
    out = np.empty_like(x)
    zi = None
    for a in range(0, len(x), block):
        f = float(np.clip(fc[a], 30, SR / 2 - 200))
        sos = butter(o, f, "low", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[a:a + block], zi = sosfilt(sos, x[a:a + block], zi=zi)
    return out

def hp(x, f, o=2):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)

def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)

def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)

def saw(f, t, ph=0.0):
    return 2 * ((f * t + ph) % 1.0) - 1

def env_adsr(n, a, d, s, r, sus_len=None):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sus_len = n - a - d - r if sus_len is None else int(sus_len * SR)
    sus_len = max(sus_len, 0)
    e = np.concatenate([np.linspace(0, 1, max(a, 1)), np.linspace(1, s, max(d, 1)), np.full(sus_len, s), np.linspace(s, 0, max(r, 1))])
    return np.pad(e, (0, max(0, n - len(e))))[:n]

def place(buf, sig, at_sec, gain=1.0):
    i = int(at_sec * SR)
    if i >= buf.shape[-1]:
        return
    j = min(buf.shape[-1], i + sig.shape[-1])
    if sig.ndim == 1 and buf.ndim == 2:
        sig = np.stack([sig, sig])
    buf[..., i:j] += gain * sig[..., : j - i]

def reverb_ir(sec=2.6, decay=3.2, bright=6000):
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)]) * np.exp(-decay * t)
    ir = np.stack([lp(ir[0], bright), lp(ir[1], bright)])
    ir[:, : int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return ir / np.abs(ir).sum(axis=1, keepdims=True) * 40

IR = reverb_ir()

def verb(x, wet=0.25):
    if x.ndim == 1:
        x = np.stack([x, x])
    w = np.stack([fftconvolve(x[0], IR[0])[: x.shape[1]], fftconvolve(x[1], IR[1])[: x.shape[1]]])
    return x * (1 - wet) + w * wet

def delay(x, sec, fb=0.35, mix=0.3, pingpong=True):
    if x.ndim == 1:
        x = np.stack([x, x])
    d = int(sec * SR)
    out = x.copy()
    tap = x.copy()
    for k in range(1, 6):
        tap = np.roll(tap, d, axis=1)
        tap[:, :d] = 0
        tap = tap * fb
        if pingpong:
            tap = tap[::-1]
        out += tap * mix / fb
    return out

# ---------- arrangement ----------
# Chords per bar (D minor): Dm, Bb, F, C  -> i VI III VII, one bar each, 4-bar loop.
CHORDS = [[62, 65, 69], [58, 62, 65], [60, 65, 69], [60, 64, 67]]
ROOTS = [38, 34, 41, 36]  # bass roots
NBARS = int(round(DUR / BAR))  # 28

def section(bar):
    """intensity profile by bar: 0-1 intro, 2-9 groove, 10-13 analysis (arp+clap), 14-17 macro,
    18-21 coach (lighter), 22-24 ecosystem peak, 25-27 finale chord."""
    if bar < 2: return "intro"
    if bar < 10: return "groove"
    if bar < 14: return "lift"
    if bar < 18: return "groove2"
    if bar < 22: return "light"
    if bar < 25: return "peak"
    return "outro"

music = np.zeros((2, N))
kick_bus = np.zeros(N)  # used for sidechain

# Kick
def kick():
    t = t_(0.45)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 180) * 0.25
    return np.tanh(1.6 * (body + click)) * 0.9

K = kick()
for bar in range(NBARS):
    sec = section(bar)
    if sec in ("intro", "outro"):
        continue
    for b in range(4):
        if sec == "light" and b in (1, 3) and bar % 2 == 1:
            continue
        at = bar * BAR + b * BEAT
        place(kick_bus, K, at)
# final hit on the finale downbeat (bar 25)
place(kick_bus, K * 1.1, 25 * BAR)

# Sidechain envelope from kick placements
sc = np.ones(N)
pump = 1 - 0.75 * np.exp(-np.arange(int(BEAT * SR)) / SR * 9)
for bar in range(NBARS):
    if section(bar) in ("intro", "outro"):
        continue
    for b in range(4):
        i = int((bar * BAR + b * BEAT) * SR)
        j = min(N, i + len(pump))
        sc[i:j] = np.minimum(sc[i:j], pump[: j - i])

# Pad (supersaw, slow filter)
def supersaw(notes, sec, cutoff):
    t = t_(sec)
    s = np.zeros((2, len(t)))
    for n in notes:
        for k, det in enumerate(np.linspace(-0.18, 0.18, 7)):
            f = midi(n + det)
            ch = k % 2
            s[ch] += saw(f, t, rng.random())
    s /= len(notes) * 4
    s = np.stack([lp(s[0], cutoff, 2), lp(s[1], cutoff, 2)])
    return s * env_adsr(len(t), 0.6, 0.4, 0.85, 0.9)

pad = np.zeros((2, N))
for bar in range(NBARS):
    sec = section(bar)
    ch = CHORDS[bar % 4]
    cutoff = {"intro": 900 + bar * 500, "groove": 1800, "lift": 2600, "groove2": 2200, "light": 1500, "peak": 3800, "outro": 2400}[sec]
    length = BAR + 0.9
    if sec == "outro":
        if bar > 25:
            continue
        ch = [50, 57, 62, 65, 69, 74]  # Dm add9 spread, held to the end
        length = DUR - bar * BAR
    place(pad, supersaw(ch, length, cutoff), bar * BAR, 1.0 if sec != "outro" else 1.5)
pad[:, :] *= np.minimum(1, np.linspace(0, 1, N) * DUR / 3.5)  # fade in over the first 3.5 s
music += verb(pad, 0.35) * np.where(np.arange(N) / SR < 2 * BAR, 1, sc * 0.6 + 0.4)

# Bass: 8th-note pulse, filtered saw + sine sub, sidechained
bass = np.zeros(N)
for bar in range(2, 25):
    root = ROOTS[bar % 4]
    sec = section(bar)
    for e in range(8):
        if sec == "light" and e % 2 == 1:
            continue
        t = t_(BEAT / 2 * 0.92)
        f = midi(root + (12 if e in (3, 7) and sec in ("lift", "peak") else 0))
        tone = 0.6 * np.sin(2 * np.pi * f * t) + 0.35 * lp_sweep(saw(f, t), 600 + 1400 * np.exp(-t * 18))
        place(bass, tone * env_adsr(len(t), 0.004, 0.08, 0.7, 0.03), bar * BAR + e * BEAT / 2, 0.42)
music += np.stack([bass, bass]) * sc

# Arp: 16th plucks of chord tones, ping-pong delay (lift, groove2, peak)
arp = np.zeros(N)
pattern = [0, 1, 2, 1, 2, 0, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1]
for bar in range(NBARS):
    sec = section(bar)
    if sec not in ("lift", "groove2", "peak", "groove") or (sec == "groove" and bar < 6):
        continue
    ch = CHORDS[bar % 4]
    for s in range(16):
        n = ch[pattern[s]] + 12
        t = t_(0.22)
        f = midi(n)
        pl = saw(f, t) * 0.6 + np.sin(2 * np.pi * f * 2 * t) * 0.2
        pl = lp_sweep(pl, 1200 + 4200 * np.exp(-t * 22)) * np.exp(-t * 14)
        g = 0.34 if sec != "groove" else 0.2
        place(arp, pl, bar * BAR + s * BEAT / 4, g * (1.0 if s % 4 == 0 else 0.75))
music += verb(delay(arp, BEAT * 0.75, 0.38, 0.35), 0.3)

# Hats + claps
hats = np.zeros(N)
claps = np.zeros(N)
for bar in range(2, 25):
    sec = section(bar)
    for s in range(16):
        if sec == "light" and s % 2 == 1:
            continue
        t = t_(0.06 if s % 4 != 2 else 0.18)
        nz = hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * (70 if s % 4 != 2 else 20))
        vel = [0.5, 0.25, 0.8, 0.3][s % 4]
        place(hats, nz, bar * BAR + s * BEAT / 4, 0.07 * vel)
    if sec in ("lift", "groove2", "peak") or (sec == "groove" and bar >= 6):
        for b in (1, 3):
            t = t_(0.3)
            nz = bp(rng.standard_normal(len(t)), 900, 5000) * (np.exp(-t * 30) + 0.4 * np.exp(-t * 9))
            place(claps, nz, bar * BAR + b * BEAT, 0.11)
hp_st = np.stack([hats * 0.9, np.roll(hats, int(0.004 * SR))])
music += hp_st * (0.7 + 0.3 * sc)
music += verb(np.stack([claps, claps]), 0.35)

# Kick on top (not sidechained)
music += np.stack([kick_bus, kick_bus]) * 0.42

# Section risers into big transitions (2 beats before)
def riser(sec, up=True):
    t = t_(sec)
    nz = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    steps = 24
    for k in range(steps):
        a, b = k * len(t) // steps, (k + 1) * len(t) // steps
        fc = 400 * (16 ** (k / steps)) if up else 6400 / (16 ** (k / steps))
        out[a:b] = bp(nz[a:b], fc * 0.7, min(fc * 1.4, 20000))
    e = np.linspace(0, 1, len(t)) ** 2 if up else np.linspace(1, 0, len(t)) ** 2
    return out * e

for f0 in (720, 1200, 1680, 2160, 2640):
    place(music, verb(riser(2 * BEAT) * 0.22, 0.4), f0 / FPS - 2 * BEAT)
place(music, verb(riser(1.8) * 0.18, 0.5), 0.6)

# ---------- SFX ----------
SFX_DIR = os.path.join(FILM, "public", "sfx")

def load_wav(name):
    x, sr = sf.read(os.path.join(SFX_DIR, name), always_2d=True)
    x = x.mean(axis=1)
    if sr != SR:
        x = resample_poly(x, SR, sr)
    return x / (np.abs(x).max() + 1e-9)

UI = {k: load_wav(f"treidify_{k}.wav") for k in ("tap", "tick", "toggle", "connect", "success", "activate")}

def whoosh(sec):
    t = t_(sec)
    nz = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    steps = 30
    for k in range(steps):
        a, b = k * len(t) // steps, (k + 1) * len(t) // steps
        x = k / steps
        fc = 300 + 3500 * np.sin(np.pi * x) ** 1.5
        out[a:b] = bp(nz[a:b], fc * 0.6, fc * 1.6)
    e = np.sin(np.pi * np.linspace(0, 1, len(t))) ** 2
    st = np.stack([out * e * np.linspace(1.2, 0.6, len(t)), out * e * np.linspace(0.6, 1.2, len(t))])
    return verb(st, 0.3)

def impact():
    t = t_(1.6)
    sub = np.sin(2 * np.pi * (38 + 40 * np.exp(-t * 10)) * t) * np.exp(-t * 3.2)
    body = lp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 12) * 0.35
    air = hp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 5) * 0.06
    return verb(np.tanh(1.3 * (sub + body + air)), 0.35)

def swell():
    t = t_(3.0)
    tone = sum(np.sin(2 * np.pi * midi(n) * t + rng.random() * 6) for n in (50, 57, 62, 69))
    return verb(lp(tone, 1500) * (np.linspace(0, 1, len(t)) ** 2) * 0.25, 0.5)

def shimmer():
    t = t_(1.8)
    tone = sum(np.sin(2 * np.pi * midi(n) * t) * np.exp(-t * (2 + i)) for i, n in enumerate((86, 93, 98, 101)))
    return verb(delay(tone * 0.25, BEAT / 2, 0.4, 0.4), 0.55)

def typing(sec):
    out = np.zeros(int(sec * SR))
    k = 0.0
    while k < sec - 0.06:
        place(out, UI["tick"] * (0.5 + 0.5 * rng.random()), k, 1.0)
        k += 0.055 + 0.04 * rng.random()
    return out

sfx = np.zeros((2, N))
for c in TL["sfx"]:
    at, g, ty = c["f"] / FPS, c["gain"], c["type"]
    if ty == "whoosh": s = whoosh(c.get("len", 0.8)); at -= c.get("len", 0.8) * 0.55
    elif ty == "impact": s = impact()
    elif ty == "riser": s = verb(riser(c.get("len", 1.5)) * 0.6, 0.4); at -= c.get("len", 1.5)
    elif ty == "swell": s = swell()
    elif ty == "shimmer": s = shimmer()
    elif ty == "typing": s = typing(c.get("len", 1.0))
    else: s = verb(UI[ty], 0.2)
    place(sfx, s, max(at, 0), g)

# ---------- master ----------
def master(x, target_peak=0.89):
    x = x - x.mean(axis=1, keepdims=True)
    x = np.stack([lp(x[0], 16500), lp(x[1], 16500)])
    x = np.stack([hp(x[0], 28), hp(x[1], 28)])
    x = np.tanh(x * 1.15) / np.tanh(1.15)
    fade = np.ones(N)
    fl = int(3.0 * SR)
    fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
    x = x * fade
    return x / (np.abs(x).max() + 1e-9) * target_peak

music_n = music / (np.abs(music).max() + 1e-9)
sfx_n = sfx / (np.abs(sfx).max() + 1e-9)
mix = master(music_n * 0.82 + sfx_n * 0.42)
out = os.path.join(FILM, "public", "audio")
os.makedirs(out, exist_ok=True)
sf.write(os.path.join(out, "soundtrack.wav"), mix.T, SR, subtype="PCM_24")
sf.write(os.path.join(out, "music.wav"), master(music_n).T, SR, subtype="PCM_24")
sf.write(os.path.join(out, "sfx.wav"), (sfx_n * 0.8).T, SR, subtype="PCM_24")
print("wrote", out, f"{DUR:.1f}s")
