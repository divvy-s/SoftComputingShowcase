(function () {
  'use strict';
  const SC = window.SC,
    UI = SC.ui,
    E = SC.engines.ga;
  const { n, g } = SC;
  const col = (i, N) => `hsl(${(i * 360) / N + 200} 70% 58%)`;

  function bitsHTML(bits, opts = {}) {
    return [...bits]
      .map((c, i) => {
        let s = c;
        if (opts.flips && opts.flips.includes(i)) s = `<b>${c}</b>`;
        if (opts.H && opts.H[i] !== '*' && E.matches(bits, opts.H)) s = `<span class="sch">${s}</span>`;
        if (opts.site && i === opts.site) s = `<span class="cut">|</span>` + s;
        return s;
      })
      .join('');
  }

  UI.modules.ga = {
    key: 'ga',
    title: 'Genetic Algorithm & Schema Theorem',
    tagline: 'Binary strings compete on a roulette wheel, swap tails in crossover and occasionally flip a bit. The table fills in exactly like a hand-worked GA table, and the schema tracker tests Holland’s theorem live.',
    engine: E,
    start: E.textbookDeb,
    verify: 'ga',
    presets: [
      { label: '📖 Deb: maximise sin x (Table 1)', params: E.textbookDeb, book: true, hint: "Deb's initial population, mating pool and cross sites" },
      { label: '📖 Lecture: maximise x²', params: E.textbookLecture, book: true, hint: 'Lecture population and random numbers 0.4, 0.15, 0.7, 0.9' },
      { label: 'Bumpy function, 16-bit', params: E.defaults },
    ],
    controls: (p) => [
      { id: 'problem', label: 'Problem (maximise)', type: 'select', options: Object.entries(E.PROBLEMS).map(([k, v]) => [k, v.name]), onChange: (v, api) => (api.params.L = E.PROBLEMS[v].L) },
      { type: 'html', html: `<div class="fnnote">${E.PROBLEMS[p.problem].note}</div>` },
      { id: 'N', label: 'Population size N (even)', type: 'range', min: 2, max: 30, step: 2 },
      { id: 'L', label: 'String length l (bits)', type: 'range', min: 3, max: 20, step: 1, help: 'More bits = finer resolution: 2ˡ possible x values.' },
      { id: 'sel', label: 'Selection', type: 'select', options: [['roulette', 'Roulette wheel (fitness-proportionate)'], ['rank', 'Rank-based roulette'], ['tournament', 'Binary tournament']] },
      { id: 'pc', label: 'Crossover probability pc', type: 'range', min: 0, max: 1, step: 0.05 },
      { id: 'pm', label: 'Mutation probability pm (per bit)', type: 'range', min: 0, max: 0.2, step: 0.005 },
      { id: 'elitism', label: 'Elitism (keep the best string)', type: 'check' },
      { id: 'gran', label: 'One step =', type: 'select', options: [['phase', 'one operator'], ['generation', 'one generation']], keepBook: true, live: (v, api) => (api.st.p.gran = v) },
      { id: 'maxGen', label: 'Max generations', type: 'number', min: 1, max: 500 },
      { id: 'seed', label: 'Random seed', type: 'number', min: 0, max: 99999 },
    ],
    phases: (st) => {
      const M = { select: 'Selection', crossover: 'Crossover', mutate: 'Mutation', evaluate: 'Evaluate new generation' };
      return { list: Object.values(M), on: st.last ? M[st.last.type] : null, next: M[st.phase] };
    },
    stage: `<div class="viz-2"><div><canvas class="cv-wide" data-cv="fx"></canvas>
       <div class="legend"><span><i style="background:var(--accent)"></i>current population</span><span><i style="border:2px solid var(--faint)"></i>previous generation</span><span><i class="sq" style="background:var(--good);opacity:.3"></i>region covered by schema H</span></div></div>
       <div><div class="mini" data-wheel-title>Roulette wheel</div><canvas class="cv-square" data-cv="wheel" style="max-width:240px"></canvas></div></div>
       <div class="mini">Hand-calculation table <span style="font-weight:400">(fills in as you step)</span></div><div class="tbl-wrap" data-tbl></div>
       <div class="mini">Fitness per generation</div><canvas class="cv-chart" data-cv="conv"></canvas>`,
    below: `<div class="panel"><div class="panel-h">Schema theorem, live</div>
       <p class="vsum" style="margin:6px 0 10px">A schema is a template such as <code>10***</code>: <code>*</code> matches either bit. Holland's theorem predicts a lower bound on how many strings will match it next generation. Type any schema and watch the prediction against what actually happens.</p>
       <div class="schema-row"><label>H = <input data-schema spellcheck="false" autocomplete="off"></label><span class="vsum">matching strings are underlined in the table and shaded on the plot</span></div>
       <div class="kv" data-kv></div><div class="tape" data-sform></div>
       <div class="two" style="margin-top:12px"><div><div class="mini">m(H, t+1): theorem's lower bound vs actual count</div><canvas class="cv-chart" data-cv="schema"></canvas></div><div class="tbl-wrap" data-shist style="max-height:220px;overflow:auto"></div></div></div>`,
    theory: `<p><b>Decoding</b> an l-bit string with decoded value DV:</p><span class="f">x = lo + DV · (hi − lo) / (2ˡ − 1)</span>
      <p><b>Roulette selection</b>: string i gets a slice of size</p><span class="f">pᵢ = fᵢ / Σf,   expected copies = N·pᵢ = fᵢ / f̄</span>
      <p><b>Single-point crossover</b> at site k swaps the tails: <code>ab|cde × vw|xyz → ab xyz, vw cde</code>. <b>Mutation</b> flips each bit with probability pm.</p>
      <p><b>Schema H</b>: order o(H) = number of fixed bits, defining length δ(H) = distance between the first and last fixed bit. Example: o(*1*01) = 3, δ(*1*01) = 5 − 2 = 3.</p>
      <p><b>Schema theorem</b> (Holland / Goldberg):</p><span class="f">E[m(H,t+1)] ≥ m(H,t) · f(H)/f̄ · [1 − pc·δ(H)/(l−1)] · (1 − pm)^o(H)</span>
      <p>Short, low-order, above-average schemata (<i>building blocks</i>) receive exponentially increasing trials.</p>`,
    onMount(api) {
      const inp = api.$('[data-schema]');
      inp.addEventListener('input', () => {
        E.setSchema(api.st, inp.value || '');
        api.params.schema = api.st.schema;
        api.render();
      });
    },
    render(st, api) {
      const pr = E.PROBLEMS[st.p.problem],
        N = st.pop.length,
        L = st.L,
        H = st.schema;
      /* ---- function plot ---- */
      {
        const { ctx, w, h } = UI.canvas(api.$('[data-cv=fx]'));
        const pad = { l: 44, r: 10, t: 12, b: 24 };
        const xs = [],
          ys = [];
        for (let k = 0; k <= 500; k++) {
          const x = pr.lo + ((pr.hi - pr.lo) * k) / 500;
          xs.push(x);
          ys.push(pr.f(x));
        }
        const y0 = Math.min(0, ...ys),
          y1 = Math.max(...ys) * 1.06 || 1;
        const X = (x) => pad.l + ((x - pr.lo) / (pr.hi - pr.lo)) * (w - pad.l - pad.r);
        const Y = (y) => pad.t + (1 - (y - y0) / (y1 - y0)) * (h - pad.t - pad.b);
        // schema shading, one pixel column at a time
        ctx.fillStyle = UI.css('--good');
        ctx.globalAlpha = 0.16;
        const maxDV = 2 ** L - 1;
        for (let px = pad.l; px < w - pad.r; px++) {
          const x = pr.lo + ((px - pad.l) / (w - pad.l - pad.r)) * (pr.hi - pr.lo);
          const dv = Math.round(((x - pr.lo) / (pr.hi - pr.lo)) * maxDV);
          const bits = dv.toString(2).padStart(L, '0');
          if (E.matches(bits, H)) ctx.fillRect(px, pad.t, 1, h - pad.t - pad.b);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = UI.css('--line');
        ctx.beginPath();
        ctx.moveTo(pad.l, Y(0));
        ctx.lineTo(w - pad.r, Y(0));
        ctx.stroke();
        ctx.fillStyle = UI.css('--muted');
        ctx.font = '10.5px ' + UI.css('--mono');
        ctx.textAlign = 'center';
        [pr.lo, (pr.lo + pr.hi) / 2, pr.hi].forEach((v) => ctx.fillText(SC.g(v, 2), X(v), h - 7));
        ctx.textAlign = 'right';
        [y0, (y0 + y1) / 2, y1].forEach((v) => ctx.fillText(SC.g(v, 2), pad.l - 5, Y(v) + 3));
        ctx.strokeStyle = UI.css('--ink');
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        xs.forEach((x, k) => (k ? ctx.lineTo(X(x), Y(ys[k])) : ctx.moveTo(X(x), Y(ys[k]))));
        ctx.stroke();
        if (st.prev) {
          ctx.strokeStyle = UI.css('--faint');
          ctx.lineWidth = 1.5;
          st.prev.pop.forEach((i) => {
            ctx.beginPath();
            ctx.arc(X(i.x), Y(i.f), 6, 0, 7);
            ctx.stroke();
          });
        }
        st.pop.forEach((i, k) => {
          ctx.beginPath();
          ctx.arc(X(i.x), Y(i.f), 5, 0, 7);
          ctx.fillStyle = k === st.stats.bestI ? UI.css('--good') : UI.css('--accent');
          ctx.fill();
          ctx.strokeStyle = UI.css('--panel');
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }
      /* ---- roulette wheel ---- */
      {
        const base = st.prev && st.last.type === 'evaluate' ? st.pop : st.pop;
        const probs = st.selProbs && st.last && st.last.type !== 'evaluate' ? st.selProbs : st.probs;
        const { ctx, w, h } = UI.canvas(api.$('[data-cv=wheel]'));
        const cx = w / 2,
          cy = h / 2,
          R = Math.min(w, h) / 2 - 16;
        api.$('[data-wheel-title]').textContent = st.p.sel === 'tournament' ? 'Fitness share (tournament ignores the wheel)' : st.p.sel === 'rank' ? 'Rank wheel (slice ∝ rank)' : 'Roulette wheel (slice ∝ fitness)';
        let a0 = -Math.PI / 2;
        probs.forEach((p, i) => {
          const a1 = a0 + p * 2 * Math.PI;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, R, a0, a1);
          ctx.closePath();
          ctx.fillStyle = col(i, N);
          ctx.fill();
          ctx.strokeStyle = UI.css('--panel');
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (p > 0.04) {
            const am = (a0 + a1) / 2;
            ctx.fillStyle = '#10131a';
            ctx.font = 'bold 11px ' + UI.css('--sans');
            ctx.textAlign = 'center';
            ctx.fillText('#' + (i + 1), cx + Math.cos(am) * R * 0.62, cy + Math.sin(am) * R * 0.62 + 4);
          }
          a0 = a1;
        });
        if (st.last && st.last.type === 'select' && st.spins && st.spins.length) {
          st.spins.forEach((r, k) => {
            const a = -Math.PI / 2 + r * 2 * Math.PI;
            UI.arrow(ctx, cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14), cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6), UI.css('--ink'), 2);
            void k;
          });
        }
        void base;
      }
      /* ---- hand-calculation table ---- */
      {
        const B = st.prev ? st.prev : { pop: st.pop, probs: st.probs, expected: st.expected, stats: st.stats };
        const showPool = !!st.pool,
          showX = !!st.pairs,
          showM = st.children && st.children[0] && st.children[0].before !== undefined;
        let html = `<table class="data"><tr><th>#</th><th>${st.prev ? 'Parent' : 'Population'} string</th><th>DV</th><th>x</th><th>f(x)</th><th>p = f/Σf</th><th>N·p</th>`;
        if (showPool) html += `<th>count</th><th>mating pool</th>`;
        if (showX) html += `<th>after crossover</th>`;
        if (showM) html += `<th>after mutation</th>`;
        if (st.prev) html += `<th>new f(x)</th>`;
        html += `</tr>`;
        for (let k = 0; k < N; k++) {
          const ind = B.pop[k];
          html += `<tr class="${k === B.stats.bestI ? 'best' : ''}"><td><span style="color:${col(k, N)}">■</span> ${k + 1}</td><td class="bits">${bitsHTML(ind.bits, { H })}</td><td>${ind.dv}</td><td>${n(ind.x, 3)}</td><td>${n(ind.f, 4)}</td><td>${n(B.probs[k], 3)}</td><td>${n(B.expected[k], 2)}</td>`;
          if (showPool) {
            const pair = st.pairs ? st.pairs[Math.floor(k / 2)] : null;
            html += `<td>${st.counts[k]}</td><td class="bits">${bitsHTML(st.pool[k].bits, { site: pair && pair.crossed ? pair.site : 0 })} <span style="color:var(--faint)">(#${st.pool[k].from + 1})</span></td>`;
          }
          if (showX) {
            const pair = st.pairs[Math.floor(k / 2)];
            const c = k % 2 ? pair.c2 : pair.c1;
            html += `<td class="bits">${bitsHTML(c, { site: pair.crossed ? pair.site : 0 })}${pair.crossed ? ` <span style="color:var(--faint)">site ${pair.site}</span>` : ' <span style="color:var(--faint)">no cross</span>'}</td>`;
          }
          if (showM) html += `<td class="bits">${bitsHTML(st.children[k].bits, { flips: st.children[k].flips })}</td>`;
          if (st.prev) html += `<td>${st.pop[k].bits === (st.children[k] || {}).bits ? '' : '★ '}${n(st.pop[k].f, 4)}</td>`;
          html += `</tr>`;
        }
        html += `<tr><td></td><td colspan="3" style="font-family:var(--sans);color:var(--muted)">Σf = ${n(B.stats.sum, 3)} · f̄ = ${n(B.stats.avg, 4)} · max = ${n(B.stats.max, 4)}</td><td colspan="${3 + (showPool ? 2 : 0) + (showX ? 1 : 0) + (showM ? 1 : 0) + (st.prev ? 1 : 0)}" style="font-family:var(--sans);color:var(--muted)">${st.prev ? `new generation: Σf = ${n(st.stats.sum, 3)} · f̄ = <b>${n(st.stats.avg, 4)}</b> · max = ${n(st.stats.max, 4)}${st.p.elitism ? ' · ★ = elite copy' : ''}` : `generation ${st.gen}`}</td></tr></table>`;
        api.$('[data-tbl]').innerHTML = html;
      }
      UI.lineChart(
        api.$('[data-cv=conv]'),
        [
          { label: 'best', color: UI.css('--good'), data: st.hist.map((h) => h.best) },
          { label: 'average', color: UI.css('--accent'), data: st.hist.map((h) => h.avg) },
        ],
        {}
      );
      /* ---- schema panel ---- */
      const inp = api.$('[data-schema]');
      if (document.activeElement !== inp) inp.value = st.schema;
      inp.maxLength = L;
      const s = st.schemaNow;
      api.$('[data-kv]').innerHTML = [
        ['order o(H)', s.o],
        ['defining length δ(H)', s.delta],
        ['m(H, t) now', s.m],
        ['f(H, t)', s.m ? n(s.fH, 4) : '—'],
        ['population f̄', n(s.avg, 4)],
        ['bound for t+1', n(s.bound, 3)],
      ]
        .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`)
        .join('');
      api.$('[data-sform]').innerHTML = [
        `<div><span class="eq">E[m(H,t+1)] ≥ m(H,t)·f(H)/f̄ · (1 − pc·δ/(l−1)) · (1 − pm)^o</span></div>`,
        `<div>= ${s.m} × ${n(s.fH, 4)}/${n(s.avg, 4)} × (1 − ${g(st.p.pc)}×${s.delta}/${L - 1}) × (1 − ${g(st.p.pm)})^${s.o}</div>`,
        `<div>= ${n(s.sel, 3)} × ${n(s.sc, 3)} × ${n(s.sm, 3)} = <b>${n(s.bound, 3)}</b></div>`,
        `<div style="color:var(--muted)">${s.m === 0 ? 'No string matches H right now, so the theorem predicts nothing (only mutation or crossover could create one).' : s.fH > s.avg ? 'H is above average, so selection should give it more copies (factor ' + n(s.fH / s.avg, 2) + '×); crossover and mutation can only take some away.' : 'H is below average, so selection is expected to shrink it.'}</div>`,
      ].join('');
      const hist = st.schemaHist;
      UI.lineChart(
        api.$('[data-cv=schema]'),
        [
          { label: 'bound', color: UI.css('--warn'), data: hist.map((r) => [r.gen + 1, r.bound]), dash: [5, 4], dots: true },
          { label: 'actual', color: UI.css('--good'), data: hist.map((r) => [r.gen + 1, r.next]), dots: true },
        ],
        { y0: 0, legend: true }
      );
      api.$('[data-shist]').innerHTML = hist.length
        ? `<table class="data"><tr><th>t</th><th>m(H,t)</th><th>f(H)/f̄</th><th>bound</th><th>actual m(H,t+1)</th></tr>${hist
            .map((r) => `<tr><td>${r.gen}</td><td>${r.m}</td><td>${r.m ? n(r.fH / r.avg, 3) : '—'}</td><td>${n(r.bound, 2)}</td><td>${r.next} ${r.next >= r.bound - 1e-9 ? '<span class="chip pass">≥ bound</span>' : '<span class="chip slip">below (it is only an expectation)</span>'}</td></tr>`)
            .reverse()
            .join('')}</table>`
        : '<div class="vsum">Finish a generation to compare the prediction with reality.</div>';
    },
  };
})();
