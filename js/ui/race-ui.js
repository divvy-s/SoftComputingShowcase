(function () {
  'use strict';
  const SC = window.SC,
    UI = SC.ui,
    E = SC.engines.race;
  const { n } = SC;
  const COL = { pso: '#4dabf7', abc: '#f5a524' };

  function dots(cv, key, pts, best, color) {
    const F = SC.FUNCS[key];
    const { ctx, w, h } = UI.canvas(cv);
    const m = UI.plane(w, h, F.lo, F.hi, 14);
    UI.drawLandscape(ctx, m, key);
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(m.X(p[0]), m.Y(p[1]), 4, 0, 7);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    UI.star(ctx, m.X(best[0]), m.Y(best[1]), 8, '#ff4d4f', '#fff');
  }

  UI.modules.race = {
    key: 'race',
    title: 'Swarm Race: PSO vs ABC',
    tagline: 'Particle swarm and bee colony start side by side on the same landscape with the same number of individuals. Who reaches the bottom first, counted in function evaluations?',
    engine: E,
    presets: [
      { label: 'Rastrigin (many traps)', params: E.defaults },
      { label: 'Himmelblau (4 equal minima)', params: Object.assign({}, E.defaults, { fn: 'himmelblau' }) },
      { label: 'Rosenbrock (banana valley)', params: Object.assign({}, E.defaults, { fn: 'rosenbrock', budget: 3000 }) },
    ],
    controls: (p) => [
      { id: 'fn', label: 'Landscape (minimise)', type: 'select', options: SC.FUNC_OPTIONS },
      { type: 'html', html: `<div class="fnnote">${SC.FUNCS[p.fn].note}</div>` },
      { id: 'N', label: 'Individuals per algorithm', type: 'range', min: 6, max: 60, step: 2 },
      { id: 'budget', label: 'Evaluation budget', type: 'range', min: 200, max: 8000, step: 100 },
      { id: 'seed', label: 'Random seed', type: 'number', min: 0, max: 99999, help: 'Re-run with several seeds before declaring a winner.' },
      { type: 'html', html: `<div class="fnnote">PSO: w = 0.72, c₁ = c₂ = 1.49, gbest. ABC: SN = N/2, limit = SN.</div>` },
    ],
    stage: `<div class="race3">
      <div><h4><span style="color:${COL.pso}">● PSO</span><span data-b="pso"></span></h4><canvas class="cv-square" data-cv="pso"></canvas></div>
      <div><h4><span style="color:${COL.abc}">● ABC</span><span data-b="abc"></span></h4><canvas class="cv-square" data-cv="abc"></canvas></div></div>
      <div class="mini">Best f so far vs function evaluations (log scale)</div><canvas class="cv-chart" data-cv="conv" style="height:220px"></canvas>`,
    render(st, api) {
      const k = st.p.fn,
        F = SC.FUNCS[k];
      dots(api.$('[data-cv=pso]'), k, st.pso.particles.map((q) => q.x), st.pso.gbest, COL.pso);
      dots(api.$('[data-cv=abc]'), k, st.abc.foods.map((s) => s.x), st.abc.best.x, COL.abc);
      api.$('[data-b=pso]').textContent = `f = ${n(st.pso.gf, 5)} · ${st.pso.evals} ev`;
      api.$('[data-b=abc]').textContent = `f = ${n(st.abc.best.f, 5)} · ${st.abc.evals} ev`;
      const c = (arr) => arr.map(([e, f]) => [e, Math.max(f - F.fmin, 1e-12)]);
      UI.lineChart(
        api.$('[data-cv=conv]'),
        [
          { label: 'PSO', color: COL.pso, data: c(st.curves.pso) },
          { label: 'ABC', color: COL.abc, data: c(st.curves.abc) },
        ],
        { logY: true, xLabel: 'evaluations' }
      );
    },
  };
})();
