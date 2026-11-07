# Treidify launch film: video production

Everything for the 56-second Treidify product film lives in this folder. It is fully isolated from the
live app: nothing here is imported by `web/`, `backend/` or `ios/`, nothing touches production data or deploys,
and the capture step only ever talks to a **local** dev server with a **local** database.

| | |
| --- | --- |
| Length | 56.0 s (3360 frames) |
| Frame rate | 60 fps |
| Canvas | 1920×1080 layout, rendered at `--scale=2` for a true 3840×2160 master |
| Audio | 48 kHz stereo, normalised to −14 LUFS, −1 dBTP |
| Tempo | 120 BPM: every scene change lands on a downbeat (1 bar = 120 frames) |

## Folder map

```
video-production/
  capture/            Playwright scripts that sign in to a LOCAL Treidify app and screenshot the real UI
    signup.mjs        creates a local demo user (local server + local DB only)
    capture.mjs       captures every screen at 3840×2160 (and the landing sections)
  assets/ui/          raw 3840×2160 captures (assets/ui-4x: landing macro section at 4× density)
  tools/
    crops.py          cuts individual interface cards out of the captures into film/public/ui
    make_audio.py     synthesises the soundtrack + sound design, beat-locked to film/timeline.json
  film/               the Remotion project (the editable source)
    timeline.json     scene ranges and every sound-effect cue, in frames (single source of truth)
    src/Film.tsx      the whole film on one timeline
    src/scenes/       S1Opening … S8Finale, one file per storyboard scene
    src/components.tsx  stage/camera, kinetic type, light sweeps, glass cards, logo lockup
    public/ui/        interface layers used by the film (real captures, never redrawn)
    public/brand/     official Treidify T mark (unmodified, from web/public/brand)
    public/fonts/     Geist + Inter, the same files the web app ships
    public/sfx/       Treidify's own interface sounds (from ios/Treidify/Resources/Sounds)
    public/audio/     soundtrack.wav (mix), music.wav and sfx.wav stems
```

## Re-render

Requirements: Node 20+, ffmpeg, Python 3 with `numpy scipy soundfile` (only to rebuild the audio), and a
Chromium. On a Mac with Chrome installed Remotion finds it automatically.

```bash
cd video-production/film
npm install

npm run studio                     # live, scrubbable preview in the browser (Remotion Studio)

# 1080p60 preview
npx remotion render src/index.ts TreidifyFilm out/raw-1080p60.mp4 --codec=h264 --crf=16

# 4K60 master (same layout, rendered at 2× device scale from the 3840×2160 captures)
npx remotion render src/index.ts TreidifyFilm out/raw-4k60.mp4 --codec=h264 --crf=14 --scale=2
#   or ProRes for finishing:  --codec=prores --prores-profile=hq

# Loudness-normalise the final audio (−14 LUFS for web/YouTube), video stream copied untouched
ffmpeg -i out/raw-4k60.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=9 -c:a aac -b:a 320k out/treidify-launch-4k60.mp4
```

In this cloud session the renders used `--browser-executable` pointing at a pre-installed headless Chromium;
on your Mac you can leave that flag out.

### Change the music

`film/public/audio/soundtrack.wav` is what the film plays. To use a different track (for example the
ElevenLabs Music track generated in Higgsfield), mix it with `public/audio/sfx.wav` and replace `soundtrack.wav`:

```bash
ffmpeg -i new-music.mp3 -i film/public/audio/sfx.wav -filter_complex "[0:a]volume=0.85[m];[m][1:a]amix=inputs=2:normalize=0[a]" -map "[a]" -t 56 -ar 48000 film/public/audio/soundtrack.wav
```

Keep the new track at 120 BPM with its first downbeat at 4.0 s and every cut stays on the beat.

### Rebuild audio / layers / captures

```bash
python3 tools/make_audio.py        # deterministic: same output on every run
python3 tools/crops.py             # re-cut layers after a new capture
# new captures (needs the web app running locally with a local Postgres, see web/README.md):
cd capture && ln -s ../../web/node_modules node_modules
DATABASE_URL=postgres://…localhost… node signup.mjs   # once; then: npx tsx scripts/seed-sample-account.ts demo@treidify.local (from web/)
node capture.mjs
```


## v2 commercial (current): "Treidify · Trade with clarity"

The 71.5 s narrated commercial replaced the first 56 s cut. It lives beside it in the same Remotion project:

| | |
| --- | --- |
| Composition | `TreidifyCommercial` (`film/src/v2/`, timeline in `film/commercial.json`) |
| Length | 71.5 s, 4290 frames at 60 fps, 1920×1080 (captures are 2×/3×, so `--scale=2` gives a sharp 4K) |
| Narration | `film/public/vo/lineNN.wav` + word timings `lines.json` (Kokoro TTS, Apache-2.0, voice `af_heart` with British-English phonemes) |
| Score + SFX | `tools/make_audio2.py` → `film/public/audio2/mix.wav` (+ `vo`, `music`, `sfx` stems), original synthesis + Treidify UI sounds |
| Layers | `capture/capture-v2.mjs` (iPhone 393×852 @3×, light + dark, desktop chart overlay states) → `tools/crops2.py` → `film/public/v2` |
| Text QA | `node qa.mjs 1` renders every frame and writes `out/qa-report.txt`: any two visible text boxes that intersect, and text outside a 40 px safe margin |

```bash
cd video-production/film
python3 ../tools/make_audio2.py
npx remotion render src/index.ts TreidifyCommercial out/v2-raw.mp4 --codec=h264 --crf=16
ffmpeg -i out/v2-raw.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 320k -ar 48000 out/treidify-commercial-1080p60.mp4
# 4K: add --scale=2 to the render
```

To re-voice with another engine (for example an ElevenLabs voice), replace `film/public/vo/lineNN.wav`, regenerate
`lines.json` word timings (see the README section above for the script used) and adjust `film/commercial.json` → `vo` start frames.

Honesty in v2: the MT5 scene shows only "MetaTrader 5" and "Treidify" (the MT5 tile is a neutral terminal glyph, not the
MetaQuotes logo). "Secure, read-only connection" is not shown, because the read-only MetaApi link is coded but not yet
verified live. Calendar events are the landing page's labelled "Example events"; the AI Coach card is labelled "Illustrative".

## Honesty rules the film follows

- Every interface frame is a real screenshot of the Treidify web app (dashboard, Markets, Analysis, Macro Desk,
  Account Health, Journal, Accounts, AI Coach) or of Treidify's own landing-page components.
- Data is the app's built-in **sample account** and **sample bars**; their "Sample", "Sample bars · not live",
  "Illustrative" and "Example events" badges stay visible, and a footnote in each scene says so.
- Capture-only cosmetics: the Next.js dev indicator, the cookie banner and the wide "Market data is not connected"
  notice are hidden during capture. Nothing in the app was changed.
- MT5: the film shows the read-only investor-password link and the labelled sample MT5 account. It does not show
  a "live sync" success state, because production sync is not switched on yet (no MetaApi token).
- AI Coach is labelled "illustrative preview" (AI keys are not configured in production). The economic calendar uses
  the landing page's labelled example events, because the live calendar feed is not connected yet.
- No prices are presented as live, no outcomes as guaranteed, no pricing or subscription call to action.
