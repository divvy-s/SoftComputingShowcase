/* Mamdani fuzzy inference: washing-machine wash-time controller (dirt, grease → wash time).
 * Same system as the course MATLAB .fis exercise and Sivanandam & Deepa's textbook example. */
(function (root) {
  'use strict';
  const SC = root.SC;
  const { n, g } = SC;

  function trimf(x, a, b, c) {
    if (x < a || x > c) return 0;
    if (x === b) return 1;
    if (x < b) return (x - a) / (b - a);
    return (c - x) / (c - b);
  }
  /* the substituted hand-calculation for one triangle */
  function trimfText(x, name, a, b, c) {
    const mu = trimf(x, a, b, c);
    if (x < a || x > c) return `μ_${name}(${g(x)}) = 0   (outside ${g(a)}…${g(c)})`;
    if (x === b) return `μ_${name}(${g(x)}) = 1   (at the peak)`;
    if (x < b) return `μ_${name}(${g(x)}) = (x − a)/(b − a) = (${g(x)} − ${g(a)})/(${g(b)} − ${g(a)}) = <b>${n(mu, 3)}</b>`;
    return `μ_${name}(${g(x)}) = (c − x)/(c − b) = (${g(c)} − ${g(x)})/(${g(c)} − ${g(b)}) = <b>${n(mu, 3)}</b>`;
  }

  const SYS = {
    inputs: [
      { key: 'dirt', label: 'Dirt', unit: '%', lo: 0, hi: 100, sets: [{ id: 'SD', label: 'Small', abc: [0, 0, 50] }, { id: 'MD', label: 'Medium', abc: [0, 50, 100] }, { id: 'LD', label: 'Large', abc: [50, 100, 100] }] },
      { key: 'grease', label: 'Grease', unit: '%', lo: 0, hi: 100, sets: [{ id: 'NG', label: 'None', abc: [0, 0, 50] }, { id: 'MG', label: 'Medium', abc: [0, 50, 100] }, { id: 'LG', label: 'Large', abc: [50, 100, 100] }] },
    ],
    output: {
      key: 'time',
      label: 'Wash time',
      unit: 'min',
      lo: 0,
      hi: 60,
      sets: [
        { id: 'VS', label: 'Very short', abc: [0, 0, 10] },
        { id: 'S', label: 'Short', abc: [0, 10, 25] },
        { id: 'M', label: 'Medium', abc: [10, 25, 40] },
        { id: 'L', label: 'Long', abc: [25, 40, 60] },
        { id: 'VL', label: 'Very long', abc: [40, 60, 60] },
      ],
    },
    // rules[dirtIdx][greaseIdx] = output set id
    rules: [
      ['VS', 'M', 'L'],
      ['S', 'M', 'L'],
      ['M', 'L', 'VL'],
    ],
  };

  const defaults = { dirt: 60, grease: 70, defuzz: 'centroid', gran: 'rule', samples: 1201 };

  function outSet(id) {
    return SYS.output.sets.find((s) => s.id === id);
  }

  /* full inference in one call (used by the control surface and the tests) */
  function infer(dirt, grease, defuzz = 'centroid', samples = 1201) {
    const md = SYS.inputs[0].sets.map((s) => trimf(dirt, ...s.abc));
    const mg = SYS.inputs[1].sets.map((s) => trimf(grease, ...s.abc));
    const strength = {};
    SYS.output.sets.forEach((s) => (strength[s.id] = 0));
    const fired = [];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        const w = Math.min(md[i], mg[j]);
        const o = SYS.rules[i][j];
        fired.push({ i, j, w, o });
        strength[o] = Math.max(strength[o], w);
      }
    const agg = aggregate(strength, samples);
    return { md, mg, fired, strength, agg, out: defuzzify(agg, defuzz) };
  }

  function aggregate(strength, samples) {
    const { lo, hi, sets } = SYS.output;
    const xs = [],
      mus = [];
    for (let k = 0; k < samples; k++) {
      const x = lo + ((hi - lo) * k) / (samples - 1);
      let mu = 0;
      for (const s of sets) mu = Math.max(mu, Math.min(strength[s.id], trimf(x, ...s.abc)));
      xs.push(x);
      mus.push(mu);
    }
    return { xs, mus };
  }

  function defuzzify(agg, method) {
    const { xs, mus } = agg;
    const area = SC.sum(mus);
    if (area === 0) return { value: NaN, area: 0, moment: 0 };
    if (method === 'bisector') {
      let acc = 0,
        k = 0;
      while (k < mus.length && acc + mus[k] < area / 2) acc += mus[k++];
      return { value: xs[Math.min(k, xs.length - 1)], area, moment: 0 };
    }
    if (method === 'mom') {
      const mx = Math.max(...mus);
      const at = xs.filter((_, k) => Math.abs(mus[k] - mx) < 1e-12);
      return { value: SC.sum(at) / at.length, area, moment: 0, peak: mx, span: [at[0], at[at.length - 1]] };
    }
    const moment = SC.sum(mus.map((m, k) => m * xs[k]));
    return { value: moment / area, area, moment };
  }

  /* step-by-step engine. stage: 0 start, 1 fuzzify dirt, 2 fuzzify grease, 3..11 rules, 12 aggregate, 13 defuzzify */
  function create(params) {
    const P = Object.assign({}, defaults, params);
    const st = { kind: 'fuzzy', p: P, stage: 0, done: false, md: null, mg: null, fired: [], strength: null, agg: null, out: null };
    st.title = 'The fuzzy controller';
    st.narr =
      `A washing machine has to pick a wash time from two sensor readings: dirt = ${g(P.dirt)}% and grease = ${g(P.grease)}%. ` +
      `Instead of hard thresholds ("dirt > 50 means dirty") it uses <b>fuzzy sets</b> such as "Medium dirt" that a reading can belong to <i>partly</i>, ` +
      `plus nine IF–THEN rules written by an expert. Step through the five Mamdani stages: fuzzify → apply rules → aggregate → defuzzify.`;
    st.tape = ['Rule base (rows = dirt, columns = grease):', ...SYS.rules.map((r, i) => `${SYS.inputs[0].sets[i].id}: ` + r.map((o, j) => `${SYS.inputs[1].sets[j].id}→${o}`).join('  '))];
    return st;
  }

  function step(st) {
    if (st.done) return;
    const P = st.p;
    const rulesAtOnce = P.gran === 'stage';
    if (st.stage === 0) {
      const I = SYS.inputs[0];
      st.md = I.sets.map((s) => trimf(P.dirt, ...s.abc));
      st.title = 'Stage 1 · fuzzify dirt';
      st.narr = `The crisp reading dirt = ${g(P.dirt)}% is turned into degrees of membership. ` + describe(I, st.md) + ' A reading can belong to two sets at once; that overlap is what makes the controller smooth.';
      st.tape = I.sets.map((s) => trimfText(P.dirt, s.id, ...s.abc));
      st.stage = 1;
    } else if (st.stage === 1) {
      const I = SYS.inputs[1];
      st.mg = I.sets.map((s) => trimf(P.grease, ...s.abc));
      st.title = 'Stage 1 · fuzzify grease';
      st.narr = `Same for grease = ${g(P.grease)}%. ` + describe(I, st.mg);
      st.tape = I.sets.map((s) => trimfText(P.grease, s.id, ...s.abc));
      st.stage = 2;
      st.strength = {};
      SYS.output.sets.forEach((s) => (st.strength[s.id] = 0));
    } else if (st.stage >= 2 && st.stage <= 10) {
      const tape = [];
      let narr = '';
      do {
        const r = st.stage - 2,
          i = Math.floor(r / 3),
          j = r % 3;
        const w = Math.min(st.md[i], st.mg[j]);
        const o = SYS.rules[i][j];
        st.fired.push({ i, j, w, o });
        st.strength[o] = Math.max(st.strength[o], w);
        const di = SYS.inputs[0].sets[i],
          gj = SYS.inputs[1].sets[j];
        tape.push(`R${r + 1}: IF dirt is ${di.id} AND grease is ${gj.id} THEN time is ${o}`);
        tape.push(`   strength = min(μ_${di.id}, μ_${gj.id}) = min(${n(st.md[i], 2)}, ${n(st.mg[j], 2)}) = <b>${n(w, 2)}</b>${w > 0 ? `  → clip "${outSet(o).label}" at ${n(w, 2)}` : '  (does not fire)'}`);
        st.title = rulesAtOnce ? 'Stage 2 · evaluate all 9 rules' : `Stage 2 · rule ${r + 1} of 9`;
        narr =
          w > 0
            ? `Rule ${r + 1} says: if dirt is ${di.label.toLowerCase()} and grease is ${gj.label.toLowerCase()}, wash for a ${outSet(o).label.toLowerCase()} time. "AND" takes the <b>minimum</b> of the two memberships, so the rule is ${n(w * 100, 0)}% true. Its output set is clipped at that height (Mamdani implication).`
            : `Rule ${r + 1} (${di.id} AND ${gj.id} → ${o}) needs ${w === 0 && st.md[i] === 0 ? `dirt to be ${di.label.toLowerCase()}` : `grease to be ${gj.label.toLowerCase()}`}, which has membership 0. min(…, 0) = 0, so this rule <b>does not fire</b>.`;
        st.stage++;
      } while (rulesAtOnce && st.stage <= 10);
      if (rulesAtOnce) narr = `All nine rules are checked. "AND" = minimum of the two input memberships. ${st.fired.filter((f) => f.w > 0).length} rules fire; each one clips its output set at its strength.`;
      st.narr = narr;
      st.tape = tape;
    } else if (st.stage === 11) {
      st.agg = aggregate(st.strength, P.samples);
      st.title = 'Stage 3 · aggregate';
      const used = SYS.output.sets.filter((s) => st.strength[s.id] > 0);
      st.narr = `All clipped output sets are merged into one shape by taking the <b>maximum</b> at every point (fuzzy OR). When two rules point to the same set (${dupes(st) || 'none here'}), the stronger one wins.`;
      st.tape = SYS.output.sets.map((s) => `${s.id}: max of rules → ${n(st.strength[s.id], 2)}${st.strength[s.id] > 0 ? '' : '  (empty)'}`).concat([`aggregated shape = max(${used.map((s) => `min(${n(st.strength[s.id], 2)}, μ_${s.id})`).join(', ')})`]);
      st.stage = 12;
    } else if (st.stage === 12) {
      st.out = defuzzify(st.agg, P.defuzz);
      st.title = 'Stage 4 · defuzzify';
      const m = { centroid: 'centre of gravity (centroid)', bisector: 'bisector of area', mom: 'mean of maximum' }[P.defuzz];
      st.narr = Number.isFinite(st.out.value)
        ? `The machine needs one number, so the shape is <b>defuzzified</b> with the ${m}. Result: wash for <b>${n(st.out.value, 2)} minutes</b>.`
        : 'No rule fired, so there is no output shape. (This cannot happen with this rule base.)';
      if (P.defuzz === 'centroid')
        st.tape = [
          `<span class="eq">z* = Σ μ(zₖ)·zₖ / Σ μ(zₖ)</span>   over ${P.samples} points from 0 to 60 min`,
          `Σ μ·z = ${n(st.out.moment, 2)},  Σ μ = ${n(st.out.area, 2)}`,
          `z* = ${n(st.out.moment, 2)} / ${n(st.out.area, 2)} = <b>${n(st.out.value, 3)} min</b>`,
        ];
      else if (P.defuzz === 'mom') st.tape = [`peak height = ${n(st.out.peak, 2)}, reached for z in [${n(st.out.span[0], 2)}, ${n(st.out.span[1], 2)}]`, `mean of maximum = <b>${n(st.out.value, 3)} min</b>`];
      else st.tape = [`total area = ${n(st.out.area, 2)} (in sample units)`, `the vertical line that splits it in half is at <b>${n(st.out.value, 3)} min</b>`];
      st.stage = 13;
      st.done = true;
    }
  }

  function describe(I, mus) {
    const parts = I.sets.map((s, k) => (mus[k] > 0 ? `${n(mus[k], 2)} "${s.label}"` : null)).filter(Boolean);
    return `It is ${parts.join(' and ')}${I.sets.some((s, k) => mus[k] === 0) ? `, and 0 in the other set${mus.filter((m) => m === 0).length > 1 ? 's' : ''}` : ''}.`;
  }
  function dupes(st) {
    const c = {};
    st.fired.filter((f) => f.w > 0).forEach((f) => (c[f.o] = (c[f.o] || 0) + 1));
    return Object.keys(c)
      .filter((k) => c[k] > 1)
      .join(', ');
  }

  SC.engines.fuzzy = { SYS, defaults, trimf, infer, aggregate, defuzzify, create, step };
})(typeof window !== 'undefined' ? window : globalThis);
