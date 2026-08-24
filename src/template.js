/* =========================================================
   template.js — Renders the entire application shell into
   document.body from JavaScript. No user-authored HTML.
   ========================================================= */

/** Load an external stylesheet (fonts) by injecting a <link>. */
function link(href, rel = 'stylesheet', extra = {}) {
  const el = document.createElement('link');
  el.rel = rel;
  el.href = href;
  Object.assign(el, extra);
  document.head.appendChild(el);
}

/** Insert the Tailwind Play CDN script + brand config so we can build a
 *  cyberpunk theme without a Tailwind build step. */
function injectTailwind() {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.onload = () => {
      // eslint-disable-next-line no-undef
      window.tailwind.config = {
        theme: {
          extend: {
            colors: {
              neon: {
                cyan: '#22d3ee',
                magenta: '#e879f9',
                lime: '#a3e635',
                amber: '#fbbf24',
                red: '#f43f5e',
              },
              panel: '#0b0f1a',
            },
            fontFamily: {
              display: ['"Orbitron"', 'ui-sans-serif', 'system-ui'],
              mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
            },
            boxShadow: {
              neon: '0 0 20px rgba(34,211,238,0.35), 0 0 40px rgba(232,121,249,0.15)',
            },
          },
        },
      };
      resolve();
    };
    document.head.appendChild(script);
  });
}

/** Full page markup, returned as a single string. */
function shellHTML() {
  return `
  <div class="bg-grid"></div>
  <div class="bg-glow"></div>

  <div id="splash" class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/60">
    <div class="glass max-w-md w-[92%] p-8 text-center">
      <div class="font-display text-3xl font-black tracking-widest text-neon-cyan neon-text mb-2">NEON.LAB</div>
      <p class="text-slate-300 text-sm mb-6">Web Audio Synth · Dual-Deck DJ Rig</p>
      <button id="enterBtn" class="btn-primary w-full py-3 text-base font-display tracking-widest">
        INITIALIZE AUDIO ENGINE
      </button>
      <p class="text-[11px] text-slate-500 mt-4">Browsers require a user gesture before audio can start.</p>
    </div>
  </div>

  <header class="relative z-10 mx-auto max-w-[1500px] px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-magenta shadow-neon flex items-center justify-center font-black text-panel">N</div>
      <div>
        <div class="font-display text-lg sm:text-xl font-bold tracking-widest neon-text">NEON.LAB</div>
        <div class="text-[10px] uppercase tracking-[0.3em] text-slate-400">Web Audio Studio</div>
      </div>
    </div>
    <nav class="glass rounded-full p-1 flex text-xs sm:text-sm">
      <button data-tab="synth" class="tab-btn tab-active px-4 sm:px-6 py-2 rounded-full font-display tracking-widest">SYNTH</button>
      <button data-tab="dj" class="tab-btn px-4 sm:px-6 py-2 rounded-full font-display tracking-widest">DJ RIG</button>
    </nav>
    <div class="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
      <span id="clock" class="font-mono">--:--:--</span>
      <span class="w-2 h-2 rounded-full bg-neon-lime animate-pulse"></span>
      <span>LIVE</span>
    </div>
  </header>

  <main class="relative z-10 mx-auto max-w-[1500px] px-4 sm:px-6 pb-24">
    ${synthTab()}
    ${djTab()}
  </main>

  <footer class="relative z-10 text-center text-[11px] text-slate-500 pb-6">
    NEON.LAB · Web Audio API · Tone.js · Vite · Deploy-ready on Vercel
  </footer>
  `;
}

