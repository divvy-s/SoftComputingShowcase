(function () {
  'use strict';
  const SC = window.SC,
    UI = SC.ui,
    E = SC.engines.pso;
  const { n } = SC;

  const hue = (i, N) => `hsl(${(i * 360) / N + 10} 85% 62%)`;

  UI.modules.pso = {
    key: 'pso',
    title: 'Particle Swarm Optimisation',
    tagline: 'Each particle remembers its own best spot and hears about the swarm’s best spot. Watch the three pushes (inertia, memory, peer pressure) add up to every move.',
    engine: E,
    start: E.textbook,
    verify: 'pso',
    presets: [
      { label: '📖 Handout example (sphere, 5 particles)', params: E.textbook, book: true, hint: 'Exact positions, velocities and r₁, r₂ from the course handout' },
      { label: 'Rastrigin, 12 particles', params: E.defaults },
      { label: 'Himmelblau, ring topology', params: Object.assign({}, E.defaults, { fn: 'himmelblau', topology: 'ring', N: 16, seed: 21 }) },
    ],
    controls: (p) => [
      { id: 'fn', label: 'Problem (minimise)', type: 'select', options: SC.FUNC_OPTIONS },
      { type: 'html', html: `<div class="fnnote">${SC.FUNCS[p.fn].note}</div>` },
      { id: 'N', label: 'Swarm size N', type: 'range', min: 3, max: 40, step: 1 },
      { id: 'w', label: 'Inertia weight w', type: 'range', min: 0, max: 1.2, step: 0.01, help: 'How much of the old velocity is kept. High = explore, low = settle down.' },
      { id: 'c1', label: 'Cognitive c₁ (own memory)', type: 'range', min: 0, max: 3, step: 0.01 },
      { id: 'c2', label: 'Social c₂ (swarm best)', type: 'range', min: 0, max: 3, step: 0.01 },
      { id: 'vmax', label: 'Velocity limit vmax', type: 'range', min: 0.1, max: 8, step: 0.1 },
      { id: 'topology', label: 'Topology', type: 'select', options: [['gbest', 'gbest (star): everyone follows the global best'], ['ring', 'lbest (ring): follow the best of your 2 neighbours']] },
      { id: 'gran', label: 'One step =', type: 'select', options: [['particle', 'one particle (see the arithmetic)'], ['iteration', 'one whole iteration']], keepBook: true, live: (v, api) => (api.st.p.gran = v) },
      { id: 'maxIter', label: 'Max iterations', type: 'number', min: 1, max: 1000 },
      { id: 'seed', label: 'Random seed', type: 'number', min: 0, max: 99999, help: 'Same seed → same run, so you can replay and compare.' },
    ],
    phases: (st) => ({ list: ['Initialise', 'Move particles (velocity + position)', 'Evaluate, update pbest/gbest'], on: !st.last ? 'Initialise' : st.last.type === 'move' ? 'Move particles (velocity + position)' : 'Evaluate, update pbest/gbest', next: st.phase === 'move' ? 'Move particles (velocity + position)' : 'Evaluate, update pbest/gbest' }),
    stage: `<canvas class="cv-square" data-cv="space"></canvas>
      <div class="legend"><span><i style="background:#fff;border:1px solid #333"></i>particle</span><span><i class="sq" style="border:2px solid #fff;background:transparent"></i>pbest</span><span>★ gbest</span><span>✕ true minimum</span>
      <span><i class="ln" style="background:var(--c-in)"></i>inertia</span><span><i class="ln" style="background:var(--c-cog)"></i>cognitive</span><span><i class="ln" style="background:var(--c-soc)"></i>social</span></div>
      <div class="mini">Best f found so far (log scale)</div><canvas class="cv-chart" data-cv="conv"></canvas>`,
    below: `<div class="panel"><div class="panel-h">Swarm table</div><div class="tbl-wrap" data-tbl></div></div>`,
    theory: `<p><b>Velocity update</b> for particle i, dimension d:</p><span class="f">vᵢd ← w·vᵢd + c₁r₁(pbestᵢd − xᵢd) + c₂r₂(gbestd − xᵢd)</span>
      <p><b>Position update:</b></p><span class="f">xᵢd ← xᵢd + vᵢd</span>
      <p>r₁, r₂ ~ U(0,1) are drawn fresh for every particle and dimension. The handout example uses w = 1 (no inertia weight), c₁ = c₂ = 2 and clamps |v| ≤ 7.</p>
      <ul><li><b>gbest</b> (star topology) converges fast but may get stuck early.</li><li><b>lbest</b> (ring topology) spreads information slowly, which keeps diversity and helps on multimodal functions.</li>
      <li>Updates here are <i>synchronous</i>: all particles move using last iteration’s gbest, then everyone is evaluated, as in the handout.</li></ul>`,
    render(st, api) {
      const F = SC.FUNCS[st.p.fn];
      const { ctx, w, h } = UI.canvas(api.$('[data-cv=space]'));
      const m = UI.plane(w, h, F.lo, F.hi);
      UI.drawLandscape(ctx, m, st.p.fn);
      const P = st.particles,
        N = P.length;
      // ring links
      if (st.p.topology === 'ring') {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        P.forEach((q, i) => {
          const r = P[(i + 1) % N];
          ctx.moveTo(m.X(q.x[0]), m.Y(q.x[1]));
          ctx.lineTo(m.X(r.x[0]), m.Y(r.x[1]));
        });
        ctx.stroke();
      }
      // pbest links & markers
      P.forEach((q, i) => {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(m.X(q.x[0]), m.Y(q.x[1]));
        ctx.lineTo(m.X(q.pbest[0]), m.Y(q.pbest[1]));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = hue(i, N);
        ctx.lineWidth = 2;
        ctx.strokeRect(m.X(q.pbest[0]) - 4, m.Y(q.pbest[1]) - 4, 8, 8);
      });
      // trails
      P.forEach((q) => {
        if (!q.prev) return;
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(m.X(q.prev[0]), m.Y(q.prev[1]));
        ctx.lineTo(m.X(q.x[0]), m.Y(q.x[1]));
        ctx.stroke();
      });
      // velocity decomposition of the particle that just moved
      if (st.last && st.last.type === 'move') {
        const q = P[st.last.i];
        let a = [m.X(q.prev[0]), m.Y(q.prev[1])];
        for (const [k, col] of [
          ['inert', '--c-in'],
          ['cog', '--c-cog'],
          ['soc', '--c-soc'],
        ]) {
          const b = [a[0] + q.comp[k][0] * m.s, a[1] - q.comp[k][1] * m.s];
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 3;
          UI.arrow(ctx, a[0], a[1], b[0], b[1], UI.css(col), 3);
          ctx.restore();
          a = b;
        }
        // ghost of previous position
        ctx.strokeStyle = '#fff';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(m.X(q.prev[0]), m.Y(q.prev[1]), 7, 0, 7);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // particles
      P.forEach((q, i) => {
        const x = m.X(q.x[0]),
          y = m.Y(q.x[1]);
        ctx.beginPath();
        ctx.arc(x, y, 6.5, 0, 7);
        ctx.fillStyle = hue(i, N);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#111';
        ctx.stroke();
        if (N <= 12) {
          ctx.fillStyle = '#111';
          ctx.font = 'bold 9px ' + UI.css('--sans');
          ctx.textAlign = 'center';
          ctx.fillText(i + 1, x, y + 3);
        }
        if (st.last && st.last.type === 'move' && st.last.i === i) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 11, 0, 7);
          ctx.stroke();
        }
      });
      UI.star(ctx, m.X(st.gbest[0]), m.Y(st.gbest[1]), 11, '#ff4d4f', '#fff');
      // convergence
      UI.lineChart(api.$('[data-cv=conv]'), [{ label: 'gbest f', color: UI.css('--accent'), data: st.hist.map((v) => Math.max(v - F.fmin, 1e-12)) }], { logY: true });
      // table
      const cur = st.last && st.last.type === 'move' ? st.last.i : -1;
      api.$('[data-tbl]').innerHTML =
        `<table class="data"><tr><th>#</th><th>x₁</th><th>x₂</th><th>v₁</th><th>v₂</th><th>f(x)</th><th>pbest</th><th>f(pbest)</th></tr>` +
        P.map(
          (q, i) =>
            `<tr class="${i === cur ? 'cur' : ''} ${SC.vec(q.pbest) === SC.vec(st.gbest) ? 'best' : ''}"><td><span style="color:${hue(i, N)}">●</span> ${i + 1}</td><td>${n(q.x[0])}</td><td>${n(q.x[1])}</td><td>${n(q.v[0])}</td><td>${n(q.v[1])}</td><td>${n(q.f)}</td><td>${SC.vec(q.pbest)}</td><td>${n(q.pf)}</td></tr>`
        ).join('') +
        `</table><div class="vsum" style="margin-top:6px">gbest = ${SC.vec(st.gbest)}, f = ${n(st.gf, 6)} · iteration ${st.iter} · ${st.evals} function evaluations${st.last && st.last.type === 'move' ? ' · <b>f(x) is refreshed in the evaluate step</b>' : ''}</div>`;
    },
  };
})();
