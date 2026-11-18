/* Algorithm race: PSO vs ABC vs a real-coded GA on the same 2-D landscape, compared per function evaluation. */
(function (root) {
  'use strict';
  const SC = root.SC;
  const { n } = SC;

  /* --- small real-coded GA (tournament, BLX-0.5 crossover, Gaussian mutation, 1 elite) --- */
  function rgaCreate(P) {
    const F = SC.FUNCS[P.fn];
    const st = { kind: 'rga', p: P, rng: { s: (P.seed * 31 + 7) >>> 0 }, pop: [], evals: 0, gen: 0, hist: [] };
    for (let i = 0; i < P.N; i++) {
      const x = [SC.randRange(st.rng, F.lo, F.hi), SC.randRange(st.rng, F.lo, F.hi)];
      st.pop.push({ x, f: F.f(x) });
    }
    st.evals = P.N;
    st.best = Object.assign({}, st.pop[SC.argmin(st.pop.map((q) => q.f))]);
    st.hist.push(st.best.f);
    return st;
  }
  function rgaStep(st) {
    const P = st.p,
      F = SC.FUNCS[P.fn],
      R = st.rng,
      span = F.hi - F.lo;
    const tour = () => {
      const a = st.pop[SC.randInt(R, P.N)],
        b = st.pop[SC.randInt(R, P.N)];
      return a.f <= b.f ? a : b;
    };
    const next = [{ x: st.best.x.slice(), f: st.best.f }];
    while (next.length < P.N) {
      const a = tour(),
        b = tour();
      let c = a.x.slice();
      if (SC.rand(R) < 0.9)
        c = a.x.map((v, d) => {
          const lo = Math.min(v, b.x[d]),
            hi = Math.max(v, b.x[d]),
            I = hi - lo;
          return SC.randRange(R, lo - 0.5 * I, hi + 0.5 * I);
        });
      c = c.map((v) => (SC.rand(R) < 0.2 ? v + SC.gauss(R) * 0.08 * span : v)).map((v) => SC.clamp(v, F.lo, F.hi));
      next.push({ x: c, f: F.f(c) });
      st.evals++;
    }
    st.pop = next;
    st.gen++;
    const b = st.pop[SC.argmin(st.pop.map((q) => q.f))];
    if (b.f < st.best.f) st.best = { x: b.x.slice(), f: b.f };
    st.hist.push(st.best.f);
  }

  const defaults = { fn: 'rastrigin', N: 20, seed: 3, budget: 2000 };

  function create(params) {
    const P = Object.assign({}, defaults, params);
    const st = {
      kind: 'race',
      p: P,
      done: false,
      round: 0,
      pso: SC.engines.pso.create({ fn: P.fn, N: P.N, seed: P.seed, gran: 'iteration', maxIter: 1e6 }),
      abc: SC.engines.abc.create({ fn: P.fn, SN: Math.max(2, Math.round(P.N / 2)), limit: Math.round(P.N / 2) * 2, seed: P.seed, gran: 'cycle', maxCycles: 1e6 }),
      rga: rgaCreate(P),
      curves: { pso: [], abc: [], rga: [] },
    };
    record(st);
    st.title = 'On your marks';
    st.narr =
      `Three algorithms start on the same ${SC.FUNCS[P.fn].name} landscape with ${P.N} individuals each (ABC uses ${Math.round(P.N / 2)} food sources, so ${P.N} bees). ` +
      `They do different amounts of work per iteration, so the chart compares them <b>per function evaluation</b>, the fair currency for black-box optimisers. Budget: ${P.budget} evaluations each.`;
    st.tape = [];
    return st;
  }
  function record(st) {
    st.curves.pso.push([st.pso.evals, st.pso.gf]);
    st.curves.abc.push([st.abc.evals, st.abc.best.f]);
    st.curves.rga.push([st.rga.evals, st.rga.best.f]);
  }
  function step(st) {
    if (st.done) return;
    const B = st.p.budget;
    if (st.pso.evals < B && !st.pso.done) SC.engines.pso.step(st.pso);
    if (st.abc.evals < B && !st.abc.done) SC.engines.abc.step(st.abc);
    if (st.rga.evals < B) rgaStep(st.rga);
    st.round++;
    record(st);
    const res = [
      ['PSO', st.pso.gf, st.pso.evals],
      ['ABC', st.abc.best.f, st.abc.evals],
      ['GA', st.rga.best.f, st.rga.evals],
    ].sort((a, b) => a[1] - b[1]);
    st.title = `Round ${st.round}`;
    st.narr = `Leader: <b>${res[0][0]}</b> with f = ${n(res[0][1], 6)}. ` + res.map((r) => `${r[0]}: ${n(r[1], 5)} after ${r[2]} evals`).join(' · ');
    st.tape = res.map((r, i) => `${i + 1}. ${r[0]}  best f = ${n(r[1], 6)}  (${r[2]} evaluations)`);
    if ((st.pso.evals >= B || st.pso.done) && (st.abc.evals >= B || st.abc.done) && st.rga.evals >= B) {
      st.done = true;
      st.narr += ` <br><b>Finished.</b> Change the seed and run again: a single race proves little, which is why papers report averages over many runs.`;
    }
  }

  SC.engines.race = { defaults, create, step };
})(typeof window !== 'undefined' ? window : globalThis);
