/* Perceptron learning algorithm (Rosenblatt), as in the course "MP Neuron, Perceptron and Sigmoid" lecture:
 * y = 1 if w·x ≥ 0 else 0 (x₀ = 1 carries the bias). Error-driven update w ← w + η (t − y) x. */
(function (root) {
  'use strict';
  const SC = root.SC;
  const { n, g } = SC;

  const DATASETS = {
    and: { name: 'AND gate', pts: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]] },
    or: { name: 'OR gate', pts: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]] },
    nand: { name: 'NAND gate', pts: [[0, 0, 1], [0, 1, 1], [1, 0, 1], [1, 1, 0]] },
    xor: { name: 'XOR gate (not linearly separable)', pts: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]] },
    blobs: { name: 'Random separable points', pts: null },
    custom: { name: 'Your own points (click the plane)', pts: null },
  };

  const defaults = { data: 'and', eta: 1, w0: 0, w1: 0, w2: 0, maxEpochs: 30, gran: 'sample', seed: 4, custom: null };

  function makeBlobs(seed) {
    const r = { s: seed >>> 0 };
    const a = SC.randRange(r, 0, Math.PI);
    const nx = Math.cos(a),
      ny = Math.sin(a),
      c = SC.randRange(r, -0.3, 0.3);
    const pts = [];
    while (pts.length < 24) {
      const x = SC.randRange(r, -2, 2),
        y = SC.randRange(r, -2, 2);
      const s = nx * x + ny * y - c;
      if (Math.abs(s) < 0.35) continue;
      pts.push([+x.toFixed(2), +y.toFixed(2), s > 0 ? 1 : 0]);
    }
    return pts;
  }

  function create(params) {
    const P = Object.assign({}, defaults, params);
    let pts = DATASETS[P.data].pts;
    if (P.data === 'blobs') pts = makeBlobs(P.seed);
    if (P.data === 'custom') pts = P.custom && P.custom.length ? P.custom : [[-1, -1, 0], [1, 1, 1]];
    const st = { kind: 'perceptron', p: P, data: pts.map((q) => q.slice()), w: [P.w0, P.w1, P.w2], epoch: 1, idx: 0, errs: 0, hist: [], trace: [], done: false, converged: false, last: null, updates: 0 };
    st.title = 'Start';
    st.narr =
      `A perceptron draws one straight line w₀ + w₁x₁ + w₂x₂ = 0 and says "1" on one side, "0" on the other. ` +
      `It starts with weights (w₀, w₁, w₂) = (${g(P.w0)}, ${g(P.w1)}, ${g(P.w2)}) and visits the ${pts.length} training points one by one. ` +
      `Whenever it gets a point wrong it <b>nudges the line toward fixing that point</b>; when it is right it does nothing.`;
    st.tape = ['<span class="eq">z = w₀·1 + w₁x₁ + w₂x₂,   y = 1 if z ≥ 0 else 0</span>', '<span class="eq">w ← w + η (t − y) · (1, x₁, x₂)</span>', `η = ${g(P.eta)}`];
    return st;
  }

  function stepSample(st) {
    const P = st.p;
    const [x1, x2, t] = st.data[st.idx];
    const w = st.w.slice();
    const z = w[0] + w[1] * x1 + w[2] * x2;
    const y = z >= 0 ? 1 : 0;
    const e = t - y;
    const dw = [P.eta * e, P.eta * e * x1, P.eta * e * x2];
    const nw = w.map((v, k) => +(v + dw[k]).toFixed(10));
    st.w = nw;
    if (e) {
      st.errs++;
      st.updates++;
    }
    const row = { epoch: st.epoch, k: st.idx, x1, x2, t, z, y, e, w, nw };
    st.trace.push(row);
    st.last = row;
    st.title = `Epoch ${st.epoch} · point ${st.idx + 1} of ${st.data.length}`;
    st.narr =
      `Point (${g(x1)}, ${g(x2)}) should be <b>${t}</b>. The weighted sum is z = ${n(z, 3)}, so the perceptron says ${y}. ` +
      (e === 0
        ? 'Correct, so <b>no change</b>.'
        : e > 0
          ? 'It said 0 but should say 1, so the input is <b>added</b> to the weights. This tilts the line so the point moves onto the "1" side.'
          : 'It said 1 but should say 0, so the input is <b>subtracted</b> from the weights. The line moves away so the point lands on the "0" side.');
    st.tape = [
      `z = ${g(w[0])} + ${SC.pg(w[1])}×${SC.pg(x1)} + ${SC.pg(w[2])}×${SC.pg(x2)} = <b>${n(z, 3)}</b> → y = ${y},  t = ${t},  t − y = ${e}`,
      e ? `w = (${w.map((v) => g(v)).join(', ')}) + ${g(P.eta)}×${SC.pg(e)}×(1, ${g(x1)}, ${g(x2)}) = <b>(${nw.map((v) => g(v)).join(', ')})</b>` : `w stays (${w.map((v) => g(v)).join(', ')})`,
    ];
    st.idx++;
    if (st.idx >= st.data.length) {
      st.hist.push(st.errs);
      const errs = st.errs;
      st.tape.push(`end of epoch ${st.epoch}: ${errs} mistake${errs === 1 ? '' : 's'}`);
      if (errs === 0) {
        st.done = st.converged = true;
        st.narr += ` <br><b>Converged:</b> a whole epoch with zero mistakes. Final line: ${g(nw[0])} + ${g(nw[1])}x₁ + ${g(nw[2])}x₂ = 0.`;
      } else if (st.epoch >= P.maxEpochs) {
        st.done = true;
        st.narr += ` <br><b>Gave up</b> after ${st.epoch} epochs. ${P.data === 'xor' ? 'XOR cannot be split by one straight line, so the perceptron cycles forever. This is the limitation that motivates multi-layer networks.' : 'Try more epochs or a different learning rate.'}`;
      } else {
        st.epoch++;
        st.idx = 0;
        st.errs = 0;
      }
    }
  }

  function step(st) {
    if (st.done) return;
    if (st.p.gran === 'epoch') {
      const e0 = st.epoch;
      const tape = [];
      while (!st.done && st.epoch === e0) {
        stepSample(st);
        tape.push(...st.tape);
      }
      st.tape = tape;
      st.title = `Epoch ${e0} complete`;
      return;
    }
    stepSample(st);
  }

  /* lecture example neuron: x = [0, 0.19, 0.64, 1, 1], w = [0.3, 0.4, −0.3, 0.1, 0.5] */
  function neuron(xs, ws, theta = 0) {
    const s = SC.sum(xs.map((x, i) => x * (ws[i] || 0)));
    return { sum: s, step: s >= theta ? 1 : 0, sigmoid: 1 / (1 + Math.exp(-s)) };
  }

  SC.engines.perceptron = { DATASETS, defaults, create, step, neuron, makeBlobs };
})(typeof window !== 'undefined' ? window : globalThis);
