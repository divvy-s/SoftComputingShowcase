/* Router, theme toggle, home page and the all-in-one verification page. */
(function () {
  'use strict';
  const SC = window.SC,
    UI = SC.ui;
  const app = document.getElementById('app');
  const TABS = [
    ['home', 'Home'],
    ['pso', 'PSO'],
    ['abc', 'Bee Colony'],
    ['race', 'Race'],
    ['verify', 'Verification'],
  ];
  document.getElementById('tabs').innerHTML = TABS.map(([k, l]) => `<a href="#${k}" data-k="${k}">${l}</a>`).join('');

  /* theme */
  const tbtn = document.getElementById('themeBtn');
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('softlab-theme', t);
    } catch (e) {}
    tbtn.textContent = t === 'dark' ? '☀' : '☾';
    if (UI.active) UI.active.render();
    if (heroApi) drawHero();
  }
  let saved = null;
  try {
    saved = localStorage.getItem('softlab-theme');
  } catch (e) {}
  tbtn.onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

  /* pages */
  const pages = {};
  const apis = {};

  function homeHTML() {
    const card = (k, kind, title, text) => `<a class="panel card" href="#${k}"><span class="k">${kind}</span><h3>${title}</h3><p>${text}</p></a>`;
    const f = (t, d) => `<div class="panel"><h4>${t}</h4><p>${d}</p></div>`;
    return `<section class="hero"><div>
        <h1>Swarm intelligence, <em>one step at a time.</em></h1>
        <p>SoftLab is an interactive lab for swarm intelligence: particle swarm optimisation and the artificial bee colony. Pick a problem, change the parameters, then play, pause, step forward <i>and back</i> through the run. Every step comes with a plain-language explanation and the full arithmetic with the numbers filled in.</p>
        <p style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><a class="btn primary" href="#pso" style="text-decoration:none">Start with PSO →</a><a class="btn" href="#verify" style="text-decoration:none">See the textbook checks</a></p>
      </div><canvas data-hero></canvas></section>
      <h2 class="sec-title">Modules</h2>
      <div class="cards">
        ${card('pso', 'Swarm', 'Particle Swarm Optimisation', 'See each velocity split into inertia, cognitive and social arrows. gbest and ring topologies, five landscapes.')}
        ${card('abc', 'Swarm', 'Artificial Bee Colony', 'Employed, onlooker and scout bees, one bee at a time, with the waggle-dance probabilities drawn as bars.')}
        ${card('race', 'Compare', 'Swarm Race', 'PSO vs ABC on one landscape, compared fairly per function evaluation.')}
      </div>
      <h2 class="sec-title">What makes SoftLab different</h2>
      <div class="feat">
        ${f('📖 Textbook mode with automatic checks', 'One click loads the exact numbers from the course material (the PSO step-by-step handout and the ABC solved example). SoftLab replays them and compares every printed value. It found real arithmetic slips in the sources and shows the independent recalculation.')}
        ${f('🧮 A live “hand calculation” tape', 'Every step prints the formula and then the same formula with this step’s numbers substituted, exactly as you would write it in an exam.')}
        ${f('⏪ Step backwards', 'The full state is snapshotted every step, so you can rewind a confusing moment instead of restarting.')}
        ${f('🏹 Velocity decomposition', 'PSO moves are drawn as three coloured arrows laid tip to tail, so you can see whether memory or peer pressure is winning.')}
        ${f('🎲 Seeded randomness', 'Every run is reproducible from its seed. Change one parameter, keep the seed, and compare like for like.')}
      </div>
      <h2 class="sec-title">Keyboard</h2>
      <p class="vsum"><kbd>Space</kbd> play / pause · <kbd>→</kbd> step · <kbd>←</kbd> step back · <kbd>R</kbd> reset</p>
      <footer class="foot">SoftLab · built for the Soft Computing course (B.Tech IT, 5th semester), swarm intelligence unit · runs entirely in your browser, no data leaves the page.</footer>`;
  }

  /* little live swarm in the hero */
  let heroApi = null,
    heroTimer = null;
  function drawHero() {
    const cv = app.querySelector('[data-hero]');
    if (!cv || !heroApi) return;
    const st = heroApi,
      F = SC.FUNCS[st.p.fn];
    const { ctx, w, h } = UI.canvas(cv);
    ctx.drawImage(UI.heat(st.p.fn), 0, 0, w, h);
    const X = (x) => ((x - F.lo) / (F.hi - F.lo)) * w,
      Y = (y) => h - ((y - F.lo) / (F.hi - F.lo)) * h;
    st.particles.forEach((q) => {
      if (q.prev) {
        ctx.strokeStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath();
        ctx.moveTo(X(q.prev[0]), Y(q.prev[1]));
        ctx.lineTo(X(q.x[0]), Y(q.x[1]));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(X(q.x[0]), Y(q.x[1]), 4, 0, 7);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
    UI.star(ctx, X(st.gbest[0]), Y(st.gbest[1]), 9, '#ff4d4f', '#fff');
  }
  function startHero() {
    let seed = 1;
    const fresh = () => (heroApi = SC.engines.pso.create({ fn: 'himmelblau', N: 24, w: 0.6, c1: 1.2, c2: 1.2, vmax: 0.6, topology: 'ring', gran: 'iteration', maxIter: 90, seed: seed++ }));
    fresh();
    clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      if (heroApi.done) fresh();
      SC.engines.pso.step(heroApi);
      drawHero();
    }, 110);
    drawHero();
  }

  function verifyHTML() {
    return `<div class="mod-head"><div><h1>Verification against the course material</h1>
      <p class="tagline">Each block re-runs an algorithm from scratch in textbook mode and compares SoftLab’s numbers with the values printed in the source. Where the source disagrees, the arithmetic is recomputed independently to show which side is right. The same checks run headless with <code>node tests/run-verification.js</code>.</p></div></div>
      <section class="panel verify" style="margin-top:0"><div class="verify-head"><div><h3>All checks</h3><div class="vsum" data-vsum></div></div><button class="btn" data-rerun>Re-run all</button></div><div data-vbody></div></section>`;
  }

  function show(key) {
    if (!TABS.some((t) => t[0] === key)) key = 'home';
    document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.k === key));
    Object.values(apis).forEach((a) => a.pause());
    Object.values(pages).forEach((p) => (p.style.display = 'none'));
    clearInterval(heroTimer);
    if (!pages[key]) {
      const host = document.createElement('div');
      app.appendChild(host);
      pages[key] = host;
      if (key === 'home') host.innerHTML = homeHTML();
      else if (key === 'verify') {
        host.innerHTML = verifyHTML();
        const run = () => UI.renderVerify(host.querySelector('[data-vbody]'), host.querySelector('[data-vsum]'), SC.verifiers);
        host.querySelector('[data-rerun]').onclick = run;
        run();
      } else apis[key] = UI.mount(UI.modules[key], host);
    }
    pages[key].style.display = '';
    UI.active = apis[key] || null;
    if (key === 'home') startHero();
    if (UI.active) UI.active.render();
    document.title = (TABS.find((t) => t[0] === key) || [0, 'Home'])[1] + ' · SoftLab';
    window.scrollTo(0, 0);
  }

  setTheme(saved || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  show(location.hash.slice(1) || 'home');
})();
