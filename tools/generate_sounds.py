#!/usr/bin/env python3
"""Synthesises Treidify's interface sounds from scratch (no samples), so they
are original works owned by the project. Output: 44.1 kHz, 16-bit mono WAV.

Design: very short, soft, sine-based tones with a fast attack, exponential
decay and a gentle 2nd harmonic. Peak level about -20 dBFS; the app plays them
at reduced volume on the ambient audio session (respects the silent switch).
"""
import math
import pathlib
import struct
import wave

RATE = 44_100
PEAK = 0.1  # ~ -20 dBFS
OUT = pathlib.Path(__file__).resolve().parent.parent / "ios" / "Treidify" / "Resources" / "Sounds"


def tone(freq, dur, decay, harmonic=0.18, attack=0.004):
    n = int(RATE * dur)
    out = []
    for i in range(n):
        t = i / RATE
        env = min(1.0, t / attack) * math.exp(-t / decay)
        s = math.sin(2 * math.pi * freq * t) + harmonic * math.sin(4 * math.pi * freq * t)
        out.append(s * env / (1 + harmonic))
    return out


def seq(*parts, gap=0.0):
    out = []
    for p in parts:
        out.extend(p)
        out.extend([0.0] * int(RATE * gap))
    return out


def mix_offset(base, add, offset):
    start = int(RATE * offset)
    out = base + [0.0] * max(0, start + len(add) - len(base))
    for i, s in enumerate(add):
        out[start + i] += s
    return out


def write(name, samples):
    peak = max(abs(s) for s in samples) or 1
    # 3 ms fade-out to avoid a click at the end.
    fade = int(RATE * 0.003)
    for i in range(fade):
        samples[-1 - i] *= i / fade
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(s / peak * PEAK * 32767)) for s in samples))
    print(f"{name}.wav  {len(samples) / RATE * 1000:.0f} ms")


write("treidify_tap", tone(1320, 0.045, 0.012))
write("treidify_tick", tone(1760, 0.03, 0.007, harmonic=0.08))
write("treidify_toggle", mix_offset(tone(880, 0.09, 0.025), tone(1175, 0.08, 0.022), 0.035))
write("treidify_success", mix_offset(tone(1046.5, 0.16, 0.05), tone(1318.5, 0.2, 0.07), 0.07))
write("treidify_error", mix_offset(tone(392, 0.14, 0.045, harmonic=0.1), tone(349.2, 0.16, 0.05, harmonic=0.1), 0.08))
write("treidify_activate", mix_offset(mix_offset(tone(784, 0.14, 0.045), tone(1046.5, 0.16, 0.05), 0.07), tone(1568, 0.24, 0.08), 0.14))
write("treidify_connect", mix_offset(tone(659.3, 0.14, 0.045), tone(987.8, 0.2, 0.07), 0.06))
