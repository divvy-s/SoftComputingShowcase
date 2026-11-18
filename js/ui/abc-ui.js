(function () {
  'use strict';
  const SC = window.SC,
    UI = SC.ui,
    E = SC.engines.abc;
  const { n } = SC;

  function flower(ctx, x, y, r, fill) {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#3d2a00';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  const PH = { employed: 'Employed bees', onlooker: 'Onlooker bees', scout: 'Scout bees', memorize: 'Memorise best' };

  UI.modules.abc = {
    key: 'abc',
    title: 'Artificial Bee Colony',
    tagline: 'Employed bees search near their own flower, onlookers flock to rich flowers after watching the waggle dance, and scouts abandon exhausted flowers. Follow one bee at a time.',
    engine: E,
    start: E.textbook,
    verify: 'abc',
    presets: [
      { label: '📖 Slides example (sphere, SN = 5, limit = 1)', params: E.textbook, book: true, hint: 'Initial population and random choices from the solved example' },
      { label: 'Himmelblau, 10 sources', params: E.defaults },
      { label: 'Rastrigin, 15 sources', params: Object.assign({}, E.defaults, { fn: 'rastrigin', SN: 15, limit: 10, seed: 8 }) },
    ],
    controls: (p) => [
      { id: 'fn', label: 'Problem (minimise)', type: 'select', options: SC.FUNC_OPTIONS },
      { type: 'html', html: `<div class="fnnote">${SC.FUNCS[p.fn].note}</div>` },
      { id: 'SN', label: 'Food sources SN (= employed bees)', type: 'range', min: 2, max: 30, step: 1, help: 'Colony size = 2·SN (as many onlookers as employed bees).' },
      { id: 'limit', label: 'Abandonment limit', type: 'range', min: 0, max: 30, step: 1, help: 'A source that fails to improve more than this many times is given up.' },
      { id: 'gran', label: 'One step =', type: 'select', options: [['bee', 'one bee'], ['phase', 'one phase'], ['cycle', 'one full cycle']], keepBook: true, live: (v, api) => (api.st.p.gran = v) },
      { id: 'maxCycles', label: 'Max cycles', type: 'number', min: 1, max: 1000 },
      { id: 'seed', label: 'Random seed', type: 'number', min: 0, max: 99999 },
    ],
    phases: (st) => {
      const map = { employed: 'Employed bees', onlooker: 'Onlooker bees', scout: 'Scout bees', memorize: 'Memorise best' };
      return { list: Object.values(map), on: st.last ? map[st.last.type] : null, next: map[st.phase] };
    },
    stage: `<div class="viz-2"><div><canvas class="cv-square" data-cv="space"></canvas>
      <div class="legend"><span><i style="background:var(--honey)"></i>food source (size = nectar)</span><span>t = trial counter</span><span>★ best so far</span><span><i style="background:#51cf66"></i>accepted</span><span><i style="background:#ff6b6b"></i>rejected</span></div></div>
      <div><div class="mini">Waggle-dance probabilities pₘ</div><div class="bars" data-bars></div><div class="vsum" data-probnote style="margin-top:6px"></div>
      <div class="mini">Best f so far (log scale)</div><canvas class="cv-chart" data-cv="conv"></canvas></div></div>`,
    below: `<div class="panel"><div class="panel-h">Food sources</div><div class="tbl-wrap" data-tbl></div></div>`,
    theory: `<p><b>Initialisation:</b></p><span class="f">xₘᵢ = lᵢ + rand(0,1)·(uᵢ − lᵢ)</span>
      <p><b>Neighbour search</b> (employed and onlooker bees): change one random variable i using a random partner k ≠ m:</p><span class="f">vₘᵢ = xₘᵢ + φₘᵢ (xₘᵢ − xₖᵢ),  φ ∈ [−1, 1]</span>
      <p><b>Fitness</b> for minimisation:</p><span class="f">fit = 1/(1 + f) if f ≥ 0, else 1 + |f|</span>
      <p><b>Greedy selection:</b> keep the candidate only if its fitness is higher; otherwise trial ← trial + 1.</p>
      <p><b>Onlooker probability</b> (as on the course slides):</p><span class="f">pₘ = 0.9 · fitₘ / max(fit) + 0.1</span>
      <p>Onlookers walk over the sources in turn and are recruited when rand &lt; pₘ, until SN onlookers have searched.</p>
      <p><b>Scout:</b> the source with the largest trial counter is re-initialised at random if trial &gt; limit.</p>`,
    render(st, api) {
      const F = SC.FUNCS[st.p.fn];
      const { ctx, w, h } = UI.canvas(api.$('[data-cv=space]'));
      const m = UI.plane(w, h, F.lo, F.hi);
      UI.drawLandscape(ctx, m, st.p.fn);
      const S = st.foods;
      const fits = S.map((s) => s.fit),
        fmax = Math.max(...fits),
        fmin = Math.min(...fits);
      const L = st.last;
      // scout ghost
      if (L && L.type === 'scout' && L.m >= 0) {
        const ox = m.X(L.old.x[0]),
          oy = m.Y(L.old.x[1]);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ox, oy, 10, 0, 7);
        ctx.stroke();
        ctx.setLineDash([]);
        UI.arrow(ctx, ox, oy, m.X(S[L.m].x[0]), m.Y(S[L.m].x[1]), '#ffd43b', 2.5);
      }
      // neighbour search
      if (L && (L.type === 'employed' || L.type === 'onlooker')) {
        const ox = m.X(L.old.x[0]),
          oy = m.Y(L.old.x[1]);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(m.X(L.partnerX[0]), m.Y(L.partnerX[1]));
        ctx.stroke();
        ctx.setLineDash([]);
        const cx = SC.clamp(m.X(L.cand[0]), m.x0, m.x0 + m.size),
          cy = SC.clamp(m.Y(L.cand[1]), m.y0, m.y0 + m.size);
        const col = L.accepted ? '#51cf66' : '#ff6b6b';
        UI.arrow(ctx, ox, oy, cx, cy, col, 2.5);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        if (L.accepted) {
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, 7);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(cx - 5, cy - 5);
          ctx.lineTo(cx + 5, cy + 5);
          ctx.moveTo(cx + 5, cy - 5);
          ctx.lineTo(cx - 5, cy + 5);
          ctx.stroke();
        }
        if (!L.accepted) {
          ctx.globalAlpha = 0.5;
          flower(ctx, ox, oy, 8, '#ccc');
          ctx.globalAlpha = 1;
        }
      }
      S.forEach((s, i) => {
        const x = m.X(s.x[0]),
          y = m.Y(s.x[1]);
        const t = fmax > fmin ? (s.fit - fmin) / (fmax - fmin) : 1;
        flower(ctx, x, y, 6 + 7 * t, UI.css('--honey'));
        ctx.fillStyle = '#2b1d00';
        ctx.font = 'bold 9.5px ' + UI.css('--sans');
        ctx.textAlign = 'center';
        ctx.fillText(i + 1, x, y + 3.5);
        if (s.trial) {
          ctx.font = '10px ' + UI.css('--mono');
          ctx.fillStyle = '#fff';
          ctx.fillText('t=' + s.trial, x, y - 16);
        }
        if (L && L.m === i) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 17, 0, 7);
          ctx.stroke();
        }
      });
      UI.star(ctx, m.X(st.best.x[0]), m.Y(st.best.x[1]), 10, '#ff4d4f', '#fff');

      // dance floor
      const bars = api.$('[data-bars]');
      if (st.probs) {
        bars.innerHTML = st.probs
          .map(
            (p, i) =>
              `<div class="bar ${L && L.type === 'onlooker' && L.m === i ? 'hit' : ''}"><span>#${i + 1}</span><span class="track"><span class="fill" style="width:${p * 100}%"></span>${L && L.type === 'onlooker' && L.m === i ? `<span class="r" style="left:${L.r * 100}%" title="r"></span>` : ''}</span><span>${n(p, 3)}</span></div>`
          )
          .join('');
        api.$('[data-probnote]').innerHTML =
          L && L.type === 'onlooker' ? `Black tick = this onlooker’s random r. It is left of the bar’s end (r &lt; p), so the onlooker was recruited.` : st.phase === 'onlooker' ? `${st.onT || 0} of ${S.length} onlookers recruited so far.` : 'Computed after every employed bee is back.';
      } else {
        bars.innerHTML = '<div class="vsum">Probabilities are computed after the employed-bee phase.</div>';
        api.$('[data-probnote]').innerHTML = '';
      }
      UI.lineChart(api.$('[data-cv=conv]'), [{ label: 'best f', color: UI.css('--honey'), data: st.hist.map((v) => Math.max(v - F.fmin, 1e-12)) }], { logY: true });
      api.$('[data-tbl]').innerHTML =
        `<table class="data"><tr><th>#</th><th>x₁</th><th>x₂</th><th>f(x)</th><th>fit = 1/(1+f)</th><th>trial</th><th>p (dance)</th></tr>` +
        S.map(
          (s, i) =>
            `<tr class="${L && L.m === i ? 'cur' : ''}"><td>${i + 1}</td><td>${n(s.x[0])}</td><td>${n(s.x[1])}</td><td>${n(s.f)}</td><td>${n(s.fit)}</td><td>${s.trial}${s.trial > st.p.limit ? ' <span class="chip fail">&gt; limit</span>' : ''}</td><td>${st.probs ? n(st.probs[i], 3) : '—'}</td></tr>`
        ).join('') +
        `</table><div class="vsum" style="margin-top:6px">Cycle ${st.cycle + (st.phase === 'employed' && st.cursor === 0 ? 0 : 1)} · next: ${PH[st.phase]} · best f = ${n(st.best.f, 6)} at ${SC.vec(st.best.x)} · ${st.evals} evaluations</div>`;
    },
  };
})();
