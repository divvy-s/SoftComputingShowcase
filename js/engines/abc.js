/* Artificial Bee Colony engine (Karaboga 2005, minimisation). */
(function (root) {
  'use strict';
  const SC = root.SC;
  const { n, p, vec } = SC;

  /* Course slides "ABC Algo", Solved Example: f = x1² + x2², SN = 5, limit = 1.
   * The slides print the random choices only for bee 1 (employed + onlooker) and for the scout.
   * The other choices below are the values that reproduce the slides' printed tables exactly
   * (worked backwards by hand: e.g. bee 2 −3 + φ(−3 − 2) = 0 ⇒ φ = −0.6). */
  const TB = {
    X: [
      [2, -1],
      [-3, 2],
      [1, -4],
      [-5, 3],
      [3, 0],
    ],
    dim: [0, 0, 1, 1, 0, 0, 1, 0, 0, 0],
    partner: [3, 0, 3, 0, 0, 4, 2, 4, 1, 0],
    phi: [0.81, -0.6, -0.36, -0.07, 0.5, 0.68, 0.3, 0.06, -0.176, 0.5],
    onR: [0.39, 0.5, 0.2, 0.1, 0.3],
    scout: [0.43, 0.58],
  };

  const defaults = { fn: 'himmelblau', SN: 10, limit: 6, maxCycles: 60, seed: 11, gran: 'bee', textbook: false };
  const textbook = { fn: 'sphere', SN: 5, limit: 1, maxCycles: 10, seed: 3, gran: 'bee', textbook: true };

  const fitness = (f) => (f >= 0 ? 1 / (1 + f) : 1 + Math.abs(f));
  const fitText = (f, fit) => (f >= 0 ? `fit = 1/(1 + ${n(f)}) = ${n(fit)}` : `fit = 1 + |${n(f)}| = ${n(fit)}`);

  function create(params) {
    const P = Object.assign({}, defaults, params);
    const F = SC.FUNCS[P.fn];
    if (P.textbook) P.SN = 5;
    const st = { kind: 'abc', p: P, rng: { s: P.seed >>> 0 }, cycle: 0, phase: 'employed', cursor: 0, foods: [], hist: [], evals: 0, done: false, last: null, probs: null };
    if (P.textbook) st.script = { dim: TB.dim.slice(), partner: TB.partner.slice(), phi: TB.phi.slice(), onR: TB.onR.slice(), scout: TB.scout.slice() };
    for (let m = 0; m < P.SN; m++) {
      const x = P.textbook ? TB.X[m].slice() : [SC.randRange(st.rng, F.lo, F.hi), SC.randRange(st.rng, F.lo, F.hi)];
      const f = F.f(x);
      st.foods.push({ x, f, fit: fitness(f), trial: 0 });
    }
    st.evals = P.SN;
    const b = SC.argmin(st.foods.map((s) => s.f));
    st.best = { x: st.foods[b].x.slice(), f: st.foods[b].f };
    st.hist.push(st.best.f);
    st.title = 'Initialisation';
    st.narr =
      `Scouts find ${P.SN} food sources ${P.textbook ? '(the five rows printed in the slides)' : 'at random'} using x = l + rand·(u − l). ` +
      `Each source is a candidate solution; its "nectar" is the fitness fit = 1/(1 + f), so <b>smaller f means more nectar</b>. ` +
      `One employed bee is assigned to each source, and every source starts with trial counter 0.`;
    st.tape = st.foods.map((s, m) => `X${SC.sub(m + 1)} = ${vec(s.x, 2)}  f = ${n(s.f)}  ${fitText(s.f, s.fit)}  t = 0`);
    return st;
  }

  /* neighbour search used by employed and onlooker bees */
  function neighbour(st, m, who) {
    const P = st.p,
      F = SC.FUNCS[P.fn],
      S = st.foods;
    const src = S[m];
    const j = SC.draw(st, 'dim', () => SC.randInt(st.rng, 2));
    const k = SC.draw(st, 'partner', () => {
      let k;
      do k = SC.randInt(st.rng, S.length);
      while (k === m);
      return k;
    });
    const phi = SC.draw(st, 'phi', () => SC.randRange(st.rng, -1, 1));
    const scripted = st.scripted;
    const raw = src.x[j] + phi * (src.x[j] - S[k].x[j]);
    const cl = SC.clamp(raw, F.lo, F.hi);
    const v = src.x.slice();
    v[j] = cl;
    const fv = F.f(v);
    st.evals++;
    const fitv = fitness(fv);
    const accepted = fitv > src.fit;
    const old = { x: src.x.slice(), f: src.f, fit: src.fit, trial: src.trial };
    if (accepted) {
      src.x = v;
      src.f = fv;
      src.fit = fitv;
      src.trial = 0;
      if (fv < st.best.f) st.best = { x: v.slice(), f: fv };
    } else src.trial++;
    st.last = { type: who, m, j, k, phi, raw, cl, cand: v, fv, fitv, accepted, old, partnerX: S[k].x.slice() };
    const tape = [
      `Bee at X${SC.sub(m + 1)} = ${vec(old.x, 2)} changes variable x${SC.sub(j + 1)}, partner X${SC.sub(k + 1)} = ${vec(S[k].x, 2)}, φ = ${SC.g(phi)}${scripted ? ' (from slides)' : ''}`,
      `<span class="eq">v${SC.sub(j + 1)} = x${SC.sub(j + 1)} + φ(x${SC.sub(j + 1)} − x_k${SC.sub(j + 1)})</span> = ${SC.g(old.x[j])} + ${SC.pg(phi)}×(${SC.g(old.x[j])} − ${SC.pg(S[k].x[j])}) = <b>${SC.g(raw)}</b>`,
    ];
    if (cl !== raw) tape.push(`outside [${SC.g(F.lo)}, ${SC.g(F.hi)}] → clamped to ${SC.g(cl)}`);
    tape.push(`candidate ${vec(v, 3)}: f = ${n(fv)}, ${fitText(fv, fitv)}`);
    tape.push(
      accepted
        ? `greedy: ${n(fitv)} > ${n(old.fit)} → <b class="good">replace</b> X${SC.sub(m + 1)}, trial ← 0`
        : `greedy: ${n(fitv)} ≤ ${n(old.fit)} → <b class="bad">keep old</b>, trial ← ${src.trial}`
    );
    return tape;
  }

  function computeProbs(st) {
    const maxFit = Math.max(...st.foods.map((s) => s.fit));
    st.probs = st.foods.map((s) => (0.9 * s.fit) / maxFit + 0.1);
    st.maxFit = maxFit;
  }

  function stepEmployed(st) {
    const m = st.cursor;
    const tape = neighbour(st, m, 'employed');
    const L = st.last;
    st.title = `Cycle ${st.cycle + 1} · employed bee ${m + 1}`;
    st.narr =
      `Employed bee ${m + 1} flies to a spot near its own source by nudging one coordinate toward or away from a random partner source. ` +
      (L.cl !== L.raw ? 'The jump overshot the search box, so it was pulled back to the boundary. ' : '') +
      (L.accepted
        ? `The new spot has more nectar, so the bee <b>remembers the new spot</b> and forgets the old one (greedy selection).`
        : `The new spot is worse, so the bee <b>stays loyal to its old source</b> and the source's trial counter goes up to ${st.foods[m].trial}.`);
    st.tape = tape;
    st.cursor++;
    if (st.cursor >= st.foods.length) {
      st.phase = 'onlooker';
      computeProbs(st);
      st.onT = 0;
      st.onI = 0;
      st.tape = tape.concat([
        '',
        'All employed bees are back. Waggle-dance probabilities:',
        `<span class="eq">pₘ = 0.9 · fitₘ / max(fit) + 0.1</span>, max(fit) = ${n(st.maxFit)}`,
        ...st.probs.map((q, i) => `p${SC.sub(i + 1)} = 0.9×${n(st.foods[i].fit)}/${n(st.maxFit)} + 0.1 = ${n(q, 3)}`),
      ]);
    }
  }

  function stepOnlooker(st) {
    const skipped = [];
    let tape;
    for (let guard = 0; guard < 1000; guard++) {
      const i = st.onI;
      const r = SC.draw(st, 'onR', () => SC.rand(st.rng));
      const scripted = st.scripted;
      st.onI = (st.onI + 1) % st.foods.length;
      if (r < st.probs[i]) {
        tape = [`Onlooker looks at source ${i + 1}: r = ${SC.g(r, 3)}${scripted ? ' (from slides)' : ''} < p${SC.sub(i + 1)} = ${n(st.probs[i], 3)} → <b>recruited</b>`];
        tape = tape.concat(neighbour(st, i, 'onlooker'));
        st.last.skipped = skipped;
        st.last.r = r;
        break;
      }
      skipped.push({ i, r });
    }
    if (skipped.length)
      tape = skipped.map((s) => `Onlooker looks at source ${s.i + 1}: r = ${SC.g(s.r, 3)} ≥ p${SC.sub(s.i + 1)} = ${n(st.probs[s.i], 3)} → not convinced, next source`).concat(tape);
    const L = st.last;
    st.onT++;
    st.title = `Cycle ${st.cycle + 1} · onlooker bee ${st.onT} of ${st.foods.length}`;
    st.narr =
      `Onlooker bees wait in the hive and watch the dances. They walk past the sources in turn and get recruited with probability pₘ, so <b>rich sources attract more onlookers</b> (positive feedback). ` +
      `This onlooker was recruited to source ${L.m + 1}${skipped.length ? ` after passing on ${skipped.length} source${skipped.length > 1 ? 's' : ''}` : ''} and searched next to it: ` +
      (L.accepted ? 'it found more nectar, so the source moves there.' : `nothing better, so source ${L.m + 1}'s trial counter rises to ${st.foods[L.m].trial}.`);
    st.tape = tape;
    if (st.onT >= st.foods.length) st.phase = 'scout';
  }

  function stepScout(st) {
    const P = st.p,
      F = SC.FUNCS[P.fn];
    const trials = st.foods.map((s) => s.trial);
    const m = SC.argmax(trials);
    st.title = `Cycle ${st.cycle + 1} · scout bee phase`;
    if (trials[m] > P.limit) {
      const s = st.foods[m];
      const old = { x: s.x.slice(), f: s.f, fit: s.fit, trial: s.trial };
      const rs = [0, 1].map(() => SC.draw(st, 'scout', () => SC.rand(st.rng)));
      const scripted = st.scripted;
      s.x = rs.map((r) => F.lo + r * (F.hi - F.lo));
      s.f = F.f(s.x);
      st.evals++;
      s.fit = fitness(s.f);
      s.trial = 0;
      if (s.f < st.best.f) st.best = { x: s.x.slice(), f: s.f };
      st.last = { type: 'scout', m, old, rs };
      st.narr =
        `Source ${m + 1} failed to improve ${old.trial} times, more than the limit of ${P.limit}. Its bee <b>abandons it</b> and turns into a scout, ` +
        `flying to a completely random spot. This negative feedback stops the colony from wasting effort on exhausted sources.`;
      st.tape = [
        `trial${SC.sub(m + 1)} = ${old.trial} > limit = ${P.limit} → abandon X${SC.sub(m + 1)} = ${vec(old.x, 2)} (f = ${n(old.f)})`,
        ...rs.map((r, d) => `x${SC.sub(d + 1)} = l + rand·(u − l) = ${SC.g(F.lo)} + ${SC.g(r, 3)}×(${SC.g(F.hi)} − ${SC.pg(F.lo)}) = <b>${SC.g(s.x[d])}</b>${scripted ? ' (rand from slides)' : ''}`),
        `new X${SC.sub(m + 1)} = ${vec(s.x, 3)}: f = ${n(s.f)}, ${fitText(s.f, s.fit)}, trial ← 0`,
      ];
    } else {
      st.last = { type: 'scout', m: -1 };
      st.narr = `The largest trial counter is ${trials[m]} (source ${m + 1}), which does not exceed the limit of ${P.limit}. <b>No source is abandoned</b> this cycle, so no scout flies out.`;
      st.tape = [`max trial = ${trials[m]} ≤ limit = ${P.limit} → no scout this cycle`];
    }
    st.phase = 'memorize';
  }

  function stepMemorize(st) {
    const P = st.p,
      F = SC.FUNCS[P.fn];
    const b = SC.argmin(st.foods.map((s) => s.f));
    if (st.foods[b].f < st.best.f) st.best = { x: st.foods[b].x.slice(), f: st.foods[b].f };
    st.cycle++;
    st.hist.push(st.best.f);
    st.last = { type: 'memorize' };
    st.title = `Cycle ${st.cycle} · memorise best`;
    st.narr = `End of cycle ${st.cycle}. The colony writes down the best source ever found: f = ${n(st.best.f, 6)} at ${vec(st.best.x)}. Then a new cycle starts with the employed bees.`;
    st.tape = [`best so far = ${vec(st.best.x)}, f = ${n(st.best.f, 6)}`, `evaluations used so far: ${st.evals}`];
    st.phase = 'employed';
    st.cursor = 0;
    if (st.cycle >= P.maxCycles || st.best.f - F.fmin < 1e-10) {
      st.done = true;
      st.narr += ` <br><b>Stopped</b> after ${st.cycle} cycles.`;
    }
  }

  function stepOnce(st) {
    if (st.phase === 'employed') stepEmployed(st);
    else if (st.phase === 'onlooker') stepOnlooker(st);
    else if (st.phase === 'scout') stepScout(st);
    else stepMemorize(st);
  }

  function step(st) {
    if (st.done) return;
    if (st.p.gran === 'bee') return stepOnce(st);
    // 'phase' granularity: run until the phase changes; 'cycle': run a full cycle
    const start = st.phase;
    const tape = [];
    do {
      const ph = st.phase;
      stepOnce(st);
      tape.push(...st.tape, '');
      if (st.p.gran === 'phase' && st.phase !== start) break;
      if (st.p.gran === 'cycle' && ph === 'memorize') break;
    } while (!st.done);
    st.tape = tape;
    if (st.p.gran === 'cycle') st.narr = `A full cycle ran: every employed bee searched, ${st.foods.length} onlookers were recruited by the dance, and exhausted sources were scouted. ` + st.narr;
    else if (start === 'employed') st.narr = 'All employed bees searched next to their own sources (greedy selection each time), then the waggle-dance probabilities were computed.';
    else if (start === 'onlooker') st.narr = 'All onlookers were recruited by the dance probabilities and searched next to the sources they chose.';
  }

  SC.engines.abc = { defaults, textbook, create, step, fitness, TB };
})(typeof window !== 'undefined' ? window : globalThis);
