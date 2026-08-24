/* =========================================================
   app.js — Boot orchestrator
   ========================================================= */

(function bootstrap() {
  UI.initTabs();
  UI.initClock();

  const splash = document.getElementById('splash');
  const enterBtn = document.getElementById('enterBtn');

  enterBtn.addEventListener('click', async () => {
    try {
      // Unlock audio via a user gesture (Chrome/Firefox/Safari requirement).
      await Tone.start();
      // Lookahead low for tighter latency without dropouts.
      Tone.getContext().lookAhead = 0.03;

      Synth.init();
      DJ.init();

      splash.style.opacity = '0';
      splash.style.transition = 'opacity .35s ease';
      setTimeout(() => splash.remove(), 350);
    } catch (err) {
      console.error('Audio init failed', err);
      alert('Could not start the audio engine: ' + err.message);
    }
  });
})();
