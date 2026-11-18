/* SoftLab core: seeded RNG, scripted draws, number formatting, benchmark functions.
 * Pure JS (no DOM) so the same engines run in the browser and in Node tests. */
(function (root) {
  'use strict';
  const SC = (root.SC = root.SC || {});
  SC.engines = SC.engines || {};
  SC.verifiers = SC.verifiers || [];

  /* ---------- seeded RNG (mulberry32). State is a plain object {s} so it survives JSON snapshots ---------- */
  SC.rand = function (r) {
    let t = (r.s = (r.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  SC.randRange = (r, a, b) => a + (b - a) * SC.rand(r);
  SC.randInt = (r, n) => Math.floor(SC.rand(r) * n);
  SC.gauss = function (r) {
    let u = 0;
    while (u === 0) u = SC.rand(r);
    const v = SC.rand(r);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  /* A "scripted" draw: textbook presets put the exact random numbers used in the
   * worked example into st.script[kind]; once a queue runs dry we fall back to the RNG. */
  SC.draw = function (st, kind, fallback) {
    const q = st.script && st.script[kind];
    if (q && q.length) {
      st.scripted = true;
      return q.shift();
    }
    st.scripted = false;
    return fallback();
  };

  /* ---------- small helpers ---------- */
  SC.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  SC.clone = (o) => JSON.parse(JSON.stringify(o));
  SC.esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  SC.argmin = (a) => a.reduce((b, v, i) => (v < a[b] ? i : b), 0);
  SC.argmax = (a) => a.reduce((b, v, i) => (v > a[b] ? i : b), 0);
  SC.sum = (a) => a.reduce((s, v) => s + v, 0);

  /* fixed decimals, real minus sign, no "-0" */
  SC.n = function (x, d = 4) {
    if (!Number.isFinite(x)) return String(x);
    let s = x.toFixed(d);
    if (/^-0\.?0*$/.test(s)) s = s.slice(1);
    return s.replace('-', '−');
  };
  /* trimmed (no trailing zeros) */
  SC.g = function (x, d = 4) {
    if (!Number.isFinite(x)) return String(x);
    let v = +x.toFixed(d);
    if (Object.is(v, -0)) v = 0;
    return String(v).replace('-', '−');
  };
  /* wrap negatives in parentheses for substituted formulas: 2 × (−1.3) */
  SC.p = (x, d = 4) => (x < 0 ? '(' + SC.n(x, d) + ')' : SC.n(x, d));
  SC.pg = (x, d = 4) => (x < 0 ? '(' + SC.g(x, d) + ')' : SC.g(x, d));
  SC.vec = (v, d = 4) => '(' + v.map((x) => SC.n(x, d)).join(', ') + ')';
  SC.vecg = (v, d = 4) => '(' + v.map((x) => SC.g(x, d)).join(', ') + ')';
  SC.sub = (i) => String(i).replace(/\d/g, (c) => '₀₁₂₃₄₅₆₇₈₉'[c]);

  /* ---------- 2-D benchmark functions (all minimisation) ---------- */
  const TAU = 2 * Math.PI;
  SC.FUNCS = {
    sphere: {
      name: 'Sphere',
      formula: 'f(x) = x₁² + x₂²',
      f: (x) => x[0] * x[0] + x[1] * x[1],
      lo: -5,
      hi: 5,
      fmin: 0,
      minima: [[0, 0]],
      note: 'One smooth bowl. This is the function used in the course PSO and ABC worked examples.',
    },
    rastrigin: {
      name: 'Rastrigin',
      formula: 'f(x) = 20 + Σ (xᵢ² − 10 cos 2πxᵢ)',
      f: (x) => 20 + x[0] * x[0] - 10 * Math.cos(TAU * x[0]) + x[1] * x[1] - 10 * Math.cos(TAU * x[1]),
      lo: -5.12,
      hi: 5.12,
      fmin: 0,
      minima: [[0, 0]],
      note: 'An egg-crate of about 100 local minima. Good for seeing premature convergence.',
    },
    ackley: {
      name: 'Ackley',
      formula: 'f(x) = −20e^(−0.2√(½Σxᵢ²)) − e^(½Σcos 2πxᵢ) + e + 20',
      f: (x) =>
        -20 * Math.exp(-0.2 * Math.sqrt(0.5 * (x[0] * x[0] + x[1] * x[1]))) -
        Math.exp(0.5 * (Math.cos(TAU * x[0]) + Math.cos(TAU * x[1]))) +
        Math.E +
        20,
      lo: -5,
      hi: 5,
      fmin: 0,
      minima: [[0, 0]],
      note: 'A nearly flat, bumpy plain with one deep hole in the middle.',
    },
    himmelblau: {
      name: 'Himmelblau',
      formula: 'f(x) = (x₁² + x₂ − 11)² + (x₁ + x₂² − 7)²',
      f: (x) => (x[0] * x[0] + x[1] - 11) ** 2 + (x[0] + x[1] * x[1] - 7) ** 2,
      lo: -5,
      hi: 5,
      fmin: 0,
      minima: [
        [3, 2],
        [-2.805118, 3.131312],
        [-3.77931, -3.283186],
        [3.584428, -1.848126],
      ],
      note: 'Four equally good minima. Which one does the swarm pick?',
    },
    rosenbrock: {
      name: 'Rosenbrock',
      formula: 'f(x) = (1 − x₁)² + 100(x₂ − x₁²)²',
      f: (x) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] * x[0]) ** 2,
      lo: -2,
      hi: 2,
      fmin: 0,
      minima: [[1, 1]],
      note: 'A long curved banana valley. Easy to find, slow to follow.',
    },
  };
  SC.FUNC_OPTIONS = Object.keys(SC.FUNCS).map((k) => [k, SC.FUNCS[k].name + ' — ' + SC.FUNCS[k].formula]);
})(typeof window !== 'undefined' ? window : globalThis);