function synthTab() {
  return `
  <section id="tab-synth" class="tab-panel">
    <div class="grid grid-cols-1 xl:grid-cols-4 gap-4">
      <div class="glass p-5 xl:col-span-1 space-y-5">
        <div>
          <h3 class="panel-title">Oscillator</h3>
          <div class="grid grid-cols-4 gap-2 mt-3" id="oscButtons">
            <button data-osc="sine" class="osc-btn osc-active">SIN</button>
            <button data-osc="square" class="osc-btn">SQR</button>
            <button data-osc="sawtooth" class="osc-btn">SAW</button>
            <button data-osc="triangle" class="osc-btn">TRI</button>
          </div>
        </div>
        <div>
          <h3 class="panel-title">Envelope (ADSR)</h3>
          <div class="grid grid-cols-2 gap-4 mt-3">
            <div class="slider-group"><label>Attack <span id="attackVal">10 ms</span></label><input id="attack" type="range" min="1" max="2000" value="10" /></div>
            <div class="slider-group"><label>Decay <span id="decayVal">200 ms</span></label><input id="decay" type="range" min="1" max="3000" value="200" /></div>
            <div class="slider-group"><label>Sustain <span id="sustainVal">0.60</span></label><input id="sustain" type="range" min="0" max="100" value="60" /></div>
            <div class="slider-group"><label>Release <span id="releaseVal">400 ms</span></label><input id="release" type="range" min="1" max="5000" value="400" /></div>
          </div>
        </div>
        <div>
          <h3 class="panel-title">Octave</h3>
          <div class="grid grid-cols-3 gap-2 mt-3" id="octaveButtons">
            <button data-oct="-1" class="oct-btn">−1</button>
            <button data-oct="0" class="oct-btn oct-active">0</button>
            <button data-oct="1" class="oct-btn">+1</button>
          </div>
        </div>
      </div>

      <div class="glass p-5 xl:col-span-2 flex flex-col">
        <div class="flex items-center justify-between mb-3">
          <h3 class="panel-title">Keyboard</h3>
          <div class="text-[11px] text-slate-400">Keys: <span class="text-neon-cyan">A S D F G H J</span> · click / touch</div>
        </div>
        <div id="keyboard" class="keyboard relative select-none flex-1"></div>
        <div class="mt-4 grid grid-cols-3 gap-3">
          <div class="glass-inner p-3"><div class="text-[10px] uppercase tracking-widest text-slate-400">Voices</div><div id="voiceCount" class="font-display text-2xl text-neon-cyan">0</div></div>
          <div class="glass-inner p-3"><div class="text-[10px] uppercase tracking-widest text-slate-400">Last Note</div><div id="lastNote" class="font-display text-2xl text-neon-magenta">—</div></div>
          <div class="glass-inner p-3"><div class="text-[10px] uppercase tracking-widest text-slate-400">Waveform</div><canvas id="scope" class="w-full h-10"></canvas></div>
        </div>
      </div>

      <div class="glass p-5 xl:col-span-1 space-y-5">
        <div>
          <h3 class="panel-title">Reverb</h3>
          <div class="grid grid-cols-2 gap-4 mt-3">
            <div class="slider-group"><label>Decay <span id="revDecayVal">2.0 s</span></label><input id="revDecay" type="range" min="1" max="100" value="20" /></div>
            <div class="slider-group"><label>Mix <span id="revMixVal">30%</span></label><input id="revMix" type="range" min="0" max="100" value="30" /></div>
          </div>
        </div>
        <div>
          <h3 class="panel-title">Delay</h3>
          <div class="grid grid-cols-2 gap-4 mt-3">
            <div class="slider-group"><label>Time <span id="dlyTimeVal">250 ms</span></label><input id="dlyTime" type="range" min="0" max="1000" value="250" /></div>
            <div class="slider-group"><label>Feedback <span id="dlyFbVal">30%</span></label><input id="dlyFb" type="range" min="0" max="95" value="30" /></div>
          </div>
        </div>
        <div>
          <h3 class="panel-title">Filter</h3>
          <div class="slider-group mt-3"><label>Cutoff <span id="filterVal">8000 Hz</span></label><input id="filter" type="range" min="60" max="18000" value="8000" /></div>
        </div>
        <div>
          <h3 class="panel-title">Master</h3>
          <div class="slider-group mt-3"><label>Volume <span id="masterVal">-6 dB</span></label><input id="master" type="range" min="-60" max="6" value="-6" /></div>
          <div class="mt-3">
            <div class="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Output Meter</div>
            <div class="vu"><div id="vuBar" class="vu-bar"></div></div>
          </div>
        </div>
      </div>
    </div>
  </section>
  `;
}

