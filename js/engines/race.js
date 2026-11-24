/* Swarm race: PSO vs ABC on the same 2-D landscape, compared per function evaluation. */
(function (root) {
  'use strict';
  const SC = root.SC;
  const { n } = SC;

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
      curves: { pso: [], abc: [] },
    };
    record(st);
    st.title = 'On your marks';
    st.narr =
      `Two swarms start on the same ${SC.FUNCS[P.fn].name} landscape with ${P.N} individuals each (ABC uses ${Math.round(P.N / 2)} food sources, so ${P.N} bees). ` +
      `They do different amounts of work per iteration, so the chart compares them <b>per function evaluation</b>, the fair currency for black-box optimisers. Budget: ${P.budget} evaluations each.`;
    st.tape = [];
    return st;
  }
  function record(st) {
    st.curves.pso.push([st.pso.evals, st.pso.gf]);
    st.curves.abc.push([st.abc.evals, st.abc.best.f]);
  }
  function step(st) {
    if (st.done) return;
    const B = st.p.budget;
    if (st.pso.evals < B && !st.pso.done) SC.engines.pso.step(st.pso);
    if (st.abc.evals < B && !st.abc.done) SC.engines.abc.step(st.abc);
    st.round++;
    record(st);
    const res = [
      ['PSO', st.pso.gf, st.pso.evals],
      ['ABC', st.abc.best.f, st.abc.evals],
    ].sort((a, b) => a[1] - b[1]);
    st.title = `Round ${st.round}`;
    st.narr = `Leader: <b>${res[0][0]}</b> with f = ${n(res[0][1], 6)}. ` + res.map((r) => `${r[0]}: ${n(r[1], 5)} after ${r[2]} evals`).join(' · ');
    st.tape = res.map((r, i) => `${i + 1}. ${r[0]}  best f = ${n(r[1], 6)}  (${r[2]} evaluations)`);
    if ((st.pso.evals >= B || st.pso.done) && (st.abc.evals >= B || st.abc.done)) {
      st.done = true;
      st.narr += ` <br><b>Finished.</b> Change the seed and run again: a single race proves little, which is why papers report averages over many runs.`;
    }
  }

  SC.engines.race = { defaults, create, step };
})(typeof window !== 'undefined' ? window : globalThis);
