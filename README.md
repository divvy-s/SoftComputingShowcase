# SoftLab: swarm intelligence, one step at a time

SoftLab is a browser-based, interactive teaching tool for the **swarm intelligence** unit of the Soft Computing course (B.Tech IT, 5th semester).

| Module | What you can do |
|---|---|
| **Particle Swarm Optimisation** | gbest (star) or lbest (ring) PSO on five 2-D landscapes. Each move is drawn as three arrows (inertia, cognitive, social) laid tip to tail. |
| **Artificial Bee Colony** | Employed, onlooker and scout phases one bee at a time, with the waggle-dance probabilities drawn as bars and trial counters on every food source. |
| **Swarm Race** | PSO vs ABC on the same landscape, compared fairly **per function evaluation**. |
| **Verification** | Every textbook check in one place (see below). |

**Repo:** https://github.com/divvy-s/SoftComputingShowcase

---

## Requirements checklist

| Requirement | How SoftLab meets it |
|---|---|
| Pick a problem and change parameters | Five benchmark landscapes (Sphere, Rastrigin, Ackley, Himmelblau, Rosenbrock) and live controls: swarm size, inertia w, c₁, c₂, vmax, topology, food sources SN, abandonment limit, step size, iteration/cycle cap, random seed. |
| Step through the algorithm | **Play, Pause, Step, Step *back*, Reset** plus a speed slider. Keyboard: `Space` play/pause, `→` step, `←` back, `R` reset. Step size is selectable (one particle / iteration; one bee / phase / cycle). |
| Show the state at every step | Live canvas, a state table (swarm or food sources), phase chips, and a convergence chart. |
| Plain-language explanation | The right panel explains *what just happened and why* in plain words, then shows the **hand calculation**: the formula followed by the same formula with this step's numbers substituted. |
| Checked against a hand calculation / textbook | A **textbook mode** preset in each module reproduces the course's worked example exactly. The verification table compares every printed value. The same checks run headless: `node tests/run-verification.js`. |
| Something new / unique | Step-back history; live hand-calculation tape; PSO velocity decomposition arrows; ABC dance-floor bars; per-evaluation swarm race; automatic detection of **arithmetic slips in the source material**; reproducible seeded runs; light/dark themes; works offline. |

---

## Verified against the course material

Run `node tests/run-verification.js` (Node ≥ 16, no dependencies). Current result: **28 values match, 5 differ because the source has an arithmetic slip (confirmed by independent recomputation), 1 informational note, 0 mismatches.**

| Source | What is reproduced |
|---|---|
| *Understanding PSO Step by Step* (course handout), f = x₁² + x₂² | Initial fitness, gbest, every velocity and position of iteration 1 using the printed r₁, r₂, new fitness, pbest and gbest updates. |
| *ABC Algo* slides, Solved Example | Initial fitness, employed bee 1 (φ = 0.81, overshoot clamped to 5, f = 26, fit = 0.037), all tables after the employed and onlooker phases, dance probabilities, scout replacement. |

### Slips found in the sources

SoftLab marks these as **✎ book slip**, not as a pass:

1. **PSO handout, v₁₂**: printed −5.351696, but 0.6987 + 2·0.91·(1.3202 − 4.8030) = **−5.6400**. So x₁₂ = −0.8370 (not −0.5486) and f(x₁) = 2.5197 (not 2.1200). Particle 1 is still the new gbest, so the handout's conclusions stand.
2. **ABC slides, p₂**: printed 0.859, but 0.9·0.2/0.2386 + 0.1 = **0.854**.
3. **ABC slides, scout**: printed x₂ = −0.8, but −5 + 0.58·10 = **+0.8**. f = 1.13 either way.
4. *(note)* The ABC slide's final table also changes X₁ to (1.32, −0.92), which none of the shown steps produces.

The ABC slides only print the random choices for bee 1 and the scout. The other φ / partner / variable choices were worked backwards by hand from the printed tables (e.g. bee 2: −3 + φ(−3 − 2) = 0 ⇒ φ = −0.6) and are documented in `js/engines/abc.js`.

---

## Run locally

No build step and no dependencies. It is plain HTML, CSS and JavaScript.

```bash
python -m http.server 8765
```

Then open http://localhost:8765. You can also open `index.html` directly in a browser.

## Deploy (GitHub Pages, free)

On GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**. The site appears at `https://divvy-s.github.io/SoftComputingShowcase/` in about a minute. Netlify Drop or Vercel also work: drag the folder in, no settings needed.

## Project structure

```
index.html                 page shell
css/style.css              design tokens (light + dark), layout
js/core.js                 seeded RNG, scripted "textbook" random numbers, formatting, benchmark functions
js/engines/pso.js          PSO engine (no DOM)
js/engines/abc.js          ABC engine (no DOM)
js/engines/race.js         PSO vs ABC race
js/verify.js               textbook / hand-calculation checks (shared by the UI and Node)
js/ui/ui.js                module shell, player (play/pause/step/back/reset), controls, charts, heat maps
js/ui/*-ui.js              one visualisation per module
js/app.js                  router, home page, verification page, theme
tests/run-verification.js  headless verification + smoke tests (exit code 1 on failure)
docs/demo-script.md        3–5 minute demo video script
```

**Design notes**

- Engines are pure functions over plain JSON state. **Step back** works by snapshotting that state before every step.
- Randomness comes from a seeded generator (mulberry32) stored *in* the state, so a run replays exactly. **Textbook mode** puts the source's own random numbers in a queue (`st.script`). The engine uses them first and falls back to the seeded RNG once the queue is empty, so textbook runs keep going after the worked example ends.
- PSO updates are synchronous (everyone moves using last iteration's gbest, then everyone is evaluated), matching the handout.
- ABC uses fit = 1/(1+f), pₘ = 0.9·fit/max(fit) + 0.1 and sequential onlooker recruitment, matching the course slides.

## References

- Course slides and handouts: Soft Computing (Dr. Rahul Kumar Verma), PSO step-by-step example, ABC Algo.
- J. Kennedy & R. Eberhart, *Particle Swarm Optimization*, 1995. A. P. Engelbrecht, *Computational Intelligence*, 2005.
- D. Karaboga, *An idea based on honey bee swarm for numerical optimization*, TR06, 2005.
- Inspiration for the step-through format: VisuAlgo (https://visualgo.net). No code or assets were reused.
