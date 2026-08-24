/* =========================================================
   ui.js — Shared UI helpers: tabs, clock, rotary knobs.
   ========================================================= */

export const UI = (() => {
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const mapRange = (v, inMin, inMax, outMin, outMax) =>
    outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);

  function initTabs() {
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('tab-active'));
        btn.classList.add('tab-active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
        document.getElementById('tab-' + tab).classList.remove('hidden');
      });
    });
  }

  function initClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    const tick = () => {
      const d = new Date();
      el.textContent = d.toLocaleTimeString('en-US', { hour12: false });
    };
    tick();
    setInterval(tick, 1000);
  }

  /**
   * Rotary-knob interaction: drag vertically or scroll wheel to change value in [min,max].
   * Double-click resets to center.
   */
  function attachKnob(el, { min = -12, max = 12, value = 0, onChange = () => {} } = {}) {
    let current = clamp(value, min, max);
    const indicator = el.querySelector('.knob-indicator');
    const render = () => {
      const deg = mapRange(current, min, max, -135, 135);
      indicator.style.transform = `translateX(-50%) rotate(${deg}deg)`;
    };
    render();
    onChange(current);

    let dragging = false;
    let startY = 0;
    let startVal = current;

    const onDown = (e) => {
      dragging = true;
      startY = (e.touches ? e.touches[0].clientY : e.clientY);
      startVal = current;
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      const dy = startY - y;
      current = clamp(startVal + (dy / 200) * (max - min), min, max);
      render();
      onChange(current);
    };
    const onUp = () => { dragging = false; };
    const onWheel = (e) => {
      e.preventDefault();
      const step = (max - min) / 100;
      current = clamp(current + (e.deltaY < 0 ? step : -step), min, max);
      render();
      onChange(current);
    };
    const onDbl = () => { current = (min + max) / 2; render(); onChange(current); };

    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('dblclick', onDbl);

    return {
      set(v) { current = clamp(v, min, max); render(); onChange(current); },
      get() { return current; },
    };
  }

  return { clamp, mapRange, initTabs, initClock, attachKnob };
})();
