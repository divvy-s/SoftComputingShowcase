/* Textbook / hand-calculation checks. Each check re-runs an engine from scratch and compares
 * its numbers with the values printed in the course material (or worked by hand).
 * status: pass  = tool matches the book within tolerance
 *         slip  = tool differs from the book, but an independent re-computation agrees with the tool
 *                 (i.e. the printed value contains an arithmetic slip)
 *         note  = informational difference that the source itself does not explain
 *         fail  = tool is wrong */
(function (root) {
  'use strict';
  const SC = root.SC;

  function row(what, book, tool, tol, indep, note) {
    const B = [].concat(book),
      T = [].concat(tool);
    const close = (a, b) => (typeof a === 'number' ? Math.abs(a - b) <= tol : a === b);
    let status = B.length === T.length && B.every((b, i) => close(b, T[i])) ? 'pass' : 'fail';
    if (status === 'fail' && indep !== undefined) {
      const I = [].concat(indep);
      if (I.length === T.length && I.every((v, i) => close(v, T[i]))) status = 'slip';
    }
    const fmt = (a) =>
      a
        .map((v) => (typeof v === 'number' ? SC.g(v, tol < 0.001 ? 6 : 4) : v))
        .join(', ');
    return { what, book: fmt(B), tool: fmt(T), status, note: note || '' };
  }
  const note = (what, book, tool, text) => ({ what, book, tool, status: 'note', note: text });

  /* ------------------------------------------------------------------ PSO */
  function checkPSO() {
    const E = SC.engines.pso;
    const st = E.create(E.textbook);
    const rows = [];
    rows.push(row('Initial fitness f(x₁…x₅)', [30.3831, 29.4265, 19.9258, 4.4325, 12.1429], st.particles.map((q) => q.f), 1e-3));
    rows.push(row('Initial gbest particle', [4], [st.gi + 1], 0));
    const x = [];
    const v = [];
    for (let i = 0; i < 5; i++) {
      E.step(st);
      x.push(st.particles[i].x.slice());
      v.push(st.last.det.map((t) => t.vRaw));
    }
    rows.push(row('v₁₁ (particle 1, dim 1)', [-1.35574], [v[0][0]], 1e-4));
    rows.push(row('x₁₁', [1.34876], [x[0][0]], 1e-4));
    const v12 = 0.6987 + 2 * 0.47 * (4.803 - 4.803) + 2 * 0.91 * (1.3202 - 4.803);
    rows.push(
      row('v₁₂ (particle 1, dim 2)', [-5.351696], [v[0][1]], 1e-4, [v12], 'Handout slip: 2×0.91×(1.3202 − 4.8030) = −6.3387, so v₁₂ = 0.6987 − 6.3387 = −5.6400, not −5.3517.')
    );
    rows.push(row('x₁₂', [-0.5486], [x[0][1]], 1e-4, [4.803 + v12], 'Follows from the v₁₂ slip: 4.8030 − 5.6400 = −0.8370.'));
    rows.push(row('x₂ = (x₂₁, x₂₂)', [-0.075228, 3.094208], x[1], 1e-4));
    rows.push(row('x₃', [2.2534, 3.1379], x[2], 1e-4));
    rows.push(row('x₄', [2.2583, 1.7951], x[3], 1e-4));
    rows.push(row('x₅', [2.2668, 2.0009], x[4], 1e-4));
    E.step(st); // evaluate
    const f1 = (1.34876) ** 2 + (4.803 + v12) ** 2;
    rows.push(row('f(x₁) after move', [2.12], [st.particles[0].f], 1e-3, [f1], 'Follows from the v₁₂ slip. Particle 1 is still the best, so every later conclusion holds.'));
    rows.push(row('f(x₂…x₅) after move', [9.5797, 14.9242, 8.3223, 9.142], st.particles.slice(1).map((q) => q.f), 1e-3));
    rows.push(row('New gbest particle', [1], [st.gi + 1], 0));
    rows.push(row('pbest₄ kept (8.3223 > 4.4325)', [1.64, 1.3202], st.particles[3].pbest, 1e-6));
    rows.push(row('pbest₂', [-0.0752, 3.0942], st.particles[1].pbest, 1e-3));
    return { id: 'pso', title: 'PSO: one iteration on f = x₁² + x₂²', source: 'Course handout "Understanding PSO Step by Step" (pp. 3–8)', rows };
  }

  /* ------------------------------------------------------------------ ABC */
  function checkABC() {
    const E = SC.engines.abc;
    const st = E.create(E.textbook);
    const rows = [];
    rows.push(row('Initial f', [5, 13, 17, 34, 9], st.foods.map((s) => s.f), 1e-9));
    rows.push(row('Initial fitness 1/(1+f)', [0.167, 0.071, 0.056, 0.028, 0.1], st.foods.map((s) => s.fit), 6e-4));
    E.step(st);
    const L = st.last;
    rows.push(row('Bee 1: Xnew₁,₁ = 2 + 0.81(2 − (−5))', [7.67], [L.raw], 1e-9));
    rows.push(row('Bee 1: clamped to bound', [5], [L.cl], 0));
    rows.push(row('Bee 1: f(Xnew), fit(Xnew)', [26, 0.037], [L.fv, L.fitv], 6e-4));
    rows.push(row('Bee 1: rejected, trial₁', [1], [st.foods[0].trial], 0));
    for (let i = 1; i < 5; i++) E.step(st);
    rows.push(row('After employed phase: X (flattened)', [2, -1, 0, 2, 1, -1.48, -5, 2.72, 3, 0], st.foods.flatMap((s) => s.x), 1e-9));
    rows.push(row('After employed phase: f', [5, 4, 3.19, 32.4, 9], st.foods.map((s) => s.f), 6e-3));
    rows.push(row('After employed phase: trial', [1, 0, 0, 0, 1], st.foods.map((s) => s.trial), 0));
    const p2 = (0.9 * (1 / 5)) / (1 / (1 + 3.1904)) + 0.1;
    rows.push(
      row('Probabilities pₘ = 0.9·fit/max + 0.1', [0.729, 0.859, 1, 0.213, 0.476], st.probs, 2e-3, [0.729, p2, 1, 0.213, 0.476].map((v, i) => (i === 1 ? v : st.probs[i])), 'Slide slip on p₂: 0.9 × 0.2 / 0.2386 + 0.1 = 0.854, not 0.859.')
    );
    E.step(st);
    rows.push(row('Onlooker 1: r = 0.39 < 0.729, Xnew₁ = 2 + 0.68(2 − 3)', [1.32, -1], st.foods[0].x, 1e-9));
    rows.push(row('Onlooker 1: f, fit', [2.74, 0.267], [st.foods[0].f, st.foods[0].fit], 6e-3));
    for (let i = 1; i < 5; i++) E.step(st);
    rows.push(row('After onlooker phase: X', [1.32, -1, 0, 2, 0.88, -1.48, -4.12, 2.72, 3, 0], st.foods.flatMap((s) => s.x), 1e-9));
    rows.push(row('After onlooker phase: f', [2.742, 4, 2.96, 24.38, 9], st.foods.map((s) => s.f), 1e-2));
    rows.push(row('After onlooker phase: trial', [0, 1, 0, 0, 2], st.foods.map((s) => s.trial), 0));
    E.step(st);
    rows.push(row('Scout: X₅ abandoned (trial 2 > limit 1)', [5], [st.last.m + 1], 0));
    rows.push(row('Scout: Xnew₅ = −5 + rand·10', [-0.7, -0.8], st.foods[4].x, 1e-9, [-5 + 0.43 * 10, -5 + 0.58 * 10], 'Slide slip: −5 + 0.58 × 10 = +0.8, not −0.8. f = 0.49 + 0.64 = 1.13 either way, so nothing downstream changes.'));
    rows.push(row('Scout: f, fit', [1.13, 0.469], [st.foods[4].f, st.foods[4].fit], 1e-3));
    rows.push(
      note('Final slide table, row X₁', '(1.32, −0.92), f = 2.589', `(${st.foods[0].x.map((v) => SC.g(v)).join(', ')}), f = ${SC.g(st.foods[0].f)}`, 'The slide also changes X₁ in its last table, but no step on the slides produces this. SoftLab keeps X₁ as the onlooker phase left it.')
    );
    return { id: 'abc', title: 'ABC: one full cycle on f = x₁² + x₂²', source: 'Course slides "ABC Algo", Solved Example (slides 14–19)', rows };
  }

  SC.verifiers = [checkPSO, checkABC];
  SC.verifyById = { pso: [checkPSO], abc: [checkABC] };
})(typeof window !== 'undefined' ? window : globalThis);
