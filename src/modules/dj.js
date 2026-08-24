/* =========================================================
   dj.js — Dual-deck DJ mashup rig.
   Per-deck chain: Player -> BitCrusher -> AutoFilter -> stutter Gate -> EQ3 -> Volume -> CrossFade
   Mixer: CrossFade (equal-power) -> Master Volume -> Destination
   ========================================================= */

import { UI } from './ui.js';

export function initDJ(Tone) {
  // Central mixer nodes (created in initMixer once both decks exist).
  let crossfade, master;
  const decks = { A: null, B: null };
  const tapTimes = [];
  let fxTarget = 'A';

  function createDeck(id, rootEl) {
    const isA = id === 'A';

    // === Audio graph ===
    const player = new Tone.Player({ autostart: false, loop: false, fadeIn: 0.005, fadeOut: 0.01 });
    const crusher = new Tone.BitCrusher({ bits: 8, wet: 0 });
    const autoFilter = new Tone.AutoFilter({
      frequency: '2n',
      baseFrequency: 200,
      octaves: 5,
      wet: 0,
      filter: { type: 'lowpass', rolloff: -24 },
    }).start();
    const stutterGain = new Tone.Gain(1);
    const stutterLFO = new Tone.LFO({ frequency: 8, min: 0, max: 1, type: 'square' }).start();
    const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0, lowFrequency: 250, highFrequency: 2500 });
    const volume = new Tone.Volume(0);
    const meter = new Tone.Meter({ smoothing: 0.85 });

    player.chain(crusher, autoFilter, stutterGain, eq, volume);
    volume.connect(meter);

    const state = {
      id, player, crusher, autoFilter, stutterGain, stutterLFO, eq, volume, meter,
      stutterConnected: false,
      buffer: null, bpm: null, pitchPct: 0,
      loopBeats: 0, cues: [null, null, null],
      isPlaying: false, hasSource: false,
    };

    const $$ = (sel) => rootEl.querySelectorAll(sel);
    const vinylEl = rootEl.querySelector('[data-vinyl]');
    const waveCanvas = rootEl.querySelector('[data-wave]');
    const dropEl = rootEl.querySelector('[data-drop]');
    const emptyEl = rootEl.querySelector('[data-empty]');
    const bpmEl = rootEl.querySelector('[data-bpm]');
    const pitchInput = rootEl.querySelector('[data-pitch]');
    const pitchVal = rootEl.querySelector('[data-pitch-val]');
    const fileInput = rootEl.querySelector('[data-file]');

    let waveformPeaks = null;
    function computePeaks(buffer, targetBars = 256) {
      const raw = buffer.getChannelData(0);
      const step = Math.floor(raw.length / targetBars);
      const peaks = new Float32Array(targetBars);
      for (let i = 0; i < targetBars; i++) {
        let max = 0;
        const start = i * step;
        const end = start + step;
        for (let j = start; j < end; j += 32) {
          const v = Math.abs(raw[j] || 0);
          if (v > max) max = v;
        }
        peaks[i] = max;
      }
      waveformPeaks = peaks;
    }
    function drawWaveform() {
      const c = waveCanvas;
      const ctx = c.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
      ctx.clearRect(0, 0, c.width, c.height);
      if (!waveformPeaks) return;
      const mid = c.height / 2;
      const w = c.width / waveformPeaks.length;
      ctx.fillStyle = isA ? 'rgba(34,211,238,0.9)' : 'rgba(232,121,249,0.9)';
      for (let i = 0; i < waveformPeaks.length; i++) {
        const h = waveformPeaks[i] * (c.height * 0.9);
        ctx.fillRect(i * w, mid - h / 2, Math.max(1, w * 0.8), h);
      }
      if (state.hasSource && state.buffer) {
        const dur = state.buffer.duration;
        const cur = getCurrentTime();
        const px = (cur / dur) * c.width;
        ctx.fillStyle = 'rgba(163,230,53,0.95)';
        ctx.fillRect(px - 1, 0, 2 * dpr, c.height);
        state.cues.forEach((t, idx) => {
          if (t == null) return;
          const cx = (t / dur) * c.width;
          ctx.fillStyle = idx === 0 ? 'rgba(251,191,36,0.95)' : idx === 1 ? 'rgba(232,121,249,0.95)' : 'rgba(163,230,53,0.95)';
          ctx.fillRect(cx - 1, 0, 2 * dpr, c.height);
        });
      }
    }
    setInterval(drawWaveform, 60);
    window.addEventListener('resize', drawWaveform);

    let startedAt = 0;
    let offsetAt = 0;
    function getCurrentTime() {
      if (!state.buffer) return 0;
      if (!state.isPlaying) return offsetAt;
      const rate = player.playbackRate || 1;
      const elapsed = (Tone.now() - startedAt) * rate;
      let t = offsetAt + elapsed;
      if (state.loopBeats > 0 && state.bpm) {
        const loopLen = (60 / state.bpm) * state.loopBeats;
        const loopStart = offsetAt;
        if (t >= loopStart + loopLen) {
          t = loopStart + ((t - loopStart) % loopLen);
        }
      } else if (t > state.buffer.duration) {
        t = state.buffer.duration;
      }
      return t;
    }

    // Simple autocorrelation-based BPM estimate on the amplitude envelope.
    function estimateBPM(buffer) {
      const data = buffer.getChannelData(0);
      const sr = buffer.sampleRate;
      const N = Math.min(data.length, sr * 30);
      const winSize = Math.floor(sr / 200);
      const bins = Math.floor(N / winSize);
      const env = new Float32Array(bins);
      for (let i = 0; i < bins; i++) {
        let sum = 0;
        for (let j = 0; j < winSize; j++) { const v = data[i * winSize + j] || 0; sum += v * v; }
        env[i] = Math.sqrt(sum / winSize);
      }
      let mean = 0;
      for (let i = 0; i < bins; i++) mean += env[i];
      mean /= bins;
      for (let i = 0; i < bins; i++) env[i] -= mean;

      const lagMin = Math.floor((60 / 180) * 200);
      const lagMax = Math.floor((60 / 70) * 200);
      let bestLag = lagMin;
      let bestScore = -Infinity;
      for (let lag = lagMin; lag <= lagMax; lag++) {
        let s = 0;
        for (let i = 0; i < bins - lag; i++) s += env[i] * env[i + lag];
        if (s > bestScore) { bestScore = s; bestLag = lag; }
      }
      return Math.round(60 / (bestLag / 200));
    }

    async function loadBuffer(toneBuffer) {
      state.buffer = toneBuffer;
      state.hasSource = true;
      player.buffer = toneBuffer;
      offsetAt = 0;
      state.isPlaying = false;
      computePeaks(toneBuffer);
      drawWaveform();
      emptyEl.style.display = 'none';
      setTimeout(() => {
        try { state.bpm = estimateBPM(toneBuffer); bpmEl.textContent = String(state.bpm); }
        catch (e) { console.warn('BPM detection failed', e); }
      }, 10);
    }

    async function loadFromFile(file) {
      if (!file) return;
      if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)) {
        alert('Please choose a valid audio file (mp3/wav/ogg/m4a).');
        return;
      }
      try {
        const arrayBuf = await file.arrayBuffer();
        const audioBuf = await Tone.getContext().decodeAudioData(arrayBuf);
        await loadBuffer(new Tone.ToneAudioBuffer(audioBuf));
      } catch (e) {
        console.error(e);
        alert('Could not decode audio file.');
      }
    }

    function setTransportActive(mode) {
      $$('.dj-btn').forEach((b) => b.classList.remove('active'));
      const btn = rootEl.querySelector(`[data-act="${mode}"]`);
      if (btn) btn.classList.add('active');
    }

    function play() {
      if (!state.hasSource || state.isPlaying) return;
      const dur = state.buffer.duration;
      const off = Math.max(0, Math.min(offsetAt, dur - 0.01));
      startedAt = Tone.now();
      offsetAt = off;
      if (state.loopBeats > 0 && state.bpm) {
        const loopLen = (60 / state.bpm) * state.loopBeats;
        player.loop = true;
        player.loopStart = off;
        player.loopEnd = Math.min(dur, off + loopLen);
        player.start(Tone.now(), off);
      } else {
        player.loop = false;
        player.start(Tone.now(), off);
      }
      state.isPlaying = true;
      vinylEl.classList.add('spinning');
      setTransportActive('play');
    }
    function pause() {
      if (!state.hasSource || !state.isPlaying) return;
      offsetAt = getCurrentTime();
      player.stop();
      state.isPlaying = false;
      vinylEl.classList.remove('spinning');
      setTransportActive('pause');
    }
    function cue() {
      const target = state.cues[0] != null ? state.cues[0] : 0;
      const wasPlaying = state.isPlaying;
      if (wasPlaying) { player.stop(); state.isPlaying = false; }
      offsetAt = target;
      if (wasPlaying) play();
      else { drawWaveform(); vinylEl.classList.remove('spinning'); }
    }

    function setLoop(beats) {
      state.loopBeats = beats;
      $$('.loop-btn').forEach((b) => b.classList.toggle('active', parseInt(b.dataset.loop, 10) === beats));
      if (state.isPlaying) {
        const cur = getCurrentTime();
        player.stop();
        state.isPlaying = false;
        offsetAt = cur;
        play();
      }
    }

    function setOrRecallCue(idx) {
      const btn = rootEl.querySelector(`[data-cue="${idx}"]`);
      if (state.cues[idx] == null) {
        state.cues[idx] = getCurrentTime();
        btn.classList.add('set');
      } else {
        const wasPlaying = state.isPlaying;
        if (wasPlaying) { player.stop(); state.isPlaying = false; }
        offsetAt = state.cues[idx];
        if (wasPlaying) play();
        btn.classList.add('hit');
        setTimeout(() => btn.classList.remove('hit'), 200);
      }
      drawWaveform();
    }
    function clearCue(idx) {
      state.cues[idx] = null;
      const btn = rootEl.querySelector(`[data-cue="${idx}"]`);
      btn.classList.remove('set', 'hit');
      drawWaveform();
    }

    function setPitchPct(pct) {
      state.pitchPct = pct;
      player.playbackRate = 1 + pct / 100;
      pitchVal.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
    }

    function initKnobs() {
      rootEl.querySelectorAll('.knob').forEach((k) => {
        const band = k.dataset.eq;
        UI.attachKnob(k, {
          min: -24, max: 24, value: 0,
          onChange: (v) => { eq[band].rampTo(v, 0.02); },
        });
      });
    }

    function fxOn(name) {
      if (name === 'stutter') {
        if (!state.stutterConnected) { stutterLFO.connect(stutterGain.gain); state.stutterConnected = true; }
      } else if (name === 'sweep') {
        autoFilter.wet.rampTo(1, 0.02);
      } else if (name === 'crush') {
        crusher.wet.rampTo(1, 0.02);
      }
    }
    function fxOff(name) {
      if (name === 'stutter') {
        if (state.stutterConnected) {
          stutterLFO.disconnect(stutterGain.gain);
          state.stutterConnected = false;
          stutterGain.gain.rampTo(1, 0.02);
        }
      } else if (name === 'sweep') {
        autoFilter.wet.rampTo(0, 0.05);
      } else if (name === 'crush') {
        crusher.wet.rampTo(0, 0.02);
      }
    }

    // === Bindings ===
    fileInput.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) loadFromFile(f); });
    ['dragenter', 'dragover'].forEach((ev) => dropEl.addEventListener(ev, (e) => { e.preventDefault(); dropEl.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach((ev) => dropEl.addEventListener(ev, (e) => { e.preventDefault(); dropEl.classList.remove('drag-over'); }));
    dropEl.addEventListener('drop', (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) loadFromFile(f); });

    rootEl.querySelector('[data-act="play"]').addEventListener('click', play);
    rootEl.querySelector('[data-act="pause"]').addEventListener('click', pause);
    rootEl.querySelector('[data-act="cue"]').addEventListener('click', cue);

    rootEl.querySelectorAll('.loop-btn').forEach((b) => b.addEventListener('click', () => setLoop(parseInt(b.dataset.loop, 10))));

    rootEl.querySelectorAll('.demo-btn').forEach((b) => b.addEventListener('click', async () => {
      const kind = b.dataset.demo;
      const bpm = kind === 'house' ? 124 : kind === 'techno' ? 130 : kind === 'hiphop' ? 92 : 174;
      const tb = await generateDemoLoop(kind, bpm);
      await loadBuffer(tb);
      state.bpm = bpm;
      bpmEl.textContent = String(bpm);
      setLoop(4);
    }));

    rootEl.querySelectorAll('.cue-btn').forEach((b) => {
      const idx = parseInt(b.dataset.cue, 10);
      b.addEventListener('click', () => setOrRecallCue(idx));
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); clearCue(idx); });
    });

    pitchInput.addEventListener('input', () => setPitchPct(parseFloat(pitchInput.value)));

    waveCanvas.addEventListener('click', (e) => {
      if (!state.buffer) return;
      const rect = waveCanvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const t = x * state.buffer.duration;
      const wasPlaying = state.isPlaying;
      if (wasPlaying) { player.stop(); state.isPlaying = false; }
      offsetAt = t;
      if (wasPlaying) play();
      drawWaveform();
    });

    initKnobs();

    setInterval(() => {
      if (state.bpm) {
        const eff = state.bpm * (1 + state.pitchPct / 100);
        bpmEl.textContent = eff.toFixed(1);
      }
    }, 250);

    return Object.assign(state, {
      play, pause, cue, setLoop, setOrRecallCue,
      setPitchPct, fxOn, fxOff, loadFromFile, loadBuffer,
      getCurrentTime, drawWaveform, pitchInput, rootEl,
    });
  }

  /**
   * Render a 4-bar drum loop offline at the given BPM using Tone synths.
   * Returns a Tone.ToneAudioBuffer ready to feed into a Player.
   */
  async function generateDemoLoop(kind, bpm) {
    const bars = 4;
    const secondsPerBeat = 60 / bpm;
    const durSec = bars * 4 * secondsPerBeat;

    const buffer = await Tone.Offline(async ({ transport }) => {
      transport.bpm.value = bpm;
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.05, octaves: 6,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
      }).toDestination();
      const snare = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
      }).toDestination();
      const hat = new Tone.MetalSynth({
        frequency: 250, envelope: { attack: 0.001, decay: 0.05, release: 0.02 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
      }).toDestination();
      hat.volume.value = -18;
      snare.volume.value = -8;
      const bass = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0.2, release: 0.2 },
        filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.2, baseFrequency: 120, octaves: 3 },
      }).toDestination();
      bass.volume.value = -10;

      const stepsPerBar = 16;
      const totalSteps = bars * stepsPerBar;
      const sixteenth = secondsPerBeat / 4;
      const patterns = {
        house:  { kick:[1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], hat:[0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], bass:[1,0,0,1, 0,0,1,0, 1,0,0,0, 0,1,0,0] },
        techno: { kick:[1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], snare:[0,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0], hat:[1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], bass:[1,0,1,0, 0,1,0,0, 1,0,1,0, 0,0,1,0] },
        hiphop: { kick:[1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0], snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], hat:[1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], bass:[1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0] },
        dnb:    { kick:[1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0], snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], hat:[1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], bass:[1,0,0,1, 0,0,1,0, 1,0,0,0, 1,0,1,0] },
      };
      const bassNotes = { house: ['A1','A1','C2','A1'], techno:['C2','C2','G1','C2'], hiphop:['E1','E1','G1','E1'], dnb:['A1','C2','A1','G1'] };
      const pat = patterns[kind] || patterns.house;
      const bnotes = bassNotes[kind] || bassNotes.house;

      for (let s = 0; s < totalSteps; s++) {
        const stepInBar = s % stepsPerBar;
        const t = s * sixteenth;
        if (pat.kick[stepInBar])  kick.triggerAttackRelease('C1', '8n', t);
        if (pat.snare[stepInBar]) snare.triggerAttackRelease('16n', t);
        if (pat.hat[stepInBar])   hat.triggerAttackRelease('32n', t);
        if (pat.bass[stepInBar])  bass.triggerAttackRelease(bnotes[Math.floor(s / 4) % bnotes.length], '8n', t);
      }
    }, durSec);

    return new Tone.ToneAudioBuffer(buffer.get());
  }

  function initMixer() {
    // Equal-power crossfade → master volume → speakers.
    master = new Tone.Volume(-6);
    crossfade = new Tone.CrossFade(0.5);
    decks.A.volume.connect(crossfade.a);
    decks.B.volume.connect(crossfade.b);
    crossfade.connect(master);
    master.toDestination();
  }

  function initMixerControls() {
    const xf = document.getElementById('crossfader');
    const xfVal = document.getElementById('xfadeVal');
    xf.addEventListener('input', () => {
      const raw = parseFloat(xf.value);
      const t = (raw + 100) / 200;
      crossfade.fade.rampTo(t, 0.02);
      xfVal.textContent = raw === 0 ? 'CENTER' : (raw < 0 ? `A ${Math.abs(raw).toFixed(0)}%` : `B ${raw.toFixed(0)}%`);
    });

    const m = document.getElementById('djMaster');
    const mv = document.getElementById('djMasterVal');
    m.addEventListener('input', () => {
      const v = parseFloat(m.value);
      master.volume.rampTo(v, 0.02);
      mv.textContent = v.toFixed(0) + ' dB';
    });

    const tapBtn = document.getElementById('tapTempo');
    const tapEl = document.getElementById('tapBpm');
    const doTap = () => {
      const now = performance.now();
      tapTimes.push(now);
      if (tapTimes.length > 5) tapTimes.shift();
      if (tapTimes.length >= 2) {
        const intervals = [];
        for (let i = 1; i < tapTimes.length; i++) intervals.push(tapTimes[i] - tapTimes[i - 1]);
        const use = intervals.slice(-4);
        const avg = use.reduce((s, v) => s + v, 0) / use.length;
        tapEl.textContent = String(Math.round(60000 / avg));
      }
      clearTimeout(doTap._t);
      doTap._t = setTimeout(() => { tapTimes.length = 0; }, 2000);
    };
    tapBtn.addEventListener('click', doTap);

    document.getElementById('beatSync').addEventListener('click', () => {
      const t = crossfade.fade.value;
      const active = t < 0.5 ? decks.A : decks.B;
      const inactive = active === decks.A ? decks.B : decks.A;
      if (!active.bpm || !inactive.bpm) { alert('Both decks need a detected BPM to beat-sync.'); return; }
      const activeEff = active.bpm * (1 + active.pitchPct / 100);
      let pct = (activeEff / inactive.bpm - 1) * 100;
      pct = UI.clamp(pct, -16, 16);
      inactive.setPitchPct(pct);
      inactive.pitchInput.value = pct.toFixed(1);
    });

    document.querySelectorAll('[data-fx-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-fx-target]').forEach((b) => b.classList.remove('fx-target-active'));
        btn.classList.add('fx-target-active');
        fxTarget = btn.dataset.fxTarget;
      });
    });

    document.querySelectorAll('.fx-pad').forEach((pad) => {
      const fx = pad.dataset.fx;
      const on = () => { pad.classList.add('active'); decks[fxTarget].fxOn(fx); };
      const off = () => { pad.classList.remove('active'); decks[fxTarget].fxOff(fx); };
      pad.addEventListener('mousedown', on);
      pad.addEventListener('touchstart', (e) => { e.preventDefault(); on(); }, { passive: false });
      pad.addEventListener('mouseup', off);
      pad.addEventListener('mouseleave', off);
      pad.addEventListener('touchend', off);
      pad.addEventListener('touchcancel', off);
    });
  }

  function bindKeyShortcuts() {
    const held = new Set();
    const djHidden = () => document.getElementById('tab-dj').classList.contains('hidden');
    window.addEventListener('keydown', (e) => {
      if (djHidden() || e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'q') { decks.A.isPlaying ? decks.A.pause() : decks.A.play(); }
      else if (k === 'p') { decks.B.isPlaying ? decks.B.pause() : decks.B.play(); }
      else if (k === ' ') { e.preventDefault(); document.getElementById('tapTempo').click(); }
      else if (k === '1' || k === '2' || k === '3') { decks.A.setOrRecallCue(parseInt(k, 10) - 1); }
      else if (k === '8' || k === '9' || k === '0') { decks.B.setOrRecallCue(k === '0' ? 2 : parseInt(k, 10) - 8); }
      else if (k === 'z' || k === 'x' || k === 'c') {
        const fx = k === 'z' ? 'stutter' : k === 'x' ? 'sweep' : 'crush';
        if (held.has(k)) return;
        held.add(k);
        const pad = document.querySelector(`.fx-pad[data-fx="${fx}"]`);
        pad.classList.add('active');
        decks[fxTarget].fxOn(fx);
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'z' || k === 'x' || k === 'c') {
        const fx = k === 'z' ? 'stutter' : k === 'x' ? 'sweep' : 'crush';
        held.delete(k);
        const pad = document.querySelector(`.fx-pad[data-fx="${fx}"]`);
        if (pad) pad.classList.remove('active');
        decks[fxTarget].fxOff(fx);
      }
    });
  }

  function startMeters() {
    const vuA = document.getElementById('vuA');
    const vuB = document.getElementById('vuB');
    const tick = () => {
      const a = UI.clamp(UI.mapRange(decks.A.meter.getValue(), -60, 0, 0, 100), 0, 100);
      const b = UI.clamp(UI.mapRange(decks.B.meter.getValue(), -60, 0, 0, 100), 0, 100);
      vuA.style.width = a + '%';
      vuB.style.width = b + '%';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  decks.A = createDeck('A', document.querySelector('.deck[data-deck="A"]'));
  decks.B = createDeck('B', document.querySelector('.deck[data-deck="B"]'));
  initMixer();
  initMixerControls();
  bindKeyShortcuts();
  startMeters();
}
