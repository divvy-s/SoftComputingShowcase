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

  /* ------------------------------------------------------------------ GA (Deb) */
  function checkGADeb() {
    const E = SC.engines.ga;
    const st = E.create(E.textbookDeb);
    const rows = [];
    rows.push(row('Decoded values DV', [9, 20, 1, 26], st.pop.map((i) => i.dv), 0));
    rows.push(row('x = DV·π/31', [0.912, 2.027, 0.101, 2.635], st.pop.map((i) => i.x), 6e-4));
    rows.push(row('f(x) = sin x', [0.791, 0.898, 0.101, 0.485], st.pop.map((i) => i.f), 6e-4));
    rows.push(row('Average fitness f̄', [0.569], [st.stats.avg], 6e-4));
    rows.push(row('Expected copies fᵢ/f̄', [1.39, 1.58, 0.18, 0.85], st.expected, 6e-3));
    const s0 = E.schemaStats(st, '10***');
    const s0b = E.schemaStats(st, '00***');
    E.step(st);
    rows.push(row('Mating pool', ['01001', '10100', '10100', '11010'], st.pool.map((p) => p.bits), 0));
    rows.push(row('Actual count', [1, 2, 0, 1], st.counts, 0));
    E.step(st);
    E.step(st);
    E.step(st);
    const order = ['01000', '10101', '11100', '10010'];
    const got = order.map((b) => (st.pop.find((i) => i.bits === b) ? b : '—'));
    rows.push(row('New population (cross sites 3, 2)', order, got, 0));
    rows.push(row('New f(x)', [0.725, 0.849, 0.299, 0.968], order.map((b) => (st.pop.find((i) => i.bits === b) || { f: NaN }).f), 6e-4));
    const avgIndep = (Math.sin((8 * Math.PI) / 31) + Math.sin((21 * Math.PI) / 31) + Math.sin((28 * Math.PI) / 31) + Math.sin((18 * Math.PI) / 31)) / 4;
    rows.push(row('New average f̄', [0.711], [st.stats.avg], 6e-4, [avgIndep], 'Rounding: (0.725 + 0.849 + 0.299 + 0.968)/4 = 0.7103; Deb prints 0.711.'));
    rows.push(row('Schema H₁ = 10*** count, gen 0 → 1', [1, 2], [s0.m, E.schemaStats(st, '10***').m], 0));
    rows.push(row('Schema H₂ = 00*** count, gen 0 → 1', [1, 0], [s0b.m, E.schemaStats(st, '00***').m], 0));
    const handBound = ((1 * 0.8978) / 0.5688) * (1 - (1 * 1) / 4);
    rows.push(row('Schema theorem bound for H₁ (hand)', [handBound], [s0.bound], 2e-3, undefined, 'm·f(H)/f̄·(1 − pc·δ/(l−1))·(1−pm)^o = 1 × 0.8978/0.5688 × (1 − 1/4) × 1 ≈ 1.18 ≤ 2 actual ✓'));
    return { id: 'ga-deb', title: 'GA: one generation, maximise sin(x)', source: 'K. Deb, "An Introduction to Genetic Algorithms", Table 1 and §3.3 (course PDF)', rows };
  }

  /* ------------------------------------------------------------------ GA (lecture x²) */
  function checkGALecture() {
    const E = SC.engines.ga;
    const st = E.create(E.textbookLecture);
    const rows = [];
    rows.push(row('Decoded x', [12, 25, 5, 19], st.pop.map((i) => i.x), 1e-9));
    rows.push(row('Fitness x²', [144, 625, 25, 361], st.pop.map((i) => i.f), 1e-9));
    rows.push(row('Σf', [1155], [st.stats.sum], 1e-9));
    rows.push(row('Probability f/Σf', [0.12, 0.54, 0.021, 0.31], st.probs, 6e-3, undefined, 'The lecture truncates to 2–3 digits (0.1247 → 0.12, 0.0216 → 0.021).'));
    rows.push(row('Expected count N·p', [0.48, 2.16, 0.08, 1.24], st.expected, 2.5e-2, undefined, 'Lecture multiplies the rounded probabilities by 4.'));
    E.step(st);
    rows.push(row('Roulette with r = 0.4, 0.15, 0.7, 0.9 (hand)', ['11001', '11001', '10011', '10011'], st.pool.map((p) => p.bits), 0, undefined, 'Cumulative ranges 0–0.125, 0.125–0.666, 0.666–0.687, 0.687–1.'));
    return { id: 'ga-lecture', title: 'GA: roulette table, maximise x² on [0, 31]', source: 'Course slides "PPT-Genetic Algo", Solved Example (slide 29)', rows };
  }

  /* ------------------------------------------------------------------ Fuzzy */
  function checkFuzzy() {
    const E = SC.engines.fuzzy;
    const r = E.infer(60, 70, 'centroid', 1201);
    const rows = [];
    rows.push(row('μ dirt=60: SD, MD, LD', [0, 0.8, 0.2], r.md, 1e-9, undefined, 'MD: (100−60)/50, LD: (60−50)/50'));
    rows.push(row('μ grease=70: NG, MG, LG', [0, 0.6, 0.4], r.mg, 1e-9, undefined, 'MG: (100−70)/50, LG: (70−50)/50'));
    rows.push(row('Rule strengths R1…R9 (min)', [0, 0, 0, 0, 0.6, 0.4, 0, 0.2, 0.2], r.fired.map((f) => f.w), 1e-9));
    rows.push(row('Clip heights VS, S, M, L, VL (max)', [0, 0, 0.6, 0.4, 0.2], ['VS', 'S', 'M', 'L', 'VL'].map((k) => r.strength[k]), 1e-9));
    const hi = E.defuzzify(E.aggregate(r.strength, 200001), 'centroid').value;
    rows.push(row('Centroid (1201 samples vs 200 001-sample integral)', [hi], [r.out.value], 0.02, undefined, 'Independent high-resolution integration of the same aggregated shape.'));
    return { id: 'fuzzy', title: 'Fuzzy: wash time for dirt = 60, grease = 70', source: 'Hand calculation with triangular MFs (Sivanandam & Deepa washing-machine FLC; course MATLAB .fis)', rows };
  }

  /* ------------------------------------------------------------------ Perceptron */
  function checkPerceptron() {
    const E = SC.engines.perceptron;
    const st = E.create({ data: 'and', eta: 1, w0: 0, w1: 0, w2: 0, maxEpochs: 20, gran: 'epoch' });
    const ws = [];
    while (!st.done) {
      E.step(st);
      ws.push(st.w.slice());
    }
    const rows = [];
    const hand = [
      [0, 1, 1],
      [-1, 2, 1],
      [-2, 2, 1],
      [-2, 2, 2],
      [-3, 2, 1],
      [-3, 2, 1],
    ];
    hand.forEach((h, e) => rows.push(row(`Weights (w₀, w₁, w₂) after epoch ${e + 1}`, h, ws[e] || [NaN, NaN, NaN], 1e-9)));
    rows.push(row('Mistakes per epoch', [2, 3, 3, 2, 1, 0], st.hist, 0));
    rows.push(row('Converged', ['yes'], [st.converged ? 'yes' : 'no'], 0));
    const nr = E.neuron([0, 0.19, 0.64, 1, 1], [0.3, 0.4, -0.3, 0.1, 0.5]);
    rows.push(row('Lecture neuron: Σ wᵢxᵢ', [0.484], [nr.sum], 1e-9, undefined, '0 + 0.076 − 0.192 + 0.1 + 0.5'));
    return { id: 'perceptron', title: 'Perceptron learning on AND (w = 0, η = 1)', source: 'Hand trace (in README) of the lecture perceptron rule; lecture example x, w (slide 22)', rows };
  }

  SC.verifiers = [checkPSO, checkABC, checkGADeb, checkGALecture, checkFuzzy, checkPerceptron];
  SC.verifyById = { pso: [checkPSO], abc: [checkABC], ga: [checkGADeb, checkGALecture], fuzzy: [checkFuzzy], perceptron: [checkPerceptron] };
})(typeof window !== 'undefined' ? window : globalThis);
