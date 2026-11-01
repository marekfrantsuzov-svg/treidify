"use client";

/**
 * Optional interface sounds, synthesised with WebAudio (no audio files, nothing to download).
 * Off by default. The AudioContext is only created after the person turns sounds on, which is itself a user gesture,
 * so browser autoplay rules are respected. Preferences live in localStorage on this device.
 */
export type SoundKind = "tap" | "nav" | "connect" | "news" | "alert";
export interface SoundPrefs { on: boolean; volume: number }

const KEY = "treidify.sound";
const DEFAULT: SoundPrefs = { on: false, volume: 0.5 };
let ctx: AudioContext | null = null;
const listeners = new Set<(p: SoundPrefs) => void>();

export function readSoundPrefs(): SoundPrefs {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<SoundPrefs> | null;
    return { on: !!v?.on, volume: typeof v?.volume === "number" ? Math.min(1, Math.max(0, v.volume)) : DEFAULT.volume };
  } catch { return DEFAULT; }
}

export function writeSoundPrefs(p: SoundPrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
  listeners.forEach((l) => l(p));
}

export function onSoundPrefs(l: (p: SoundPrefs) => void) { listeners.add(l); return () => { listeners.delete(l); }; }

/** Pitch, length and shape per sound. Short and quiet: these confirm an action, they never demand attention. */
const VOICE: Record<SoundKind, { f: number[]; d: number; type: OscillatorType; gain: number }> = {
  tap: { f: [880], d: 0.05, type: "sine", gain: 0.05 },
  nav: { f: [660, 990], d: 0.07, type: "sine", gain: 0.05 },
  connect: { f: [523, 659, 784], d: 0.09, type: "triangle", gain: 0.07 },
  news: { f: [740, 988], d: 0.1, type: "sine", gain: 0.06 },
  alert: { f: [988, 740, 988], d: 0.12, type: "square", gain: 0.035 },
};

export function playSound(kind: SoundKind, force = false) {
  if (typeof window === "undefined") return;
  const p = readSoundPrefs();
  if ((!p.on && !force) || p.volume <= 0) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && kind === "tap") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const v = VOICE[kind];
    let t = ctx.currentTime;
    for (const f of v.f) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = v.type; o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v.gain * p.volume, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + v.d);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + v.d + 0.02);
      t += v.d * 0.8;
    }
  } catch { /* audio unavailable: stay silent */ }
}
