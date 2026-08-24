/* =========================================================
   synth.js — Polyphonic Tone.js synthesizer.
   Signal chain:
     PolySynth -> Filter -> FeedbackDelay -> Reverb -> Master (Volume) -> Destination
   ========================================================= */

import { UI } from './ui.js';

export function initSynth(Tone) {
  // --- Notes rendered on the on-screen keyboard (2 octaves) ---
  const KEYBOARD_NOTES = [
    { note: 'C4',  type: 'white', label: 'A' },
    { note: 'C#4', type: 'black' },
    { note: 'D4',  type: 'white', label: 'S' },
    { note: 'D#4', type: 'black' },
    { note: 'E4',  type: 'white', label: 'D' },
    { note: 'F4',  type: 'white', label: 'F' },
    { note: 'F#4', type: 'black' },
    { note: 'G4',  type: 'white', label: 'G' },
    { note: 'G#4', type: 'black' },
    { note: 'A4',  type: 'white', label: 'H' },
    { note: 'A#4', type: 'black' },
    { note: 'B4',  type: 'white', label: 'J' },
    { note: 'C5',  type: 'white' },
    { note: 'C#5', type: 'black' },
    { note: 'D5',  type: 'white' },
    { note: 'D#5', type: 'black' },
    { note: 'E5',  type: 'white' },
    { note: 'F5',  type: 'white' },
    { note: 'F#5', type: 'black' },
    { note: 'G5',  type: 'white' },
    { note: 'G#5', type: 'black' },
    { note: 'A5',  type: 'white' },
    { note: 'A#5', type: 'black' },
    { note: 'B5',  type: 'white' },
  ];
  const KEY_MAP = { a: 'C4', s: 'D4', d: 'E4', f: 'F4', g: 'G4', h: 'A4', j: 'B4' };

  // Audio graph
  const master = new Tone.Volume(-6);
  const meter = new Tone.Meter({ smoothing: 0.8 });
  const scopeAnalyser = new Tone.Waveform(256);

  const reverb = new Tone.Reverb({ decay: 2, wet: 0.3, preDelay: 0.01 });
  reverb.generate();

  const delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: 0.35 });
  const filter = new Tone.Filter({ type: 'lowpass', frequency: 8000, Q: 0.7 });

  const poly = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.4 },
  });
  poly.maxPolyphony = 16;
  poly.chain(filter, delay, reverb, master, Tone.Destination);
  master.connect(meter);
  master.connect(scopeAnalyser);

  let octaveShift = 0;
  const activeVoices = new Set();

  function transpose(note) {
    if (octaveShift === 0) return note;
    const m = note.match(/^([A-G]#?)(\d)$/);
    if (!m) return note;
    return m[1] + (parseInt(m[2], 10) + octaveShift);
  }

  function pressKey(note, el) {
    const finalNote = transpose(note);
    if (activeVoices.has(finalNote)) return;
    activeVoices.add(finalNote);
    poly.triggerAttack(finalNote, Tone.now());
    if (el) el.classList.add('active');
    document.getElementById('lastNote').textContent = finalNote;
    document.getElementById('voiceCount').textContent = String(activeVoices.size);
  }

  function releaseKey(note, el) {
    const finalNote = transpose(note);
    if (!activeVoices.has(finalNote)) { if (el) el.classList.remove('active'); return; }
    activeVoices.delete(finalNote);
    poly.triggerRelease(finalNote, Tone.now());
    if (el) el.classList.remove('active');
    document.getElementById('voiceCount').textContent = String(activeVoices.size);
  }

  function buildKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    const whiteKeys = KEYBOARD_NOTES.filter((k) => k.type === 'white');
    const row = document.createElement('div');
    row.className = 'keyboard-row';
    kb.appendChild(row);

    whiteKeys.forEach((k) => {
      const div = document.createElement('div');
      div.className = 'key-white';
      div.dataset.note = k.note;
      div.innerHTML = `<span class="key-label">${k.label || ''}</span>`;
      row.appendChild(div);
    });

    const whiteCount = whiteKeys.length;
    const whiteFraction = 1 / whiteCount;
    KEYBOARD_NOTES.forEach((k, i) => {
      if (k.type !== 'black') return;
      const leftWhiteIndex = whiteKeys.findIndex((w) => w.note === KEYBOARD_NOTES[i - 1].note);
      const leftPct = (leftWhiteIndex + 1) * whiteFraction - (whiteFraction * 0.325);
      const div = document.createElement('div');
      div.className = 'key-black';
      div.dataset.note = k.note;
      div.style.left = (leftPct * 100) + '%';
      row.appendChild(div);
    });

    kb.addEventListener('pointerdown', (e) => {
      const t = e.target.closest('[data-note]');
      if (!t) return;
      t.setPointerCapture(e.pointerId);
      pressKey(t.dataset.note, t);
    });
    kb.addEventListener('pointerup', (e) => {
      const t = e.target.closest('[data-note]'); if (t) releaseKey(t.dataset.note, t);
    });
    kb.addEventListener('pointercancel', (e) => {
      const t = e.target.closest('[data-note]'); if (t) releaseKey(t.dataset.note, t);
    });
    kb.addEventListener('pointerleave', (e) => {
      const t = e.target.closest('[data-note]'); if (t) releaseKey(t.dataset.note, t);
    });
  }

  function bindKeyboardEvents() {
    const downKeys = new Set();
    window.addEventListener('keydown', (e) => {
      if (document.getElementById('tab-synth').classList.contains('hidden')) return;
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (!KEY_MAP[k] || downKeys.has(k)) return;
      downKeys.add(k);
      const base = KEY_MAP[k];
      const el = document.querySelector(`[data-note="${base}"]`);
      pressKey(base, el);
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (!KEY_MAP[k]) return;
      downKeys.delete(k);
      const base = KEY_MAP[k];
      const el = document.querySelector(`[data-note="${base}"]`);
      releaseKey(base, el);
    });
  }

  function bindControls() {
    document.querySelectorAll('#oscButtons .osc-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#oscButtons .osc-btn').forEach((b) => b.classList.remove('osc-active'));
        btn.classList.add('osc-active');
        poly.set({ oscillator: { type: btn.dataset.osc } });
      });
    });

    document.querySelectorAll('#octaveButtons .oct-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#octaveButtons .oct-btn').forEach((b) => b.classList.remove('oct-active'));
        btn.classList.add('oct-active');
        octaveShift = parseInt(btn.dataset.oct, 10);
      });
    });

    const bindRange = (id, valId, fmt, cb) => {
      const inp = document.getElementById(id);
      const out = document.getElementById(valId);
      const apply = () => {
        const v = parseFloat(inp.value);
        out.textContent = fmt(v);
        cb(v);
      };
      inp.addEventListener('input', apply);
      apply();
    };

    bindRange('attack', 'attackVal', (v) => `${v.toFixed(0)} ms`, (v) => poly.set({ envelope: { attack: v / 1000 } }));
    bindRange('decay', 'decayVal', (v) => `${v.toFixed(0)} ms`, (v) => poly.set({ envelope: { decay: v / 1000 } }));
    bindRange('sustain', 'sustainVal', (v) => (v / 100).toFixed(2), (v) => poly.set({ envelope: { sustain: v / 100 } }));
    bindRange('release', 'releaseVal', (v) => `${v.toFixed(0)} ms`, (v) => poly.set({ envelope: { release: v / 1000 } }));

    bindRange('revDecay', 'revDecayVal', (v) => `${(v / 10).toFixed(1)} s`, (v) => reverb.decay = Math.max(0.1, v / 10));
    bindRange('revMix', 'revMixVal', (v) => `${v.toFixed(0)}%`, (v) => reverb.wet.rampTo(v / 100, 0.05));

    bindRange('dlyTime', 'dlyTimeVal', (v) => `${v.toFixed(0)} ms`, (v) => delay.delayTime.rampTo(v / 1000, 0.05));
    bindRange('dlyFb', 'dlyFbVal', (v) => `${v.toFixed(0)}%`, (v) => delay.feedback.rampTo(v / 100, 0.05));

    bindRange('filter', 'filterVal', (v) => `${v.toFixed(0)} Hz`, (v) => filter.frequency.rampTo(v, 0.05));
    bindRange('master', 'masterVal', (v) => `${v.toFixed(0)} dB`, (v) => master.volume.rampTo(v, 0.05));
  }

  function startMeterLoop() {
    const bar = document.getElementById('vuBar');
    const canvas = document.getElementById('scope');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const resize = () => { canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr; };
    resize(); window.addEventListener('resize', resize);

    const tick = () => {
      const db = meter.getValue();
      const pct = UI.clamp(UI.mapRange(db, -60, 0, 0, 100), 0, 100);
      bar.style.width = pct + '%';

      const buf = scopeAnalyser.getValue();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeStyle = 'rgba(34,211,238,0.9)';
      ctx.beginPath();
      const N = buf.length;
      for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * canvas.width;
        const y = (0.5 - buf[i] * 0.5) * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  buildKeyboard();
  bindKeyboardEvents();
  bindControls();
  startMeterLoop();
}
