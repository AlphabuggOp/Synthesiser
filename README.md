# NEON.LAB — Web Audio Synth & DJ Mashup Station

A browser-based, cyberpunk-themed audio workstation built with **Vite + Tone.js + Tailwind**. Two tabs:

1. **Synthesizer Deck** — 2-octave polyphonic playable keyboard, oscillator selector, ADSR envelope, reverb / delay / low-pass filter, real-time VU meter and waveform scope.
2. **DJ Mashup Rig** — Dual decks with drop-to-load, waveform + spinning vinyl, ±16% pitch, 3-band EQ, hot cues, loops, tap tempo, beat sync, and momentary FX pads (Stutter / Filter Sweep / Bitcrusher). Includes 4 synthesized demo loops so it works immediately with no uploads.

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
```

## Build & preview

```bash
npm run build     # emits ./dist
npm run preview   # serves dist on :4173
```

## Deploy to Vercel

This is a **Vite** project — Vercel autodetects it (`vercel.json` also pins framework, build command, and output directory).

- Framework: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Push to GitHub and import the repo into Vercel — that's it, no other config needed. (Vercel serves the built `dist/` folder, not the raw source `index.html`; that's why the previous CDN-based version was returning 404.)

## Controls

### Synth
- **Keys** `A S D F G H J` → C4 D4 E4 F4 G4 A4 B4 (octave ±1 buttons transpose)
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
index.html                  # Vite entry (references /src/main.js)
src/
  main.js                   # Bootstrap: unlock audio, mount modules
  styles.css                # Cyberpunk / glassmorphism theme
  modules/ui.js             # Tabs, clock, rotary knob interaction
  modules/synth.js          # Poly synth audio graph + keyboard
  modules/dj.js             # Dual decks, mixer, FX, demo-loop generator
package.json                # npm scripts + Tone.js dependency
vite.config.js              # Vite dev/build config (host, port, dist)
vercel.json                 # Vercel deploy config
```
