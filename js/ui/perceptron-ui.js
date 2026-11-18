(function () {
  'use strict';
  const SC = window.SC,
    UI = SC.ui,
    E = SC.engines.perceptron;
  const { n, g } = SC;

  function bounds(data) {
    const xs = data.map((d) => d[0]),
      ys = data.map((d) => d[1]);
    let lo = Math.min(...xs, ...ys),
      hi = Math.max(...xs, ...ys);
    const pad = Math.max(0.5, (hi - lo) * 0.25);
    return [lo - pad, hi + pad];
  }

  UI.modules.perceptron = {
    key: 'perceptron',
    title: 'Perceptron Learning',
    tagline: 'One neuron, one straight line. Every mistake tilts or shifts the line. Watch it solve AND and OR, then fail forever on XOR, the reason we need hidden layers.',
    engine: E,
    verify: 'perceptron',
    presets: [
      { label: '📖 AND gate, w = 0, η = 1 (hand trace)', params: Object.assign({}, E.defaults), book: true },
      { label: 'XOR (will not converge)', params: Object.assign({}, E.defaults, { data: 'xor', maxEpochs: 12 }) },
      { label: 'Random separable cloud', params: Object.assign({}, E.defaults, { data: 'blobs', eta: 0.2, w0: 0.5, w1: -1, w2: 1 }) },
    ],
    controls: (p) => [
      { id: 'data', label: 'Training data', type: 'select', options: Object.entries(E.DATASETS).map(([k, v]) => [k, v.name]) },
      { type: 'html', html: `<div class="fnnote">${p.data === 'custom' ? '<b>Click</b> the plane to add a class-1 point, <b>Shift+click</b> (or right-click) for class 0. Points you add reset the run.' : 'Tip: pick “Your own points” to draw your own data set.'}</div>` },
      { id: 'eta', label: 'Learning rate η', type: 'range', min: 0.05, max: 2, step: 0.05 },
      { id: 'w0', label: 'Initial bias w₀', type: 'number', step: 0.1, min: -10, max: 10 },
      { id: 'w1', label: 'Initial w₁', type: 'number', step: 0.1, min: -10, max: 10 },
      { id: 'w2', label: 'Initial w₂', type: 'number', step: 0.1, min: -10, max: 10 },
      { id: 'gran', label: 'One step =', type: 'select', options: [['sample', 'one training point'], ['epoch', 'one epoch']], live: (v, api) => (api.st.p.gran = v) },
      { id: 'maxEpochs', label: 'Max epochs', type: 'number', min: 1, max: 500 },
      { id: 'seed', label: 'Seed (random cloud)', type: 'number', min: 0, max: 99999 },
    ],
    phases: (st) => ({ list: ['Weighted sum z', 'Threshold → y', 'Update if wrong'], on: st.last ? (st.last.e ? 'Update if wrong' : 'Threshold → y') : null, next: 'Weighted sum z' }),
    stage: `<div class="viz-2"><div><canvas class="cv-square" data-cv="plane" style="cursor:crosshair"></canvas>
      <div class="legend"><span><i style="background:var(--accent)"></i>class 1</span><span><i style="border:2px solid var(--ink)"></i>class 0</span><span><i style="border:2px solid var(--bad)"></i>currently misclassified</span><span>shaded = region the neuron calls 1</span><span>arrow = weight vector (w₁, w₂)</span></div></div>
      <div><div class="mini">Mistakes per epoch</div><canvas class="cv-chart" data-cv="err"></canvas><div class="kv" data-w style="grid-template-columns:repeat(2,minmax(0,1fr))"></div></div></div>`,
    below: `<div class="two"><div class="panel"><div class="panel-h">Training trace (the hand-calculation table)</div><div class="tbl-wrap" data-trace style="max-height:340px;overflow:auto"></div></div>
      <div class="panel"><div class="panel-h">Single-neuron calculator (lecture example)</div>
        <p class="vsum">Lecture slide: x = [0, 0.19, 0.64, 1, 1], w = [0.3, 0.4, −0.3, 0.1, 0.5]. Edit and compare the MP neuron, perceptron and sigmoid outputs.</p>
        <label class="ctl"><span>inputs x (comma separated)</span><input type="text" data-nx value="0, 0.19, 0.64, 1, 1"></label>
        <label class="ctl" style="margin-top:8px"><span>weights w</span><input type="text" data-nw value="0.3, 0.4, -0.3, 0.1, 0.5"></label>
        <label class="ctl" style="margin-top:8px"><span>threshold θ</span><input type="number" data-nt value="0" step="0.1"></label>
        <div class="tape" data-nout style="margin-top:10px"></div></div></div>`,
    theory: `<p><b>MP neuron</b>: boolean inputs, fixed weights of 1, fires if Σxᵢ ≥ b. <b>Perceptron</b>: real weights learned from data.</p>
      <span class="f">z = w₀ + w₁x₁ + w₂x₂,   y = 1 if z ≥ 0 else 0</span>
      <p><b>Learning rule</b> (only when wrong):</p><span class="f">w ← w + η(t − y)·(1, x₁, x₂)</span>
      <p>Equivalent to the lecture form: if x ∈ P and w·x &lt; 0 then w = w + x; if x ∈ N and w·x ≥ 0 then w = w − x.</p>
      <p><b>Convergence theorem:</b> if the data are linearly separable, the rule stops after a finite number of mistakes. XOR is not separable, so it never stops.</p>
      <p><b>Sigmoid neuron</b> replaces the hard step with σ(z) = 1/(1 + e^(−z)), which gives a smooth output and allows gradient descent.</p>`,
    onMount(api) {
      const cv = api.$('[data-cv=plane]');
      const add = (e, cls) => {
        e.preventDefault();
        const r = cv.getBoundingClientRect();
        const [lo, hi] = api._b || [-1, 2];
        const m = UI.plane(r.width, r.height, lo, hi);
        const [x, y] = m.inv(e.clientX - r.left, e.clientY - r.top);
        const base = api.params.data === 'custom' ? api.params.custom || [] : api.st.data.map((d) => d.slice());
        base.push([+x.toFixed(2), +y.toFixed(2), cls]);
        api.params.data = 'custom';
        api.params.custom = base;
        api.rebuild();
        api.reset();
      };
      cv.addEventListener('click', (e) => add(e, e.shiftKey ? 0 : 1));
      cv.addEventListener('contextmenu', (e) => add(e, 0));
      const calc = () => {
        const xs = api.$('[data-nx]').value.split(',').map(Number),
          ws = api.$('[data-nw]').value.split(',').map(Number),
          th = +api.$('[data-nt]').value || 0;
        const r = E.neuron(xs, ws, th);
        api.$('[data-nout]').innerHTML = [
          `Σ wᵢxᵢ = ${xs.map((x, i) => `${SC.pg(ws[i] || 0)}×${SC.pg(x)}`).join(' + ')}`,
          `      = <b>${n(r.sum, 4)}</b>`,
          `perceptron (step at θ = ${g(th)}): y = ${r.sum >= th ? `1  since ${n(r.sum, 3)} ≥ ${g(th)}` : `0  since ${n(r.sum, 3)} < ${g(th)}`}`,
          `sigmoid: σ(${n(r.sum, 3)}) = 1/(1 + e^${SC.pg(-r.sum, 3)}) = <b>${n(r.sigmoid, 4)}</b>`,
          `MP neuron (boolean inputs only): fires if Σxᵢ ≥ θ → Σx = ${g(SC.sum(xs))} → ${SC.sum(xs) >= th ? 1 : 0}`,
        ]
          .map((l) => `<div>${l}</div>`)
          .join('');
      };
      api.$$('[data-nx],[data-nw],[data-nt]').forEach((i) => i.addEventListener('input', calc));
      calc();
    },
    render(st, api) {
      const [lo, hi] = bounds(st.data);
      api._b = [lo, hi];
      const { ctx, w, h } = UI.canvas(api.$('[data-cv=plane]'));
      const m = UI.plane(w, h, lo, hi);
      const W = st.w;
      // shaded decision region
      const cell = 6;
      const acc = UI.css('--accent');
      ctx.fillStyle = UI.css('--panel-2');
      ctx.fillRect(m.x0, m.y0, m.size, m.size);
      ctx.fillStyle = acc;
      ctx.globalAlpha = 0.13;
      for (let px = m.x0; px < m.x0 + m.size; px += cell)
        for (let py = m.y0; py < m.y0 + m.size; py += cell) {
          const [x, y] = m.inv(px + cell / 2, py + cell / 2);
          if (W[0] + W[1] * x + W[2] * y >= 0) ctx.fillRect(px, py, cell, cell);
        }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = UI.css('--line');
      ctx.strokeRect(m.x0 + 0.5, m.y0 + 0.5, m.size - 1, m.size - 1);
      // axes
      ctx.strokeStyle = UI.css('--faint');
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (lo < 0 && hi > 0) {
        ctx.moveTo(m.X(0), m.y0);
        ctx.lineTo(m.X(0), m.y0 + m.size);
        ctx.moveTo(m.x0, m.Y(0));
        ctx.lineTo(m.x0 + m.size, m.Y(0));
      }
      ctx.stroke();
      ctx.fillStyle = UI.css('--muted');
      ctx.font = '10.5px ' + UI.css('--mono');
      ctx.textAlign = 'center';
      ctx.fillText('x₁ →', m.x0 + m.size - 16, m.y0 + m.size + 14);
      ctx.fillText(SC.g(lo, 1), m.x0, m.y0 + m.size + 14);
      ctx.fillText(SC.g(hi, 1), m.x0 + m.size, m.y0 + m.size + 14);
      // decision line
      ctx.save();
      ctx.beginPath();
      ctx.rect(m.x0, m.y0, m.size, m.size);
      ctx.clip();
      if (Math.abs(W[1]) + Math.abs(W[2]) > 1e-12) {
        const pts = [];
        if (Math.abs(W[2]) > 1e-12) {
          for (const x of [lo - 10, hi + 10]) pts.push([x, -(W[0] + W[1] * x) / W[2]]);
        } else {
          const x = -W[0] / W[1];
          pts.push([x, lo - 10], [x, hi + 10]);
        }
        ctx.strokeStyle = acc;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(m.X(pts[0][0]), m.Y(pts[0][1]));
        ctx.lineTo(m.X(pts[1][0]), m.Y(pts[1][1]));
        ctx.stroke();
        // weight vector from the line point closest to the centre
        const c = (lo + hi) / 2,
          nn = W[1] * W[1] + W[2] * W[2];
        const t = (W[0] + W[1] * c + W[2] * c) / nn;
        const fx = c - t * W[1],
          fy = c - t * W[2];
        const L = 40 / Math.sqrt(nn);
        UI.arrow(ctx, m.X(fx), m.Y(fy), m.X(fx) + W[1] * L, m.Y(fy) - W[2] * L, acc, 2);
      }
      ctx.restore();
      // points
      const cur = st.last ? st.trace.length && st.data[st.last.k] : null;
      st.data.forEach((d) => {
        const x = m.X(d[0]),
          y = m.Y(d[1]);
        const pred = W[0] + W[1] * d[0] + W[2] * d[1] >= 0 ? 1 : 0;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, 7);
        if (d[2]) {
          ctx.fillStyle = acc;
          ctx.fill();
        } else {
          ctx.fillStyle = UI.css('--panel');
          ctx.fill();
          ctx.strokeStyle = UI.css('--ink');
          ctx.stroke();
        }
        if (pred !== d[2]) {
          ctx.strokeStyle = UI.css('--bad');
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(x, y, 11, 0, 7);
          ctx.stroke();
        }
        if (st.data.length <= 6) {
          ctx.fillStyle = UI.css('--muted');
          ctx.font = '10.5px ' + UI.css('--mono');
          ctx.textAlign = 'left';
          ctx.fillText(`(${g(d[0])},${g(d[1])})→${d[2]}`, x + 12, y - 8);
        }
      });
      if (cur) {
        ctx.strokeStyle = UI.css('--warn');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(m.X(cur[0]), m.Y(cur[1]), 15, 0, 7);
        ctx.stroke();
      }
      UI.lineChart(api.$('[data-cv=err]'), [{ label: 'mistakes', color: UI.css('--bad'), data: st.hist.map((v, i) => [i + 1, v]), dots: true }], { y0: 0 });
      api.$('[data-w]').innerHTML = [
        ['w₀ (bias)', g(W[0], 3)],
        ['w₁', g(W[1], 3)],
        ['w₂', g(W[2], 3)],
        ['epoch', st.epoch],
        ['updates', st.updates],
        ['status', st.converged ? 'converged' : st.done ? 'gave up' : 'learning'],
      ]
        .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`)
        .join('');
      const rows = st.trace.slice(-200);
      const box = api.$('[data-trace]');
      box.innerHTML = rows.length
        ? `<table class="data"><tr><th>ep</th><th>x₁</th><th>x₂</th><th>t</th><th>w before</th><th>z</th><th>y</th><th>t−y</th><th>w after</th></tr>${rows
            .map((r) => `<tr class="${r.e ? 'upd' : ''}"><td>${r.epoch}</td><td>${g(r.x1)}</td><td>${g(r.x2)}</td><td>${r.t}</td><td>(${r.w.map((v) => g(v, 3)).join(', ')})</td><td>${n(r.z, 2)}</td><td>${r.y}</td><td>${r.e}</td><td>(${r.nw.map((v) => g(v, 3)).join(', ')})</td></tr>`)
            .join('')}</table>`
        : '<div class="vsum">Step to fill the trace.</div>';
      box.scrollTop = box.scrollHeight;
    },
  };
})();
