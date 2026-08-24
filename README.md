# NEON.LAB

> Cyberpunk **Web Audio synthesizer** & **dual-deck DJ mashup rig** — built with Vite, Tone.js, and Tailwind.

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

This is a **Vite** project. Vercel autodetects it; `vercel.json` also pins the framework, build command, and output directory so no manual project settings are needed.

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |

Just push the repo and click Import in Vercel.

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
index.html                  Vite entry, references /src/main.js
src/
  main.js                   Bootstrap: unlock audio, mount modules
  styles.css                Cyberpunk / glassmorphism theme
  modules/ui.js             Tabs, clock, rotary-knob interaction
  modules/synth.js          Poly synth signal chain + keyboard
  modules/dj.js             Dual decks, mixer, FX, demo-loop generator
package.json                npm scripts + Tone.js dependency
vite.config.js              Vite dev/build config (host, port, dist)
vercel.json                 Vercel deploy config
```

## License

MIT — see [`LICENSE`](./LICENSE).
