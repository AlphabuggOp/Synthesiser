/* =========================================================
   main.js — Vite entry point.
   Renders the app shell from JS, then boots synth & DJ modules
   once the user unlocks the AudioContext via a gesture.
   ========================================================= */

import * as Tone from 'tone';
import './styles.css';
import { renderShell } from './template.js';
import { UI } from './modules/ui.js';
import { initSynth } from './modules/synth.js';
import { initDJ } from './modules/dj.js';

// Expose Tone in dev only so debug sessions can inspect the graph.
if (import.meta.env.DEV) window.Tone = Tone;

(async function bootstrap() {
  await renderShell();

  UI.initTabs();
  UI.initClock();

  const splash = document.getElementById('splash');
  const enterBtn = document.getElementById('enterBtn');

  enterBtn.addEventListener('click', async () => {
    try {
      // AudioContext requires a user gesture in every modern browser.
      await Tone.start();
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
})();
