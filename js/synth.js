/* =========================================================
   synth.js — Interactive polyphonic synthesizer
   Signal chain:
     PolySynth -> Filter (LP) -> FeedbackDelay -> Reverb -> Meter -> Master (Volume) -> Destination
   ========================================================= */

const Synth = (() => {
  // --- Audio nodes (created lazily inside init to avoid pre-user-gesture issues)
  let poly, filter, delay, reverb, master, meter, scopeAnalyser;
  let currentOsc = 'sine';
  let octaveShift = 0;

  // Track active voices per note so key repeat and mouseleave behave nicely
  const activeVoices = new Set();

  // 12 chromatic notes across two octaves used by the on-screen keyboard
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

  // Computer key -> base note (C4-B4). Octave transpose applied at play-time.
  const KEY_MAP = { a: 'C4', s: 'D4', d: 'E4', f: 'F4', g: 'G4', h: 'A4', j: 'B4' };

  /** Build the visual keyboard */
  function buildKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';

    // Layout: white keys flexed, black keys absolutely positioned over gaps.
    const whiteKeys = KEYBOARD_NOTES.filter((k) => k.type === 'white');
    const row = document.createElement('div');
    row.className = 'keyboard-row';
    kb.appendChild(row);

    // Whites
    whiteKeys.forEach((k) => {
      const div = document.createElement('div');
      div.className = 'key-white';
      div.dataset.note = k.note;
      div.innerHTML = `<span class="key-label">${k.label || ''}</span>`;
      row.appendChild(div);
    });

    // Blacks — position relative to the whites they sit between
    const whiteCount = whiteKeys.length;
    const whiteFraction = 1 / whiteCount;
    KEYBOARD_NOTES.forEach((k, i) => {
      if (k.type !== 'black') return;
      // Find the white key to the LEFT of this black
      const leftWhiteIndex = whiteKeys.findIndex((w) => w.note === KEYBOARD_NOTES[i - 1].note);
      const leftPct = (leftWhiteIndex + 1) * whiteFraction - (whiteFraction * 0.325);
      const div = document.createElement('div');
      div.className = 'key-black';
      div.dataset.note = k.note;
      div.style.left = (leftPct * 100) + '%';
      row.appendChild(div);
    });

    // Pointer handlers (mouse + touch)
    const notesByEl = new Map();
    kb.querySelectorAll('[data-note]').forEach((el) => notesByEl.set(el, el.dataset.note));

    const pressFromPointer = (e) => {
      const el = document.elementFromPoint(
        (e.touches ? e.touches[0].clientX : e.clientX),
        (e.touches ? e.touches[0].clientY : e.clientY)
      );
      if (el && el.dataset.note) {
        pressKey(el.dataset.note, el);
      }
    };

    kb.addEventListener('pointerdown', (e) => {
      const t = e.target.closest('[data-note]');
      if (!t) return;
      t.setPointerCapture(e.pointerId);
      pressKey(t.dataset.note, t);
    });
    kb.addEventListener('pointerup', (e) => {
      const t = e.target.closest('[data-note]');
      if (t) releaseKey(t.dataset.note, t);
    });
    kb.addEventListener('pointercancel', (e) => {
      const t = e.target.closest('[data-note]');
      if (t) releaseKey(t.dataset.note, t);
    });
    kb.addEventListener('pointerleave', (e) => {
      const t = e.target.closest('[data-note]');
      if (t) releaseKey(t.dataset.note, t);
    });
  }

  /** Apply octave shift to a note name */
  function transpose(note) {
    if (octaveShift === 0) return note;
    // Note like "C#4" -> pitch + octave
    const m = note.match(/^([A-G]#?)(\d)$/);
    if (!m) return note;
    return m[1] + (parseInt(m[2], 10) + octaveShift);
  }

  function pressKey(note, el) {
    if (!poly) return;
    const finalNote = transpose(note);
    if (activeVoices.has(finalNote)) return;
    activeVoices.add(finalNote);
    poly.triggerAttack(finalNote, Tone.now());
    if (el) el.classList.add('active');
    document.getElementById('lastNote').textContent = finalNote;
    document.getElementById('voiceCount').textContent = String(activeVoices.size);
  }

  function releaseKey(note, el) {
    if (!poly) return;
    const finalNote = transpose(note);
    if (!activeVoices.has(finalNote)) {
      // Also clear visual if double-fired
      if (el) el.classList.remove('active');
      return;
    }
    activeVoices.delete(finalNote);
    poly.triggerRelease(finalNote, Tone.now());
    if (el) el.classList.remove('active');
    document.getElementById('voiceCount').textContent = String(activeVoices.size);
  }

  /** Wire computer-keyboard bindings for the synth tab */
  function bindKeyboardEvents() {
    const downKeys = new Set();
    window.addEventListener('keydown', (e) => {
      if (document.getElementById('tab-synth').classList.contains('hidden')) return;
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (!KEY_MAP[k]) return;
      if (downKeys.has(k)) return;
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

  /** Wire UI controls to audio parameters */
  function bindControls() {
    // Oscillator selector — smooth switching by ramping the destination gain briefly? Tone handles this cleanly enough
    document.querySelectorAll('#oscButtons .osc-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#oscButtons .osc-btn').forEach((b) => b.classList.remove('osc-active'));
        btn.classList.add('osc-active');
        currentOsc = btn.dataset.osc;
        // Set oscillator type on all voices in a click-safe way
        poly.set({ oscillator: { type: currentOsc } });
      });
    });

    // Octave selector
    document.querySelectorAll('#octaveButtons .oct-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#octaveButtons .oct-btn').forEach((b) => b.classList.remove('oct-active'));
        btn.classList.add('oct-active');
        octaveShift = parseInt(btn.dataset.oct, 10);
      });
    });

    // ADSR
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

    // Reverb
    bindRange('revDecay', 'revDecayVal', (v) => `${(v / 10).toFixed(1)} s`, (v) => reverb.decay = Math.max(0.1, v / 10));
    bindRange('revMix', 'revMixVal', (v) => `${v.toFixed(0)}%`, (v) => reverb.wet.rampTo(v / 100, 0.05));

    // Delay
    bindRange('dlyTime', 'dlyTimeVal', (v) => `${v.toFixed(0)} ms`, (v) => delay.delayTime.rampTo(v / 1000, 0.05));
    bindRange('dlyFb', 'dlyFbVal', (v) => `${v.toFixed(0)}%`, (v) => delay.feedback.rampTo(v / 100, 0.05));

    // Filter (log-ish sweep for musicality)
    bindRange('filter', 'filterVal', (v) => `${v.toFixed(0)} Hz`, (v) => filter.frequency.rampTo(v, 0.05));

    // Master
    bindRange('master', 'masterVal', (v) => `${v.toFixed(0)} dB`, (v) => master.volume.rampTo(v, 0.05));
  }

  /** VU meter + scope loop using rAF */
  function startMeterLoop() {
    const bar = document.getElementById('vuBar');
    const canvas = document.getElementById('scope');
    const ctx = canvas.getContext('2d');
    // Ensure canvas backing store matches CSS size for sharp lines
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = () => {
      // Meter returns dB. Map -60..0 to 0..100%.
      const db = meter.getValue();
      const pct = UI.clamp(UI.mapRange(db, -60, 0, 0, 100), 0, 100);
      bar.style.width = pct + '%';

      // Scope
      const buf = scopeAnalyser.getValue();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeStyle = 'rgba(34,211,238,0.9)';
      ctx.beginPath();
      const N = buf.length;
      for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * canvas.width;
        const y = (0.5 - buf[i] * 0.5) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /** Initialize the synthesizer. Call after audio context has been unlocked. */
  function init() {
    // Signal chain construction
    master = new Tone.Volume(-6);
    meter = new Tone.Meter({ smoothing: 0.8 });
    scopeAnalyser = new Tone.Waveform(256);

    reverb = new Tone.Reverb({ decay: 2, wet: 0.3, preDelay: 0.01 });
    reverb.generate(); // pre-render impulse response

    delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: 0.35 });
    filter = new Tone.Filter({ type: 'lowpass', frequency: 8000, Q: 0.7 });

    poly = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.4 },
    });
    poly.maxPolyphony = 16;

    // Chain: poly -> filter -> delay -> reverb -> master -> destination
    poly.chain(filter, delay, reverb, master, Tone.Destination);
    // Tap for meters after master
    master.connect(meter);
    master.connect(scopeAnalyser);

    buildKeyboard();
    bindKeyboardEvents();
    bindControls();
    startMeterLoop();
  }

  return { init };
})();
