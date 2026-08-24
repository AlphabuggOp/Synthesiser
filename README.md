# NEON.LAB

> Cyberpunk **Web Audio synthesizer** & **dual-deck DJ mashup rig** — built with **Vite + Tailwind + Tone.js**. The entire UI is rendered from JavaScript; `index.html` is a 10-line stub whose only job is to load the JS bundle.

Two tabs, one browser tab:

- **Synth Deck** — 2-octave polyphonic playable keyboard, oscillator selector, ADSR envelope, reverb / delay / low-pass filter, real-time VU meter and mini oscilloscope.
- **DJ Rig** — Dual decks with drop-to-load, waveform + spinning vinyl, ±16 % pitch, 3-band EQ, hot cues, beat-quantized loops, tap tempo, beat sync, and momentary FX pads (Stutter / Filter Sweep / Bitcrusher). 4 synthesized demo loops ship built-in so both decks work with zero uploads.

---

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
```

## Production build

```bash
npm run build     # emits ./dist
npm run preview   # serves ./dist on :4173
```

## Deploy to Vercel

This is a **zero-config Vite project**. Import the repo and click Deploy — that's it. Vercel automatically:

| Setting            | Auto-detected value |
| ------------------ | ------------------- |
| Framework preset   | **Vite**            |
| Install command    | `npm install`       |
| Build command      | `npm run build`     |
| Output directory   | `dist`              |

**If Vercel returns "NOT_FOUND" after deploy**, it's almost always one of these:
1. **Wrong Root Directory** — in Vercel → Project → Settings → General, "Root Directory" must be blank (or `.`), not `dist/` or `src/`.
2. **Framework preset overridden** — leave "Framework Preset" set to **Vite** (Vercel picks it automatically from `package.json`).
3. **A stale `vercel.json`** — this repo intentionally ships **no `vercel.json`** so Vercel's zero-config detection isn't overridden. If you add one back, make sure `outputDirectory` is `dist`.

---

## Controls

### Synth tab

| Input | Action |
| --- | --- |
| `A S D F G H J` | C4 D4 E4 F4 G4 A4 B4 |
| Octave −1 / 0 / +1 buttons | Transpose the playable range |
| Click / touch on the on-screen keys | Play whites + blacks |

### DJ tab

| Input | Action |
| --- | --- |
| `Q` / `P` | Deck A / Deck B play–pause |
| `Space` | Tap tempo |
| `1` `2` `3` | Deck A hot cues 1–3 |
| `8` `9` `0` | Deck B hot cues 1–3 |
| `Z` `X` `C` | Stutter / Filter Sweep / Bitcrusher (momentary) |
| Right-click a cue button | Clear cue |
| Drag file onto the vinyl | Load a track |
| Click on the waveform | Jump to that position |

---

## File layout

```
index.html                  10-line Vite entry — loads /src/main.js
src/
  main.js                   Bootstrap: renderShell → unlock audio → mount modules
  template.js               Renders the whole UI from JavaScript (no HTML content)
  styles.css                Cyberpunk / glassmorphism theme
  modules/ui.js             Tabs, clock, rotary-knob interaction
  modules/synth.js          Poly synth signal chain + keyboard
  modules/dj.js             Dual decks, mixer, FX, demo-loop generator
package.json                npm scripts + Tone.js dependency
vite.config.js              Vite dev/build config
```

## Why not C++ ?

Browsers only execute JavaScript and WebAssembly. C++ can be compiled to WASM via Emscripten and loaded into an `AudioWorkletProcessor`, but that adds a native toolchain to the build (and Vercel's default build image doesn't have Emscripten). The Web Audio API already ships every DSP primitive we need, so this project stays in pure JS + Tone.js.

## License

MIT — see [`LICENSE`](./LICENSE).
