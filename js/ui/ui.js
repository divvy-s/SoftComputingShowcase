/* Shared UI: module shell, player (play / pause / step / back / reset), parameter controls,
 * verification table and canvas drawing helpers. */
(function () {
  'use strict';
  const SC = window.SC;
  const UI = (SC.ui = { modules: {}, active: null });

  /* ---------------- canvas helpers ---------------- */
  UI.canvas = function (cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 300,
      h = cv.clientHeight || 150;
    const W = Math.round(w * dpr),
      H = Math.round(h * dpr);
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  };
  UI.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* square plot area mapping [lo,hi]² → pixels */
  UI.plane = function (w, h, lo, hi, pad = 26) {
    const size = Math.min(w, h) - 2 * pad;
    const x0 = (w - size) / 2,
      y0 = (h - size) / 2;
    const s = size / (hi - lo);
    return { x0, y0, size, s, lo, hi, X: (x) => x0 + (x - lo) * s, Y: (y) => y0 + size - (y - lo) * s, inv: (px, py) => [lo + (px - x0) / s, lo + (y0 + size - py) / s] };
  };

  const VIRIDIS = [
    [68, 1, 84],
    [65, 68, 135],
    [42, 120, 142],
    [34, 168, 132],
    [122, 209, 81],
    [253, 231, 37],
  ];
  function pal(t) {
    t = SC.clamp(t, 0, 1) * (VIRIDIS.length - 1);
    const i = Math.min(VIRIDIS.length - 2, Math.floor(t)),
      f = t - i;
    return VIRIDIS[i].map((c, k) => Math.round(c + (VIRIDIS[i + 1][k] - c) * f));
  }
  UI.pal = pal;
  const heatCache = {};
  /* banded heat map of a 2-D benchmark function (low f = dark) */
  UI.heat = function (key) {
    if (heatCache[key]) return heatCache[key];
    const F = SC.FUNCS[key],
      R = 220;
    const vals = new Float64Array(R * R);
    let mn = Infinity,
      mx = -Infinity;
    for (let j = 0; j < R; j++)
      for (let i = 0; i < R; i++) {
        const x = F.lo + ((i + 0.5) / R) * (F.hi - F.lo),
          y = F.hi - ((j + 0.5) / R) * (F.hi - F.lo);
        const v = Math.log1p(Math.max(0, F.f([x, y]) - F.fmin));
        vals[j * R + i] = v;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    const off = document.createElement('canvas');
    off.width = off.height = R;
    const c = off.getContext('2d');
    const img = c.createImageData(R, R);
    const bands = 16;
    for (let k = 0; k < R * R; k++) {
      const t = (vals[k] - mn) / (mx - mn || 1);
      const q = Math.floor(t * bands) / bands;
      const edge = t * bands - Math.floor(t * bands) < 0.07 ? 0.86 : 1;
      const col = pal(0.04 + 0.92 * q);
      img.data[4 * k] = col[0] * edge;
      img.data[4 * k + 1] = col[1] * edge;
      img.data[4 * k + 2] = col[2] * edge;
      img.data[4 * k + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    return (heatCache[key] = off);
  };

  UI.drawLandscape = function (ctx, m, key) {
    const F = SC.FUNCS[key];
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(UI.heat(key), m.x0, m.y0, m.size, m.size);
    ctx.strokeStyle = UI.css('--line');
    ctx.lineWidth = 1;
    ctx.strokeRect(m.x0 + 0.5, m.y0 + 0.5, m.size - 1, m.size - 1);
    // axes ticks
    ctx.fillStyle = UI.css('--muted');
    ctx.font = '10.5px ' + UI.css('--mono');
    ctx.textAlign = 'center';
    for (const v of [F.lo, (F.lo + F.hi) / 2, F.hi]) {
      ctx.fillText(SC.g(v, 2), m.X(v), m.y0 + m.size + 14);
      ctx.save();
      ctx.textAlign = 'right';
      ctx.fillText(SC.g(v, 2), m.x0 - 4, m.Y(v) + 3);
      ctx.restore();
    }
    ctx.fillText('x₁', m.x0 + m.size - 8, m.y0 + m.size + 14);
    // true minima
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    for (const p of F.minima) {
      const x = m.X(p[0]),
        y = m.Y(p[1]);
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 5);
      ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x + 5, y - 5);
      ctx.lineTo(x - 5, y + 5);
      ctx.stroke();
    }
  };

  UI.arrow = function (ctx, x0, y0, x1, y1, color, width = 2) {
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 0.5) return;
    const a = Math.atan2(y1 - y0, x1 - x0),
      hs = Math.min(9, 3 + L * 0.3);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 - Math.cos(a) * hs * 0.6, y1 - Math.sin(a) * hs * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - hs * Math.cos(a - 0.45), y1 - hs * Math.sin(a - 0.45));
    ctx.lineTo(x1 - hs * Math.cos(a + 0.45), y1 - hs * Math.sin(a + 0.45));
    ctx.closePath();
    ctx.fill();
  };
  UI.star = function (ctx, x, y, r, fill, stroke) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5,
        rr = k % 2 ? r * 0.45 : r;
      ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  /* simple multi-series line chart. series: [{label, color, data: [y…] or [[x,y]…], dash}] */
  UI.lineChart = function (cv, series, o = {}) {
    const { ctx, w, h } = UI.canvas(cv);
    const pad = { l: 50, r: 10, t: 10, b: 24 };
    const tf = o.logY ? (y) => Math.log10(Math.max(y, 1e-12)) : (y) => y;
    const S = series.map((s) => ({ ...s, pts: s.data.map((d, i) => (Array.isArray(d) ? [d[0], tf(d[1])] : [i, tf(d)])) })).filter((s) => s.pts.length);
    let xs = [],
      ys = [];
    S.forEach((s) => s.pts.forEach((p) => (xs.push(p[0]), ys.push(p[1]))));
    if (o.extraY) o.extraY.forEach((y) => ys.push(tf(y)));
    if (!xs.length) return;
    let x0 = Math.min(...xs),
      x1 = Math.max(...xs),
      y0 = Math.min(...ys),
      y1 = Math.max(...ys);
    if (o.y0 !== undefined) y0 = Math.min(y0, o.y0);
    if (x1 === x0) x1 = x0 + 1;
    if (y1 - y0 < 1e-9) {
      y1 += 0.5;
      y0 -= 0.5;
    }
    const yr = y1 - y0;
    y1 += yr * 0.06;
    if (o.y0 === undefined) y0 -= yr * 0.06;
    const X = (x) => pad.l + ((x - x0) / (x1 - x0)) * (w - pad.l - pad.r);
    const Y = (y) => pad.t + (1 - (y - y0) / (y1 - y0)) * (h - pad.t - pad.b);
    const muted = UI.css('--muted'),
      line = UI.css('--line');
    ctx.font = '10.5px ' + UI.css('--mono');
    ctx.fillStyle = muted;
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      const yv = y0 + ((y1 - y0) * k) / 4,
        py = Math.round(Y(yv)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, py);
      ctx.lineTo(w - pad.r, py);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(o.logY ? '1e' + SC.g(yv, 1) : SC.g(yv, Math.abs(yv) >= 100 ? 0 : 3), pad.l - 5, py + 3);
    }
    ctx.textAlign = 'center';
    ctx.fillText(SC.g(x0, 0), X(x0) + 6, h - 6);
    ctx.fillText(SC.g(x1, 0), X(x1) - 10, h - 6);
    if (o.xLabel) ctx.fillText(o.xLabel, (pad.l + w) / 2, h - 6);
    S.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width || 2;
      ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      s.pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
      ctx.stroke();
      ctx.setLineDash([]);
      if (s.dots)
        s.pts.forEach((p) => {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(X(p[0]), Y(p[1]), 3, 0, 7);
          ctx.fill();
        });
    });
    if (S.length > 1 || o.legend) {
      let lx = w - pad.r - 6;
      ctx.textAlign = 'right';
      ctx.font = '11px ' + UI.css('--sans');
      for (let i = S.length - 1; i >= 0; i--) {
        const s = S[i];
        ctx.fillStyle = muted;
        ctx.fillText(s.label, lx, pad.t + 11);
        const tw = ctx.measureText(s.label).width;
        ctx.fillStyle = s.color;
        ctx.fillRect(lx - tw - 18, pad.t + 5, 12, 3);
        lx -= tw + 28;
      }
    }
  };

  /* ---------------- module shell ---------------- */
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  UI.el = el;

  UI.mount = function (def, host) {
    const E = def.engine;
    const api = { def, params: SC.clone(def.start || E.defaults), st: null, hist: [], timer: null, speed: 3 };
    const root = el(`<section class="module">
      <div class="mod-head"><div><h1>${def.title}</h1><p class="tagline">${def.tagline}</p></div><div class="presets"></div></div>
      <div class="mod-grid">
        <aside class="panel controls"><h3>Problem &amp; parameters</h3><div class="params"></div><div class="bookslot"></div></aside>
        <section class="panel stage">
          <div class="player">
            <button class="btn" data-act="reset" title="Reset (R)">⟲ Reset</button>
            <button class="btn" data-act="back" title="Step back (←)">◀ Back</button>
            <button class="btn primary" data-act="play" title="Play / pause (Space)">▶ Play</button>
            <button class="btn" data-act="step" title="One step (→)">Step ▶</button>
            <label class="speed">speed <input type="range" min="1" max="12" value="3" data-speed></label>
            <span class="count"></span>
          </div>
          <div class="phases"></div>
          <div class="stage-body">${def.stage}</div>
        </section>
        <aside class="panel explain">
          <div class="step-title"></div>
          <div class="narr"></div>
          <div class="tape-head">Hand calculation <span>every number substituted</span></div>
          <div class="tape"></div>
        </aside>
      </div>
      <div class="below">${def.below || ''}</div>
      ${def.theory ? `<details class="panel theory"><summary>Theory refresher: the equations used on this page</summary><div class="th">${def.theory}</div></details>` : ''}
      ${def.verify ? `<section class="panel verify"><div class="verify-head"><div><h3>Checked against the textbook</h3><div class="vsum"></div></div><button class="btn" data-verify>Re-run check</button></div><div class="verify-body"></div></section>` : ''}
    </section>`);
    host.appendChild(root);
    api.root = root;
    api.$ = (sel) => root.querySelector(sel);
    api.$$ = (sel) => [...root.querySelectorAll(sel)];

    // presets
    const pres = api.$('.presets');
    (def.presets || []).forEach((p) => {
      const b = el(`<button class="btn ${p.book ? 'book' : ''}" title="${SC.esc(p.hint || '')}">${p.label}</button>`);
      b.onclick = () => {
        api.params = SC.clone(p.params);
        buildControls();
        api.reset();
      };
      pres.appendChild(b);
    });

    function buildControls() {
      const box = api.$('.params');
      box.innerHTML = '';
      for (const c of def.controls(api.params, api)) {
        if (c.type === 'html') {
          box.appendChild(el(`<div>${c.html}</div>`));
          continue;
        }
        const v = api.params[c.id];
        let node;
        if (c.type === 'select') {
          node = el(`<label class="ctl"><span>${c.label}</span><select>${c.options.map(([k, l]) => `<option value="${k}" ${String(k) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>${c.help ? `<small>${c.help}</small>` : ''}</label>`);
        } else if (c.type === 'range') {
          node = el(`<label class="ctl"><span>${c.label}<output>${v}</output></span><input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${v}">${c.help ? `<small>${c.help}</small>` : ''}</label>`);
          const inp = node.querySelector('input');
          inp.addEventListener('input', () => (node.querySelector('output').textContent = inp.value));
        } else if (c.type === 'check') {
          node = el(`<label class="ctl check"><input type="checkbox" ${v ? 'checked' : ''}><span>${c.label}</span></label>`);
        } else {
          node = el(`<label class="ctl"><span>${c.label}</span><input type="${c.type === 'number' ? 'number' : 'text'}" value="${SC.esc(v)}" ${c.min !== undefined ? `min="${c.min}"` : ''} ${c.max !== undefined ? `max="${c.max}"` : ''} ${c.step ? `step="${c.step}"` : ''}>${c.help ? `<small>${c.help}</small>` : ''}</label>`);
        }
        const inp = node.querySelector('select,input');
        inp.addEventListener('change', () => {
          let val = c.type === 'check' ? inp.checked : inp.value;
          if (c.type === 'range' || c.type === 'number') val = +val;
          if (c.type === 'number' && c.min !== undefined) val = Math.max(c.min, Math.min(c.max ?? Infinity, val));
          api.params[c.id] = val;
          if (!c.keepBook) api.params.textbook = E.defaults.textbook;
          if (c.onChange) c.onChange(val, api);
          buildControls();
          if (c.live) c.live(val, api);
          else api.reset();
        });
        box.appendChild(node);
      }
      api.$('.bookslot').innerHTML = api.params.textbook
        ? `<div class="bookmode"><b>Textbook mode.</b> The starting values and random numbers are the ones printed in the source, so every step matches the hand calculation. Changing a parameter leaves textbook mode.</div>`
        : '';
    }
    api.rebuild = buildControls;

    function render() {
      const st = api.st;
      api.$('.step-title').innerHTML = st.title || '';
      api.$('.narr').innerHTML = st.narr || '';
      api.$('.tape').innerHTML = (st.tape || []).map((l) => `<div>${l}</div>`).join('');
      api.$('.count').textContent = `step ${api.hist.length}${st.done ? ' · done' : ''}`;
      api.$('[data-act=play]').textContent = api.timer ? '⏸ Pause' : st.done ? '✓ Done' : '▶ Play';
      api.$('[data-act=back]').disabled = !api.hist.length;
      if (def.phases) {
        const ph = def.phases(st);
        api.$('.phases').innerHTML = ph.list.map((p, i) => `${i ? '<i>→</i>' : ''}<span class="${p === ph.on ? 'on' : p === ph.next ? 'next' : ''}">${p}</span>`).join('');
      }
      def.render(st, api);
    }
    api.render = render;

    api.reset = function () {
      api.pause();
      api.st = E.create(SC.clone(api.params));
      api.hist = [];
      render();
    };
    api.step = function () {
      if (api.st.done) return api.pause();
      api.hist.push(JSON.stringify(api.st));
      if (api.hist.length > 600) api.hist.shift();
      E.step(api.st);
      if (api.st.done) api.pause();
      render();
    };
    api.back = function () {
      if (!api.hist.length) return;
      api.pause();
      api.st = JSON.parse(api.hist.pop());
      render();
    };
    api.play = function () {
      if (api.st.done) return;
      clearInterval(api.timer);
      const delays = [0, 1400, 1000, 700, 480, 320, 220, 150, 100, 70, 45, 25, 10];
      api.timer = setInterval(api.step, delays[api.speed]);
      render();
    };
    api.pause = function () {
      if (api.timer) {
        clearInterval(api.timer);
        api.timer = null;
        if (api.st) render();
      }
    };
    api.toggle = () => (api.timer ? api.pause() : api.play());

    root.querySelector('.player').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      b.blur(); // so Space / arrows go to the player shortcuts, not the focused button
      ({ reset: api.reset, back: api.back, play: api.toggle, step: () => (api.pause(), api.step()) })[b.dataset.act]();
    });
    const sp = api.$('[data-speed]');
    sp.addEventListener('input', () => {
      api.speed = +sp.value;
      if (api.timer) api.play();
    });

    if (def.verify) {
      const run = () => UI.renderVerify(api.$('.verify-body'), api.$('.vsum'), SC.verifyById[def.verify]);
      api.$('[data-verify]').onclick = run;
      run();
    }

    buildControls();
    if (def.onMount) def.onMount(api);
    api.reset();
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => UI.active === api && render(), 120);
    });
    return api;
  };

  /* ---------------- verification table ---------------- */
  const LABEL = { pass: '✔ match', slip: '✎ book slip', note: 'ℹ note', fail: '✘ mismatch' };
  UI.renderVerify = function (body, sum, checks) {
    let tot = { pass: 0, slip: 0, note: 0, fail: 0 };
    body.innerHTML = checks
      .map((fn) => {
        let r;
        try {
          r = fn();
        } catch (e) {
          return `<div class="vblock"><b class="bad">Check crashed: ${SC.esc(e.message)}</b></div>`;
        }
        r.rows.forEach((x) => tot[x.status]++);
        return `<div class="vblock"><h4>${r.title}</h4><div class="src">Source: ${r.source}</div><div class="tbl-wrap"><table class="data vt">
        <tr><th>Quantity</th><th>Book / hand</th><th>SoftLab</th><th>Result</th><th>Why</th></tr>
        ${r.rows.map((x) => `<tr><td>${x.what}</td><td>${x.book}</td><td>${x.tool}</td><td><span class="chip ${x.status}">${LABEL[x.status]}</span></td><td class="why">${x.note}</td></tr>`).join('')}
        </table></div></div>`;
      })
      .join('');
    if (sum)
      sum.innerHTML = `${tot.pass} values match the source${tot.slip ? `, ${tot.slip} differ because the source has an arithmetic slip (re-computed independently)` : ''}${tot.note ? `, ${tot.note} note${tot.note > 1 ? 's' : ''}` : ''}${tot.fail ? `, <b class="bad">${tot.fail} mismatches</b>` : ', 0 mismatches'}.`;
    return tot;
  };

  /* keyboard shortcuts for the visible module */
  document.addEventListener('keydown', (e) => {
    const api = UI.active;
    if (!api || (e.target.closest && e.target.closest('input,select,textarea')) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ') (e.preventDefault(), api.toggle());
    else if (e.key === 'ArrowRight') (e.preventDefault(), api.pause(), api.step());
    else if (e.key === 'ArrowLeft') (e.preventDefault(), api.back());
    else if (e.key === 'r' || e.key === 'R') api.reset();
  });
})();
