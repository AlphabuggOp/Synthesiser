/* =========================================================
   main.js — Vite entry point.
   Imports Tone from node_modules, wires up shared UI helpers,
   then boots the synth & DJ modules once the user unlocks audio.
   ========================================================= */

import * as Tone from 'tone';
import { UI } from './modules/ui.js';
import { initSynth } from './modules/synth.js';
import { initDJ } from './modules/dj.js';

// Expose Tone globally for the modules (they consume it via a shared reference).
window.Tone = Tone;

UI.initTabs();
UI.initClock();

const splash = document.getElementById('splash');
const enterBtn = document.getElementById('enterBtn');

enterBtn.addEventListener('click', async () => {
  try {
    // Unlock the AudioContext via user gesture (all modern browsers require this).
    await Tone.start();
    // Tighter latency without underruns on desktop.
    Tone.getContext().lookAhead = 0.03;

    initSynth(Tone);
    initDJ(Tone);

    splash.style.opacity = '0';
    splash.style.transition = 'opacity .35s ease';
    setTimeout(() => splash.remove(), 350);
  } catch (err) {
    console.error('Audio init failed', err);
    alert('Could not start the audio engine: ' + err.message);
  }
});
