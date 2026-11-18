(function () {
  'use strict';
  const SC = window.SC,
    UI = SC.ui,
    E = SC.engines.fuzzy;
  const { n, g } = SC;
  const SETCOL = ['#4dabf7', '#9775fa', '#f783ac', '#ffa94d', '#69db7c'];

  /* draw a variable's membership functions; marks = [{x, mus}] */
  function drawMF(cv, V, opt = {}) {
    const { ctx, w, h } = UI.canvas(cv);
    const pad = { l: 30, r: 10, t: 22, b: 22 };
    const X = (x) => pad.l + ((x - V.lo) / (V.hi - V.lo)) * (w - pad.l - pad.r);
    const Y = (y) => pad.t + (1 - y) * (h - pad.t - pad.b);
    const muted = UI.css('--muted');
    ctx.font = '10.5px ' + UI.css('--mono');
    ctx.strokeStyle = UI.css('--line');
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(0));
    ctx.lineTo(w - pad.r, Y(0));
    ctx.moveTo(pad.l, Y(1));
    ctx.lineTo(w - pad.r, Y(1));
    ctx.stroke();
    ctx.fillStyle = muted;
    ctx.textAlign = 'right';
    ctx.fillText('1', pad.l - 5, Y(1) + 3);
    ctx.fillText('0', pad.l - 5, Y(0) + 3);
    ctx.textAlign = 'center';
    const ticks = V.hi === 60 ? [0, 10, 25, 40, 60] : [0, 25, 50, 75, 100];
    ticks.forEach((t) => ctx.fillText(t, X(t), h - 6));
    ctx.textAlign = 'left';
    ctx.font = '600 11px ' + UI.css('--sans');
    ctx.fillText(`${V.label} (${V.unit})`, pad.l, 13);
    // clipped fills (output only)
    if (opt.clip) {
      V.sets.forEach((s, k) => {
        const hgt = opt.clip[s.id];
        if (!hgt) return;
        ctx.beginPath();
        ctx.moveTo(X(s.abc[0]), Y(0));
        for (let i = 0; i <= 200; i++) {
          const x = s.abc[0] + ((s.abc[2] - s.abc[0]) * i) / 200;
          ctx.lineTo(X(x), Y(Math.min(hgt, E.trimf(x, ...s.abc))));
        }
        ctx.lineTo(X(s.abc[2]), Y(0));
        ctx.closePath();
        ctx.fillStyle = SETCOL[k] + '55';
        ctx.fill();
      });
    }
    if (opt.agg) {
      ctx.beginPath();
      opt.agg.xs.forEach((x, k) => (k ? ctx.lineTo(X(x), Y(opt.agg.mus[k])) : ctx.moveTo(X(x), Y(opt.agg.mus[k]))));
      ctx.lineTo(X(V.hi), Y(0));
      ctx.lineTo(X(V.lo), Y(0));
      ctx.closePath();
      ctx.fillStyle = UI.css('--accent') + '40';
      ctx.fill();
      ctx.strokeStyle = UI.css('--accent');
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    // set outlines
    V.sets.forEach((s, k) => {
      const [a, b, c] = s.abc;
      ctx.strokeStyle = SETCOL[k];
      ctx.lineWidth = opt.clip ? 1.2 : 2;
      ctx.setLineDash(opt.clip ? [4, 3] : []);
      ctx.beginPath();
      ctx.moveTo(X(a), Y(a === b ? 1 : 0));
      ctx.lineTo(X(b), Y(1));
      ctx.lineTo(X(c), Y(b === c ? 1 : 0));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = SETCOL[k];
      ctx.font = '600 10.5px ' + UI.css('--sans');
      ctx.textAlign = 'center';
      ctx.fillText(s.id, SC.clamp(X(b), pad.l + 10, w - pad.r - 10), Y(1) - 4);
    });
    // input marker
    if (opt.x !== undefined) {
      ctx.strokeStyle = UI.css('--ink');
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(X(opt.x), Y(0));
      ctx.lineTo(X(opt.x), Y(1.02));
      ctx.stroke();
      ctx.setLineDash([]);
      if (opt.mus)
        opt.mus.forEach((mu, k) => {
          if (mu <= 0) return;
          ctx.strokeStyle = SETCOL[k];
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(X(opt.x), Y(mu));
          ctx.lineTo(pad.l, Y(mu));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(X(opt.x), Y(mu), 4.5, 0, 7);
          ctx.fillStyle = SETCOL[k];
          ctx.fill();
          ctx.fillStyle = UI.css('--ink');
          ctx.font = '600 11px ' + UI.css('--mono');
          ctx.textAlign = 'left';
          ctx.fillText(n(mu, 2), X(opt.x) + 7, Y(mu) - 4);
        });
    }
    if (opt.out !== undefined && Number.isFinite(opt.out)) {
      ctx.strokeStyle = UI.css('--bad');
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(X(opt.out), Y(0));
      ctx.lineTo(X(opt.out), Y(1.02));
      ctx.stroke();
      ctx.fillStyle = UI.css('--bad');
      ctx.font = '700 12px ' + UI.css('--mono');
      ctx.textAlign = X(opt.out) > w - 90 ? 'right' : 'left';
      ctx.fillText(` z* = ${n(opt.out, 2)} min `, X(opt.out), Y(1.02) + 2);
    }
  }

  let surfCache = null;
  function drawSurface(cv, st) {
    const { ctx, w, h } = UI.canvas(cv);
    const R = 41,
      key = st.p.defuzz;
    if (!surfCache || surfCache.key !== key) {
      const vals = [];
      for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) vals.push(E.infer((i * 100) / (R - 1), (j * 100) / (R - 1), key, 241).out.value);
      surfCache = { key, vals };
    }
    const pad = { l: 34, r: 8, t: 8, b: 26 };
    const size = Math.min(w - pad.l - pad.r, h - pad.t - pad.b);
    const cw = size / R;
    surfCache.vals.forEach((v, k) => {
      const i = k % R,
        j = Math.floor(k / R);
      const c = UI.pal(v / 60);
      ctx.fillStyle = `rgb(${c})`;
      ctx.fillRect(pad.l + i * cw, pad.t + size - (j + 1) * cw, cw + 0.6, cw + 0.6);
    });
    const px = pad.l + (st.p.dirt / 100) * size,
      py = pad.t + size - (st.p.grease / 100) * size;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, 7);
    ctx.stroke();
    ctx.fillStyle = UI.css('--muted');
    ctx.font = '10.5px ' + UI.css('--mono');
    ctx.textAlign = 'center';
    ctx.fillText('dirt →', pad.l + size / 2, pad.t + size + 18);
    ctx.save();
    ctx.translate(12, pad.t + size / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('grease →', 0, 0);
    ctx.restore();
  }

  UI.modules.fuzzy = {
    key: 'fuzzy',
    title: 'Fuzzy Logic Controller (Mamdani)',
    tagline: 'A washing machine decides its wash time from “how dirty” and “how greasy” the clothes are. Follow the four Mamdani stages and see where every membership value and clip height comes from.',
    engine: E,
    verify: 'fuzzy',
    presets: [
      { label: '📖 Hand-check case: dirt 60, grease 70', params: Object.assign({}, E.defaults), book: true },
      { label: 'Lightly soiled (20, 10)', params: Object.assign({}, E.defaults, { dirt: 20, grease: 10 }) },
      { label: 'Very dirty (90, 85)', params: Object.assign({}, E.defaults, { dirt: 90, grease: 85 }) },
    ],
    controls: () => [
      { id: 'dirt', label: 'Dirt level (%)', type: 'range', min: 0, max: 100, step: 1 },
      { id: 'grease', label: 'Grease level (%)', type: 'range', min: 0, max: 100, step: 1 },
      { id: 'defuzz', label: 'Defuzzification', type: 'select', options: [['centroid', 'Centroid (centre of gravity)'], ['bisector', 'Bisector of area'], ['mom', 'Mean of maximum']] },
      { id: 'gran', label: 'Rules per step', type: 'select', options: [['rule', 'one rule at a time'], ['stage', 'all nine at once']] },
      { type: 'html', html: `<div class="fnnote">Same controller as the course MATLAB exercise ("Fuzzy Logic Controller to decide the wash timer"). Open MATLAB → <code>fuzzy</code> to compare with the Rule Viewer.</div>` },
    ],
    phases: (st) => {
      const at = st.stage === 0 ? null : st.stage <= 2 ? 'Fuzzify inputs' : st.stage <= 11 ? 'Evaluate rules (min)' : st.stage === 12 ? 'Aggregate (max)' : 'Defuzzify';
      const nx = st.done ? null : st.stage < 2 ? 'Fuzzify inputs' : st.stage <= 10 ? 'Evaluate rules (min)' : st.stage === 11 ? 'Aggregate (max)' : 'Defuzzify';
      return { list: ['Fuzzify inputs', 'Evaluate rules (min)', 'Aggregate (max)', 'Defuzzify'], on: at, next: nx };
    },
    stage: `<div class="fz-in"><canvas class="cv-wide" data-cv="dirt"></canvas><canvas class="cv-wide" data-cv="grease"></canvas></div>
      <div class="viz-2" style="margin-top:12px"><div><div class="mini">Rule base: IF dirt is row AND grease is column THEN wash time is cell</div><div class="rulegrid" data-rules></div></div>
      <div><div class="mini">Control surface (whole input space)</div><canvas class="cv-square" data-cv="surf" style="max-width:240px"></canvas></div></div>
      <div class="mini">Output: wash time</div><canvas class="cv-wide" data-cv="out"></canvas>`,
    theory: `<p><b>Triangular membership</b> with feet a, c and peak b:</p><span class="f">μ(x) = max(0, min((x − a)/(b − a), (c − x)/(c − b)))</span>
      <p><b>Rule strength</b> (AND = min): <span class="f">αᵣ = min(μ_dirt, μ_grease)</span></p>
      <p><b>Implication</b> (Mamdani): clip the output set at αᵣ. <b>Aggregation</b> (OR = max) over all rules.</p>
      <p><b>Centroid defuzzification:</b></p><span class="f">z* = ∫ μ(z)·z dz / ∫ μ(z) dz ≈ Σ μ(zₖ)zₖ / Σ μ(zₖ)</span>
      <p>Sets: dirt and grease use Small/None (0,0,50), Medium (0,50,100), Large (50,100,100). Wash time uses VS (0,0,10), S (0,10,25), M (10,25,40), L (25,40,60), VL (40,60,60) minutes.</p>`,
    render(st, api) {
      const S = E.SYS;
      drawMF(api.$('[data-cv=dirt]'), S.inputs[0], { x: st.p.dirt, mus: st.md });
      drawMF(api.$('[data-cv=grease]'), S.inputs[1], { x: st.p.grease, mus: st.mg });
      const clip = st.stage >= 3 ? st.strength : null;
      drawMF(api.$('[data-cv=out]'), S.output, { clip, agg: st.stage >= 12 ? st.agg : null, out: st.out ? st.out.value : undefined });
      const cur = st.fired.length && st.stage <= 11 ? st.fired[st.fired.length - 1] : null;
      let html = `<div class="h"></div>` + S.inputs[1].sets.map((s) => `<div class="h">grease ${s.id}</div>`).join('');
      for (let i = 0; i < 3; i++) {
        html += `<div class="h">dirt ${S.inputs[0].sets[i].id}</div>`;
        for (let j = 0; j < 3; j++) {
          const f = st.fired.find((q) => q.i === i && q.j === j);
          const o = S.rules[i][j];
          const on = cur && cur.i === i && cur.j === j && st.p.gran === 'rule';
          html += `<div class="cell ${on ? 'on' : ''} ${f && f.w === 0 ? 'zero' : ''}">${f ? `<span class="fillh" style="height:${f.w * 100}%"></span>` : ''}<span>R${i * 3 + j + 1}: ${o}</span><em>${f ? 'α = ' + n(f.w, 2) : '?'}</em></div>`;
        }
      }
      api.$('[data-rules]').innerHTML = html;
      drawSurface(api.$('[data-cv=surf]'), st);
    },
  };
})();