function djDeck(id, accentClass, demos) {
  return `
  <div class="glass p-5 xl:col-span-4 deck" data-deck="${id}">
    <div class="flex items-center justify-between mb-3">
      <h3 class="panel-title deck-title">Deck ${id}</h3>
      <div class="text-[11px] text-slate-400">BPM <span data-bpm class="${accentClass} font-display">—</span></div>
    </div>
    <div class="relative aspect-square rounded-2xl overflow-hidden mb-4 vinyl-wrap" data-drop>
      <div class="vinyl" data-vinyl>
        <div class="vinyl-label bg-gradient-to-br ${id === 'A' ? 'from-neon-cyan/80 to-neon-magenta/70' : 'from-neon-magenta/80 to-neon-cyan/70'}"></div>
      </div>
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="text-center" data-empty>
          <div class="text-xs uppercase tracking-widest text-slate-300">Drop audio here</div>
          <div class="text-[10px] text-slate-500 mt-1">or click LOAD FILE</div>
        </div>
      </div>
    </div>
    <canvas class="waveform w-full h-16 mb-3" data-wave></canvas>
    <div class="grid grid-cols-4 gap-2 mb-3">
      <button class="dj-btn" data-act="play">PLAY</button>
      <button class="dj-btn" data-act="pause">PAUSE</button>
      <button class="dj-btn" data-act="cue">CUE</button>
      <label class="dj-btn cursor-pointer text-center flex items-center justify-center">
        LOAD<input type="file" accept="audio/*" class="hidden" data-file />
      </label>
    </div>
    <div class="grid grid-cols-5 gap-2 mb-3 text-[11px]">
      <button class="loop-btn" data-loop="0">OFF</button>
      <button class="loop-btn" data-loop="1">1</button>
      <button class="loop-btn" data-loop="2">2</button>
      <button class="loop-btn" data-loop="4">4</button>
      <button class="loop-btn" data-loop="8">8</button>
    </div>
    <div class="grid grid-cols-2 gap-2 mb-3 text-[11px]">
      ${demos.map((d) => `<button class="demo-btn" data-demo="${d.id}">DEMO · ${d.label}</button>`).join('')}
    </div>
    <div>
      <div class="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Hot Cues</div>
      <div class="grid grid-cols-3 gap-2">
        <button class="cue-btn" data-cue="0">CUE 1</button>
        <button class="cue-btn" data-cue="1">CUE 2</button>
        <button class="cue-btn" data-cue="2">CUE 3</button>
      </div>
    </div>
    <div class="mt-4 slider-group">
      <label>Pitch <span data-pitch-val class="${accentClass}">+0.0%</span></label>
      <input type="range" min="-16" max="16" value="0" step="0.1" data-pitch />
    </div>
    <div class="mt-3 grid grid-cols-3 gap-3">
      <div class="knob-group"><div class="knob" data-eq="high"><div class="knob-indicator"></div></div><div class="knob-label">HIGH</div></div>
      <div class="knob-group"><div class="knob" data-eq="mid"><div class="knob-indicator"></div></div><div class="knob-label">MID</div></div>
      <div class="knob-group"><div class="knob" data-eq="low"><div class="knob-indicator"></div></div><div class="knob-label">LOW</div></div>
    </div>
  </div>
  `;
}

