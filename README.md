# NEON.LAB — Web Audio Synth & DJ Mashup Station

A browser-based, cyberpunk-themed audio workstation built with vanilla **HTML + Tailwind (CDN) + JavaScript + Tone.js**. Two tabs:

1. **Synthesizer Deck** — 2-octave polyphonic playable keyboard, oscillator selector, ADSR envelope, reverb / delay / low-pass filter, real-time VU meter and waveform scope.
2. **DJ Mashup Rig** — Dual decks with drop-to-load, waveform + spinning vinyl, ±16% pitch, 3-band EQ, hot cues, loops, tap tempo, beat sync, and momentary FX pads (Stutter / Filter Sweep / Bitcrusher). Includes 4 synthesized demo loops so it works immediately with no uploads.

> Note on the "C++" part of the brief: browsers can't execute native C++, and the Web Audio API is a JavaScript API. This app uses HTML/CSS/JS with Tone.js, which is the only production-ready way to run in a browser with no build step. `vercel.json` is included so you can deploy the folder to Vercel as-is.

## Run locally

Any static file server works — no build step required.

```bash
# Python
python3 -m http.server 8080

# or Node
npx serve .
```

Then open http://localhost:8080 and click **INITIALIZE AUDIO ENGINE**.

## Deploy to Vercel

1. `vercel` (Vercel CLI) or push to GitHub and import into Vercel.
2. No build command needed — this is a plain static site.
3. `vercel.json` sets cache headers and safe defaults.

## Controls

### Synth
- **Keys** A S D F G H J → C4 D4 E4 F4 G4 A4 B4 (octave ±1 buttons transpose)
- Click / touch the on-screen keys (whites + blacks)

### DJ
- `Q` / `P` — Deck A / Deck B play–pause
- `Space` — Tap tempo
- `1`/`2`/`3` — Deck A cues, `8`/`9`/`0` — Deck B cues
- `Z`/`X`/`C` — Stutter / Filter Sweep / Bitcrusher (momentary while held)
- Right-click a hot-cue button to clear it
- Drag audio files onto the vinyl to load a track

## File layout

```
index.html          # Layout + Tailwind config
styles.css          # Cyberpunk / glassmorphism styling
js/ui.js            # Shared UI helpers (tabs, knobs, clock)
js/synth.js         # Synthesizer audio graph + keyboard
js/dj.js            # Dual-deck DJ engine, mixer, FX, demo loop generator
js/app.js           # Bootstrap after user-gesture audio unlock
vercel.json         # Static-site config for Vercel
```
