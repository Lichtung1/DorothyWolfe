// Loading screen: fetches the Babylon engine with a byte counter, then starts app.js.
// The apartment model reports its own download progress through the 'dw-progress' event.
(() => {
  const VERSION = 'bedroom-20261005';
  const ENGINE_BYTES = 2826497;   // vendor/babylon.js, uncompressed
  const CELLS = 21;

  const loader = document.querySelector('#loader');
  const strip = loader.querySelector('.stitch-strip');
  const bar = loader.querySelector('[role=progressbar]');
  const pct = loader.querySelector('#loader-pct');
  const step = loader.querySelector('#loader-step');
  const cells = Array.from({ length: CELLS }, () => strip.appendChild(document.createElement('i')));

  let engine = 0, model = 0, settled = false, shown = -1;
  function paint() {
    const f = Math.min(1, engine * 0.55 + model * 0.42 + (settled ? 0.03 : 0));
    const n = Math.round(f * 100);
    if (n === shown) return;
    shown = n;
    const filled = Math.floor(f * CELLS + 1e-6);
    cells.forEach((c, i) => c.classList.toggle('on', i < filled));
    pct.textContent = String(n).padStart(2, '0') + '%';
    bar.setAttribute('aria-valuenow', n);
  }
  function say(text) { step.textContent = text; }

  function addScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function loadEngine() {
    say('> waking the old computer');
    try {
      const res = await fetch('vendor/babylon.js');
      if (!res.ok || !res.body) throw new Error('no stream');
      const reader = res.body.getReader(), chunks = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); got += value.length;
        engine = Math.min(1, got / ENGINE_BYTES); paint();
      }
      const url = URL.createObjectURL(new Blob(chunks, { type: 'text/javascript' }));
      await addScript(url);
      URL.revokeObjectURL(url);
    } catch {
      await addScript('vendor/babylon.js'); // plain fallback, no byte count
    }
    engine = 1; paint();
  }

  function finish() {
    if (settled) return;
    settled = true; paint();
    say('> the door is open');
    // Two frames so the first image of the apartment is drawn underneath before we fade.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      loader.classList.add('done');
      loader.setAttribute('aria-busy', 'false');
      setTimeout(() => loader.remove(), 700);
    }));
  }

  addEventListener('dw-progress', e => {
    if (e.detail?.stage === 'model') {
      model = Math.max(model, Math.min(1, e.detail.fraction || 0));
      say(model < 0.98 ? '> unrolling the wallpaper' : '> lighting the lamps');
      paint();
    }
  });
  addEventListener('dw-ready', () => { model = 1; finish(); });
  addEventListener('dw-failed', finish);

  paint();
  loadEngine()
    .then(() => { say('> unrolling the wallpaper'); return import('./app.js?v=' + VERSION); })
    .catch(err => { console.error(err); finish(); });

  // Never trap anyone behind the loader: the welcome screen explains any failure.
  setTimeout(finish, 60000);
})();