function djMixer() {
  return `
  <div class="glass p-5 xl:col-span-4">
    <h3 class="panel-title text-center">Mixer</h3>
    <div class="text-center text-[10px] uppercase tracking-widest text-slate-400 mt-1">Central Performance Console</div>
    <div class="mt-4 grid grid-cols-2 gap-3">
      <div><div class="text-[10px] text-slate-400 mb-1">Deck A Level</div><div class="vu"><div id="vuA" class="vu-bar"></div></div></div>
      <div><div class="text-[10px] text-slate-400 mb-1">Deck B Level</div><div class="vu"><div id="vuB" class="vu-bar"></div></div></div>
    </div>
    <div class="mt-6">
      <div class="flex justify-between text-[11px] text-slate-400 mb-1">
        <span>DECK A</span><span id="xfadeVal">CENTER</span><span>DECK B</span>
      </div>
      <input id="crossfader" type="range" min="-100" max="100" value="0" class="w-full xfader" />
    </div>
    <div class="mt-6 slider-group">
      <label>Master Volume <span id="djMasterVal">-6 dB</span></label>
      <input id="djMaster" type="range" min="-60" max="6" value="-6" />
    </div>
    <div class="mt-6 grid grid-cols-2 gap-3">
      <button id="tapTempo" class="btn-primary py-3 font-display tracking-widest">TAP TEMPO</button>
      <button id="beatSync" class="btn-secondary py-3 font-display tracking-widest">BEAT SYNC</button>
    </div>
    <div class="mt-2 text-center text-[11px] text-slate-400">Tap BPM: <span id="tapBpm" class="text-neon-magenta font-display">—</span></div>
    <div class="mt-6">
      <div class="flex items-center justify-between mb-2">
        <div class="text-[10px] uppercase tracking-widest text-slate-400">FX Pads · Target</div>
        <div class="flex gap-1 text-[11px]">
          <button data-fx-target="A" class="fx-target fx-target-active">A</button>
          <button data-fx-target="B" class="fx-target">B</button>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button class="fx-pad" data-fx="stutter">STUTTER</button>
        <button class="fx-pad" data-fx="sweep">FILTER SWP</button>
        <button class="fx-pad" data-fx="crush">BITCRUSH</button>
      </div>
    </div>
  </div>
  `;
}

function djTab() {
  const deckA = djDeck('A', 'text-neon-cyan', [
    { id: 'house', label: 'HOUSE' },
    { id: 'techno', label: 'TECHNO' },
  ]);
  const deckB = djDeck('B', 'text-neon-magenta', [
    { id: 'hiphop', label: 'HIP-HOP' },
    { id: 'dnb', label: 'DNB' },
  ]);
  return `
  <section id="tab-dj" class="tab-panel hidden">
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
      ${deckA}
      ${djMixer()}
      ${deckB}
    </div>
    <div class="glass mt-4 p-3 text-[11px] text-slate-400 flex flex-wrap gap-x-6 gap-y-1 justify-center">
      <span><kbd>Q</kbd> Deck A Play/Pause</span>
      <span><kbd>P</kbd> Deck B Play/Pause</span>
      <span><kbd>Space</kbd> Tap Tempo</span>
      <span><kbd>1</kbd>/<kbd>2</kbd>/<kbd>3</kbd> Cues (Deck A)</span>
      <span><kbd>8</kbd>/<kbd>9</kbd>/<kbd>0</kbd> Cues (Deck B)</span>
      <span><kbd>Z</kbd>/<kbd>X</kbd>/<kbd>C</kbd> FX Pads</span>
    </div>
  </section>
  `;
}

/** Public: paint the entire UI into <body>. */
export async function renderShell() {
  document.body.className = 'min-h-screen text-slate-100 font-mono selection:bg-neon-magenta/40';

  link('https://fonts.googleapis.com', 'preconnect');
  link('https://fonts.gstatic.com', 'preconnect', { crossOrigin: 'anonymous' });
  link('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Orbitron:wght@500;700;900&display=swap');

  await injectTailwind();
  document.body.innerHTML = shellHTML();
}
