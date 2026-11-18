/* Binary Genetic Algorithm engine (maximisation) with live Schema Theorem tracking. */
(function (root) {
  'use strict';
  const SC = root.SC;
  const { n, g } = SC;

  const PROBLEMS = {
    x2: { name: 'Maximise f(x) = x², 0 ≤ x ≤ 31', lo: 0, hi: 31, L: 5, f: (x) => x * x, fx: 'x²', note: 'Lecture "Solved Example of GA". With 5 bits, the decoded value is x itself.' },
    sin: { name: 'Maximise f(x) = sin(x), 0 ≤ x ≤ π', lo: 0, hi: Math.PI, L: 5, f: (x) => Math.sin(x), fx: 'sin(x)', note: "Deb's hand simulation (Table 1). Optimum string 10000 → x ≈ 1.621." },
    quad: { name: 'Maximise f(x) = −x² + 2x, 0 ≤ x ≤ 2', lo: 0, hi: 2, L: 5, f: (x) => -x * x + 2 * x, fx: '−x² + 2x', note: 'Lecture exercise. Peak f = 1 at x = 1.' },
    bumpy: { name: 'Maximise f(x) = 2 + x·sin(10πx), −1 ≤ x ≤ 2', lo: -1, hi: 2, L: 16, f: (x) => 2 + x * Math.sin(10 * Math.PI * x), fx: '2 + x·sin(10πx)', note: 'Many peaks; the highest is near x ≈ 1.85. Shifted by +2 so fitness stays ≥ 0 for the roulette wheel.' },
  };

  const PRESETS = {
    deb: { pop: ['01001', '10100', '00001', '11010'], spin: [0.2, 0.5, 0.7, 0.95], site: [3, 2] },
    lecture: { pop: ['01100', '11001', '00101', '10011'], spin: [0.4, 0.15, 0.7, 0.9], site: [4, 2] },
  };

  const defaults = { problem: 'bumpy', N: 10, L: 16, pc: 0.8, pm: 0.02, sel: 'roulette', elitism: true, maxGen: 60, seed: 5, schema: '', textbook: '' };
  const textbookDeb = { problem: 'sin', N: 4, L: 5, pc: 1, pm: 0, sel: 'roulette', elitism: false, maxGen: 30, seed: 2, schema: '10***', textbook: 'deb' };
  const textbookLecture = { problem: 'x2', N: 4, L: 5, pc: 1, pm: 0, sel: 'roulette', elitism: false, maxGen: 30, seed: 2, schema: '1****', textbook: 'lecture' };

  function decode(st, bits) {
    const P = st.p,
      pr = PROBLEMS[P.problem];
    const dv = parseInt(bits, 2);
    const x = pr.lo + (dv * (pr.hi - pr.lo)) / (2 ** bits.length - 1);
    return { dv, x, f: pr.f(x) };
  }

  function evaluatePop(st) {
    st.pop.forEach((ind) => Object.assign(ind, decode(st, ind.bits)));
    st.evals += st.pop.length;
    const fs = st.pop.map((i) => i.f);
    const sum = SC.sum(fs);
    st.stats = { sum, avg: sum / fs.length, max: Math.max(...fs), bestI: SC.argmax(fs) };
    st.probs = fs.map((f) => (sum > 0 ? f / sum : 1 / fs.length));
    st.expected = st.probs.map((q) => q * fs.length);
    if (!st.bestEver || st.stats.max > st.bestEver.f) st.bestEver = Object.assign({}, st.pop[st.stats.bestI]);
    st.hist.push({ best: st.stats.max, avg: st.stats.avg });
  }

  function normSchema(H, L) {
    H = String(H || '').replace(/[^01*]/g, '');
    if (!H) H = '1' + '*'.repeat(L - 1);
    if (H.length < L) H = H + '*'.repeat(L - H.length);
    return H.slice(0, L);
  }
  const matches = (bits, H) => [...H].every((c, i) => c === '*' || c === bits[i]);

  function schemaStats(st, H) {
    H = H || st.schema;
    const L = H.length,
      P = st.p;
    const inst = st.pop.filter((i) => matches(i.bits, H));
    const m = inst.length;
    const fH = m ? SC.sum(inst.map((i) => i.f)) / m : 0;
    const fixed = [...H].map((c, i) => (c !== '*' ? i : -1)).filter((i) => i >= 0);
    const o = fixed.length;
    const delta = o ? fixed[fixed.length - 1] - fixed[0] : 0;
    const sel = st.stats.avg > 0 ? (m * fH) / st.stats.avg : 0;
    const sc = L > 1 ? 1 - (P.pc * delta) / (L - 1) : 1;
    const sm = Math.pow(1 - P.pm, o);
    return { H, m, fH, o, delta, avg: st.stats.avg, sel, sc, sm, bound: sel * sc * sm };
  }

  function setSchema(st, H) {
    st.schema = normSchema(H, st.L);
    st.schemaHist = [];
    st.schemaNow = schemaStats(st);
  }

  function create(params) {
    const P = Object.assign({}, defaults, params);
    const pr = PROBLEMS[P.problem];
    const pre = P.textbook ? PRESETS[P.textbook] : null;
    const L = pre ? pre.pop[0].length : P.L;
    const st = { kind: 'ga', p: P, L, rng: { s: P.seed >>> 0 }, gen: 0, phase: 'select', pop: [], hist: [], evals: 0, done: false, pool: null, pairs: null, children: null, last: null };
    if (pre) {
      P.N = pre.pop.length;
      st.script = { spin: pre.spin.slice(), site: pre.site.slice() };
    }
    if (P.N % 2) P.N++;
    for (let i = 0; i < P.N; i++) {
      const bits = pre ? pre.pop[i] : Array.from({ length: L }, () => (SC.rand(st.rng) < 0.5 ? '1' : '0')).join('');
      st.pop.push({ bits });
    }
    evaluatePop(st);
    setSchema(st, P.schema);
    st.title = 'Generation 0 · create & evaluate';
    st.narr =
      `${P.N} random ${L}-bit strings form the first population${pre ? ' (the strings printed in the source)' : ''}. ` +
      `Each string is <b>decoded</b> to a number, mapped into [${g(pr.lo)}, ${g(pr.hi)}], and scored with f(x) = ${pr.fx}. ` +
      `The probability column pᵢ = fᵢ / Σf is the slice of the roulette wheel each string will get. Average fitness is ${n(st.stats.avg)}.`;
    st.tape = [`<span class="eq">x = lo + DV × (hi − lo) / (2^${L} − 1)</span>`].concat(
      st.pop.map((ind, i) => `${ind.bits} → DV ${ind.dv} → x = ${n(ind.x, 3)} → f = ${n(ind.f)} → p = ${n(ind.f, 3)}/${n(st.stats.sum, 3)} = ${n(st.probs[i], 3)}, N·p = ${n(st.expected[i], 2)}`),
      [`Σf = ${n(st.stats.sum)},  f̄ = ${n(st.stats.avg)},  max = ${n(st.stats.max)}`]
    );
    return st;
  }

  function stepSelect(st) {
    const P = st.p,
      N = st.pop.length;
    const fs = st.pop.map((i) => i.f);
    let probs = st.probs.slice();
    const tape = [];
    st.prev = null;
    st.pairs = null;
    st.children = null;
    st.spins = [];
    const pick = [];
    if (P.sel === 'rank') {
      const order = fs.map((f, i) => i).sort((a, b) => fs[a] - fs[b]);
      const rank = new Array(N);
      order.forEach((i, r) => (rank[i] = r + 1));
      const tot = (N * (N + 1)) / 2;
      probs = rank.map((r) => r / tot);
      tape.push('<span class="eq">rank selection: worst gets rank 1, best rank N, pᵢ = rankᵢ / ΣN</span>');
      tape.push(probs.map((q, i) => `p${SC.sub(i + 1)}=${n(q, 3)}`).join('  '));
    }
    st.selProbs = probs;
    if (P.sel === 'tournament') {
      tape.push('<span class="eq">binary tournament: pick two strings at random, the fitter one goes to the mating pool</span>');
      for (let k = 0; k < N; k++) {
        const a = SC.draw(st, 'tour', () => SC.randInt(st.rng, N));
        const b = SC.draw(st, 'tour', () => SC.randInt(st.rng, N));
        const w = fs[a] >= fs[b] ? a : b;
        pick.push(w);
        tape.push(`#${a + 1} (${n(fs[a], 3)}) vs #${b + 1} (${n(fs[b], 3)}) → #${w + 1}`);
      }
    } else {
      const cum = [];
      probs.reduce((s, q, i) => (cum[i] = s + q), 0);
      tape.push('cumulative ranges: ' + cum.map((c, i) => `#${i + 1}: ${n(i ? cum[i - 1] : 0, 3)}–${n(c, 3)}`).join(', '));
      for (let k = 0; k < N; k++) {
        const r = SC.draw(st, 'spin', () => SC.rand(st.rng));
        const scripted = st.scripted;
        let w = cum.findIndex((c) => r < c);
        if (w < 0) w = N - 1;
        st.spins.push(r);
        pick.push(w);
        tape.push(`spin ${k + 1}: r = ${n(r, 3)}${scripted ? '*' : ''} falls in #${w + 1}'s range → copy ${st.pop[w].bits}`);
      }
      if (st.script && P.textbook) tape.push(P.textbook === 'lecture' ? '* random numbers 0.4, 0.15, 0.7, 0.9 are the ones given in the lecture' : "* spins chosen to give Deb's printed mating pool");
    }
    st.pool = pick.map((i) => ({ bits: st.pop[i].bits, from: i }));
    const counts = st.pop.map((_, i) => pick.filter((j) => j === i).length);
    st.counts = counts;
    tape.push('actual count: ' + counts.map((c, i) => `#${i + 1}=${c}`).join(', '));
    const dead = counts.map((c, i) => (c === 0 ? i + 1 : 0)).filter(Boolean);
    const many = counts.map((c, i) => (c > 1 ? i + 1 : 0)).filter(Boolean);
    st.title = `Generation ${st.gen + 1} · selection (${P.sel})`;
    st.narr =
      (P.sel === 'tournament'
        ? 'Pairs of strings fight; the fitter one wins a place in the mating pool. '
        : `The roulette wheel is spun ${N} times. Bigger slices (fitter strings) are hit more often. `) +
      (many.length ? `String${many.length > 1 ? 's' : ''} #${many.join(', #')} got <b>extra copies</b>. ` : '') +
      (dead.length ? `String${dead.length > 1 ? 's' : ''} #${dead.join(', #')} got <b>no copy</b> and ${dead.length > 1 ? 'die out' : 'dies out'}. ` : '') +
      'Selection creates no new strings. It only changes how many copies of each survive.';
    st.tape = tape;
    st.phase = 'crossover';
    st.last = { type: 'select' };
  }

  function stepCrossover(st) {
    const P = st.p,
      L = st.L;
    st.pairs = [];
    const tape = ['<span class="eq">single-point crossover: swap the tails after a random cross site</span>'];
    for (let k = 0; k + 1 < st.pool.length; k += 2) {
      const a = st.pool[k].bits,
        b = st.pool[k + 1].bits;
      const rc = SC.rand(st.rng);
      if (rc < P.pc) {
        const site = SC.draw(st, 'site', () => 1 + SC.randInt(st.rng, L - 1));
        const scripted = st.scripted;
        const c1 = a.slice(0, site) + b.slice(site),
          c2 = b.slice(0, site) + a.slice(site);
        st.pairs.push({ a, b, site, c1, c2, crossed: true });
        tape.push(`${a.slice(0, site)}|${a.slice(site)} × ${b.slice(0, site)}|${b.slice(site)}  site ${site}${scripted ? '*' : ''} → <b>${c1}</b>, <b>${c2}</b>`);
      } else {
        st.pairs.push({ a, b, site: 0, c1: a, c2: b, crossed: false });
        tape.push(`${a} × ${b}: r = ${n(rc, 3)} ≥ pc = ${g(P.pc)} → copied unchanged`);
      }
    }
    if (st.script && P.textbook) tape.push(P.textbook === 'deb' ? "* cross sites 3 and 2 as in Deb's Table 1" : '* cross sites chosen for illustration (the lecture leaves them blank)');
    st.children = [];
    st.pairs.forEach((q) => st.children.push({ bits: q.c1, flips: [] }, { bits: q.c2, flips: [] }));
    const same = st.pairs.filter((q) => q.crossed && q.a === q.b).length;
    st.title = `Generation ${st.gen + 1} · crossover (pc = ${g(P.pc)})`;
    st.narr =
      'Strings in the mating pool are paired up in order. For each pair a cross site is picked and the tails are swapped, so <b>good pieces from two parents can meet in one child</b>. ' +
      (same ? `Note: ${same} pair${same > 1 ? 's were' : ' was'} two copies of the same string, so crossover changed nothing. That is how diversity gets lost. ` : '') +
      'Short schemata (bits close together) are rarely cut by the site, so they tend to survive.';
    st.tape = tape;
    st.phase = 'mutate';
    st.last = { type: 'crossover' };
  }

  function stepMutate(st) {
    const P = st.p;
    const tape = [`<span class="eq">bit-wise mutation: every bit flips with probability pm = ${g(P.pm)}</span>`];
    let total = 0;
    st.children.forEach((c, ci) => {
      const bits = c.bits.split('');
      c.before = c.bits;
      c.flips = [];
      for (let i = 0; i < bits.length; i++) {
        if (SC.rand(st.rng) < P.pm) {
          bits[i] = bits[i] === '1' ? '0' : '1';
          c.flips.push(i);
        }
      }
      c.bits = bits.join('');
      total += c.flips.length;
      if (c.flips.length) tape.push(`child ${ci + 1}: ${c.before} → <b>${c.bits}</b> (bit ${c.flips.map((i) => i + 1).join(', ')} flipped)`);
    });
    if (!total) tape.push(`no bit flipped (${st.children.length * st.L} bits × pm ${g(P.pm)} ≈ ${n(st.children.length * st.L * P.pm, 2)} flips expected)`);
    st.title = `Generation ${st.gen + 1} · mutation (pm = ${g(P.pm)})`;
    st.narr =
      `Each bit of each child is flipped with a small probability. ${total ? `This time ${total} bit${total > 1 ? 's' : ''} flipped.` : 'This time nothing flipped.'} ` +
      'Mutation keeps diversity alive. It can bring back a bit value that selection wiped out of the whole population.';
    st.tape = tape;
    st.phase = 'evaluate';
    st.last = { type: 'mutate' };
  }

  function stepEvaluate(st) {
    const P = st.p;
    const prev = { avg: st.stats.avg, max: st.stats.max, best: Object.assign({}, st.pop[st.stats.bestI]) };
    const before = st.schemaNow;
    st.prev = { pop: st.pop.map((i) => Object.assign({}, i)), probs: st.probs.slice(), expected: st.expected.slice(), selProbs: st.selProbs.slice(), stats: Object.assign({}, st.stats) };
    st.pop = st.children.map((c) => ({ bits: c.bits }));
    let eliteMsg = '';
    if (P.elitism) {
      const fs = st.pop.map((i) => decode(st, i.bits).f);
      if (Math.max(...fs) < prev.max) {
        const w = SC.argmin(fs);
        st.pop[w] = { bits: prev.best.bits };
        eliteMsg = ` Elitism: the best child was worse than last generation's best, so the worst child was replaced by the old champion ${prev.best.bits}.`;
      }
    }
    evaluatePop(st);
    st.gen++;
    const after = schemaStats(st);
    st.schemaHist.push({ gen: st.gen - 1, m: before.m, fH: before.fH, avg: before.avg, bound: before.bound, next: after.m });
    st.schemaNow = after;
    st.title = `Generation ${st.gen} · new population evaluated`;
    const d = st.stats.avg - prev.avg;
    st.narr =
      `The children replace their parents and are decoded and scored. Average fitness went from ${n(prev.avg)} to ${n(st.stats.avg)} ` +
      `(${d >= 0 ? '<b class="good">up</b>' : '<b class="bad">down</b>'} ${n(Math.abs(d))}); the best is now ${n(st.stats.max)}.` +
      eliteMsg +
      ` Schema ${SC.esc(st.schema)} had ${before.m} instance${before.m === 1 ? '' : 's'}; the theorem promised at least ${n(before.bound, 2)} on average, and we got ${after.m}.`;
    st.tape = st.pop
      .map((ind) => `${ind.bits} → DV ${ind.dv} → x = ${n(ind.x, 3)} → f = ${n(ind.f)}`)
      .concat([`Σf = ${n(st.stats.sum)},  f̄ = ${n(st.stats.avg)}  (was ${n(prev.avg)}),  max = ${n(st.stats.max)}`]);
    st.phase = 'select';
    st.last = { type: 'evaluate' };
    if (st.gen >= P.maxGen) {
      st.done = true;
      st.narr += ` <br><b>Stopped</b> after ${st.gen} generations. Best ever: ${st.bestEver.bits} (x = ${n(st.bestEver.x)}, f = ${n(st.bestEver.f)}).`;
    }
  }

  function step(st) {
    if (st.done) return;
    if (st.p.gran === 'generation') {
      stepSelect(st);
      stepCrossover(st);
      stepMutate(st);
      stepEvaluate(st);
      return;
    }
    ({ select: stepSelect, crossover: stepCrossover, mutate: stepMutate, evaluate: stepEvaluate })[st.phase](st);
  }

  SC.engines.ga = { PROBLEMS, PRESETS, defaults, textbookDeb, textbookLecture, create, step, schemaStats, setSchema, normSchema, matches, decode };
})(typeof window !== 'undefined' ? window : globalThis);
