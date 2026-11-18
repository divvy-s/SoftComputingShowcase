/* Particle Swarm Optimisation engine (synchronous gbest / ring-lbest PSO, minimisation). */
(function (root) {
  'use strict';
  const SC = root.SC;
  const { n, p, vec } = SC;

  /* Course handout "Understanding PSO Step by Step": f = x1² + x2², swarm of 5, c1 = c2 = 2, |v| ≤ 7, no inertia weight. */
  const TB = {
    x: [
      [2.7045, 4.803],
      [4.5974, 2.8793],
      [1.871, 4.0528],
      [1.64, 1.3202],
      [3.3392, 0.9963],
    ],
    v: [
      [0.4752, 0.6987],
      [0.4141, 0.402],
      [0.7797, 0.9433],
      [0.6183, 0.4749],
      [0.253, 0.9398],
    ],
    // r1, r2 for particle 1 dim 1, particle 1 dim 2, particle 2 dim 1, ... exactly as printed in the handout
    r: [0.34, 0.86, 0.47, 0.91, 0.34, 0.86, 0.12, 0.06, 0.98, 0.86, 0.69, 0.34, 0.18, 0.23, 0.61, 0.04, 0.09, 0.39, 0.65, 0.1],
  };

  const defaults = { fn: 'rastrigin', N: 12, w: 0.72, c1: 1.49, c2: 1.49, vmax: 2, topology: 'gbest', maxIter: 80, seed: 7, gran: 'particle', textbook: false };
  const textbook = { fn: 'sphere', N: 5, w: 1, c1: 2, c2: 2, vmax: 7, topology: 'gbest', maxIter: 40, seed: 1, gran: 'particle', textbook: true };

  function create(params) {
    const P = Object.assign({}, defaults, params);
    const F = SC.FUNCS[P.fn];
    const st = { kind: 'pso', p: P, rng: { s: P.seed >>> 0 }, iter: 0, cursor: 0, phase: 'move', particles: [], hist: [], evals: 0, done: false, last: null };
    if (P.textbook) {
      P.N = 5;
      st.script = { r: TB.r.slice() };
    }
    for (let i = 0; i < P.N; i++) {
      const x = P.textbook ? TB.x[i].slice() : [SC.randRange(st.rng, F.lo, F.hi), SC.randRange(st.rng, F.lo, F.hi)];
      const v = P.textbook ? TB.v[i].slice() : [SC.randRange(st.rng, -P.vmax, P.vmax), SC.randRange(st.rng, -P.vmax, P.vmax)];
      const f = F.f(x);
      st.particles.push({ x, v, f, pbest: x.slice(), pf: f, prev: null, comp: null });
    }
    st.evals = P.N;
    const fs = st.particles.map((q) => q.f);
    const g = SC.argmin(fs);
    st.gbest = st.particles[g].x.slice();
    st.gf = fs[g];
    st.gi = g;
    st.hist.push(st.gf);
    st.title = 'Initialisation';
    st.narr =
      `${P.N} particles are scattered ${P.textbook ? 'at the positions printed in the handout' : 'uniformly at random'} over [${SC.g(F.lo)}, ${SC.g(F.hi)}]², each with a random velocity. ` +
      `Every particle is evaluated once. Because nobody has moved yet, each particle's <b>pbest</b> is simply where it stands. ` +
      `The lowest value, f = ${n(st.gf)} at particle ${g + 1}, becomes <b>gbest</b>.`;
    st.tape = st.particles.map((q, i) =>
      P.fn === 'sphere'
        ? `f(x${SC.sub(i + 1)}) = ${p(q.x[0])}² + ${p(q.x[1])}² = ${n(q.f)}${i === g ? '  ← gbest' : ''}`
        : `f${vec(q.x)} = ${n(q.f)}${i === g ? '  ← gbest' : ''}`
    );
    return st;
  }

  /* best pbest in particle i's neighbourhood */
  function guide(st, i) {
    const N = st.particles.length;
    if (st.p.topology !== 'ring') return { x: st.gbest, who: st.gi, f: st.gf };
    let best = i;
    for (const j of [(i - 1 + N) % N, i, (i + 1) % N]) if (st.particles[j].pf < st.particles[best].pf) best = j;
    return { x: st.particles[best].pbest, who: best, f: st.particles[best].pf };
  }

  function moveParticle(st, i) {
    const P = st.p,
      F = SC.FUNCS[P.fn],
      q = st.particles[i];
    const g = guide(st, i);
    const det = [];
    q.prev = q.x.slice();
    q.comp = { inert: [], cog: [], soc: [] };
    const nx = [],
      nv = [];
    for (let d = 0; d < 2; d++) {
      const r1 = SC.draw(st, 'r', () => SC.rand(st.rng));
      const r2 = SC.draw(st, 'r', () => SC.rand(st.rng));
      const inert = P.w * q.v[d];
      const cog = P.c1 * r1 * (q.pbest[d] - q.x[d]);
      const soc = P.c2 * r2 * (g.x[d] - q.x[d]);
      const vRaw = inert + cog + soc;
      const vC = SC.clamp(vRaw, -P.vmax, P.vmax);
      const xRaw = q.x[d] + vC;
      const xC = SC.clamp(xRaw, F.lo, F.hi);
      det.push({ d, x0: q.x[d], v0: q.v[d], pb: q.pbest[d], gb: g.x[d], r1, r2, inert, cog, soc, vRaw, vC, xRaw, xC });
      q.comp.inert.push(inert);
      q.comp.cog.push(cog);
      q.comp.soc.push(soc);
      nx.push(xC);
      nv.push(xC !== xRaw ? 0 : vC); // hitting a wall kills that velocity component
    }
    q.x = nx;
    q.v = nv;
    st.last = { type: 'move', i, det, guide: g.who };
    const gname = P.topology === 'ring' ? `lbest (particle ${g.who + 1}'s pbest)` : 'gbest';
    const tape = [];
    for (const t of det) {
      const k = `${i + 1}${t.d + 1}`;
      tape.push(`<span class="eq">v${SC.sub(k)} = w·v + c₁r₁(pbest − x) + c₂r₂(${P.topology === 'ring' ? 'lbest' : 'gbest'} − x)</span>`);
      tape.push(
        `= ${SC.g(P.w)}×${p(t.v0)} + ${SC.g(P.c1)}×${SC.g(t.r1, 4)}×(${n(t.pb)} − ${n(t.x0)}) + ${SC.g(P.c2)}×${SC.g(t.r2, 4)}×(${n(t.gb)} − ${n(t.x0)})`
      );
      tape.push(`= <span class="c-in">${n(t.inert)}</span> + <span class="c-cog">${p(t.cog)}</span> + <span class="c-soc">${p(t.soc)}</span> = <b>${n(t.vRaw)}</b>`);
      if (t.vC !== t.vRaw) tape.push(`|v| > vmax → clamped to ${n(t.vC)}`);
      tape.push(`x${SC.sub(k)} = ${n(t.x0)} + ${p(t.vC)} = <b>${n(t.xRaw)}</b>` + (t.xC !== t.xRaw ? ` → outside bounds, pulled back to ${n(t.xC)}` : '  ✓ inside bounds'));
      tape.push('');
    }
    st.tape = tape;
    const pull = det.map((t) => Math.abs(t.cog)).reduce((a, b) => a + b) > det.map((t) => Math.abs(t.soc)).reduce((a, b) => a + b) ? 'its own memory (pbest)' : `the ${P.topology === 'ring' ? 'neighbourhood' : 'swarm'}'s best`;
    st.title = `Iteration ${st.iter + 1} · move particle ${i + 1}`;
    st.narr =
      `Particle ${i + 1} adds three pushes to get its new velocity: keep some of its old motion (<span class="c-in">inertia</span>), ` +
      `drift back toward its own best spot (<span class="c-cog">cognitive</span>), and drift toward ${gname} (<span class="c-soc">social</span>). ` +
      `The random r₁, r₂ ${st.scripted ? 'are the ones printed in the handout' : 'make each pull a little different every time'}. This time the stronger pull is toward ${pull}. ` +
      `It moves from ${vec(q.prev)} to ${vec(q.x)}.`;
  }

  function evaluate(st) {
    const P = st.p,
      F = SC.FUNCS[P.fn];
    const tape = [];
    const changes = [];
    const oldG = st.gf;
    st.particles.forEach((q, i) => {
      q.f = F.f(q.x);
      st.evals++;
      const better = q.f < q.pf;
      tape.push(`f(x${SC.sub(i + 1)}) = f${vec(q.x)} = ${n(q.f)}   vs pbest ${n(q.pf)} → ${better ? '<b class="good">new pbest</b>' : 'keep old pbest'}`);
      if (better) {
        q.pbest = q.x.slice();
        q.pf = q.f;
        changes.push(i + 1);
      }
    });
    const pfs = st.particles.map((q) => q.pf);
    const g = SC.argmin(pfs);
    let gMsg;
    if (pfs[g] < st.gf) {
      st.gf = pfs[g];
      st.gbest = st.particles[g].pbest.slice();
      st.gi = g;
      gMsg = `The best of all pbests is now particle ${g + 1} with f = ${n(st.gf)}, better than the old gbest ${n(oldG)}, so <b>gbest moves</b>.`;
      tape.push(`gbest: ${n(st.gf)} < ${n(oldG)} → gbest = x${SC.sub(g + 1)} = ${vec(st.gbest)}`);
    } else {
      gMsg = `Nobody beat the old gbest (${n(st.gf)}), so it is <b>carried forward</b> unchanged.`;
      tape.push(`gbest: no value below ${n(st.gf)} → gbest unchanged`);
    }
    st.iter++;
    st.hist.push(st.gf);
    st.cursor = 0;
    st.phase = 'move';
    st.last = { type: 'eval' };
    st.particles.forEach((q) => (q.comp = null));
    st.title = `Iteration ${st.iter} · evaluate, update pbest & gbest`;
    st.narr =
      `All particles have moved, so each one is evaluated at its new spot. ` +
      (changes.length ? `Particles ${changes.join(', ')} found a better place than ever before and update their pbest; the others keep their memory. ` : 'No particle improved on its own best this time. ') +
      gMsg;
    st.tape = tape;
    if (st.iter >= P.maxIter || st.gf - F.fmin < 1e-10) {
      st.done = true;
      st.narr += ` <br><b>Stopped</b> after ${st.iter} iterations: best f = ${n(st.gf, 6)} at ${vec(st.gbest)}.`;
    }
  }

  function step(st) {
    if (st.done) return;
    if (st.p.gran === 'iteration') {
      for (let i = 0; i < st.particles.length; i++) moveParticle(st, i);
      const moveTape = st.tape;
      evaluate(st);
      st.narr = 'Every particle updated its velocity and position using the same rule, then the swarm was re-evaluated. ' + st.narr;
      st.tape = st.tape.concat(['', `(last particle's arithmetic:)`], moveTape.slice(0, 6));
      return;
    }
    if (st.phase === 'move') {
      moveParticle(st, st.cursor);
      st.cursor++;
      if (st.cursor >= st.particles.length) st.phase = 'evaluate';
    } else evaluate(st);
  }

  SC.engines.pso = { defaults, textbook, create, step, TB };
})(typeof window !== 'undefined' ? window : globalThis);
