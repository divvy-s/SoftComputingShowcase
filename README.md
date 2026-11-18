# SoftLab: soft computing, one step at a time

SoftLab is a browser-based, interactive teaching tool for the algorithms in the **Soft Computing** course (B.Tech IT, 5th semester):

| Module | What you can do |
|---|---|
| **Genetic Algorithm + Schema Theorem** | Binary GA with roulette / rank / tournament selection, single-point crossover and bit-flip mutation, filled into the classic hand-calculation table. Type any schema (e.g. `1*0**`) and compare Holland's predicted lower bound with the real count, generation by generation. |
| **Particle Swarm Optimisation** | gbest (star) or lbest (ring) PSO on five 2-D landscapes. Each move is drawn as three arrows (inertia, cognitive, social) laid tip to tail. |
| **Artificial Bee Colony** | Employed, onlooker and scout phases one bee at a time, with the waggle-dance probabilities drawn as bars and trial counters on every food source. |
| **Fuzzy Logic Controller** | The Mamdani washing-machine controller (dirt, grease → wash time): fuzzify, fire nine rules, aggregate, defuzzify (centroid / bisector / MOM), plus the full control surface. |
| **Perceptron Learning** | Watch the decision line move after each mistake on AND / OR / NAND / XOR, a random cloud, or points you click in yourself. Includes the lecture's single-neuron calculator (MP, perceptron, sigmoid). |
| **Algorithm Race** | PSO vs ABC vs a real-coded GA on the same landscape, compared fairly **per function evaluation**. |
| **Verification** | Every textbook check in one place (see below). |

**Live demo:** `https://<your-github-username>.github.io/softlab/` (see *Deploy* below)

---

## Requirements checklist

| Requirement | How SoftLab meets it |
|---|---|
| Pick a problem and change parameters | Every module has a problem selector (5 benchmark landscapes; 4 GA objectives; 6 perceptron datasets; any dirt/grease input) and live parameter controls (N, w, c₁, c₂, vmax, topology, SN, limit, pc, pm, selection, elitism, η, initial weights, defuzzifier, seed…). |
| Step through the algorithm | **Play, Pause, Step, Step *back*, Reset** plus a speed slider. Keyboard: `Space` play/pause, `→` step, `←` back, `R` reset. Step size is selectable (one particle / iteration, one bee / phase / cycle, one operator / generation, one rule / stage, one sample / epoch). |
| Show the state at every step | Live canvas, a state table (swarm, food sources, GA hand table, perceptron trace), phase chips, and convergence charts. |
| Plain-language explanation | The right panel explains *what just happened and why* in plain words, then shows the **hand calculation**: the formula followed by the same formula with this step's numbers substituted. |
| Checked against a hand calculation / textbook | A **textbook mode** preset in each module reproduces the course's worked example exactly. A verification table compares every printed value (66 checks plus 1 informational note). The same checks run headless: `node tests/run-verification.js`. |
| Something new / unique | Step-back history; live hand-calculation tape; schema-theorem tracker; PSO velocity decomposition arrows; ABC dance-floor bars; fuzzy control surface; per-evaluation algorithm race; automatic detection of **arithmetic slips in the source material**; reproducible seeded runs; light/dark themes; works offline. |

---

## Verified against the course material

Run `node tests/run-verification.js` (Node ≥ 16, no dependencies). Current result: **60 values match, 6 differ because the source has an arithmetic slip (confirmed by independent recomputation), 1 informational note, 0 mismatches.**

| Source | What is reproduced |
|---|---|
| *Understanding PSO Step by Step* (course handout), f = x₁² + x₂² | Initial fitness, gbest, every velocity and position of iteration 1 using the printed r₁, r₂, new fitness, pbest and gbest updates. |
| *ABC Algo* slides, Solved Example | Initial fitness, employed bee 1 (φ = 0.81, overshoot clamped to 5, f = 26, fit = 0.037), all tables after the employed and onlooker phases, dance probabilities, scout replacement. |
| K. Deb, *An Introduction to Genetic Algorithms*, Table 1 (max sin x) | Decoding, fitness, expected copies, mating pool, crossover at sites 3 and 2, new population and average, schema counts H₁ = 10\*\*\* (1 → 2) and H₂ = 00\*\*\* (1 → 0), schema-theorem bound. |
| *PPT-Genetic Algo*, Solved Example (max x², 0 ≤ x ≤ 31) | Fitness, Σf = 1155, probabilities, expected counts, roulette selection with the lecture's random numbers 0.4, 0.15, 0.7, 0.9. |
| Washing-machine FLC (course MATLAB exercise), dirt = 60, grease = 70 | Memberships, all nine rule strengths, clip heights, centroid vs. a 200 001-point integral. |
| Perceptron rule from the ANN lecture, AND gate, w = 0, η = 1 | Weights after each of the 6 epochs and mistakes per epoch (hand trace below); lecture neuron Σwx = 0.484. |

### Slips found in the sources

SoftLab marks these as **✎ book slip**, not as a pass:

1. **PSO handout, v₁₂**: printed −5.351696, but 0.6987 + 2·0.91·(1.3202 − 4.8030) = **−5.6400**. So x₁₂ = −0.8370 (not −0.5486) and f(x₁) = 2.5197 (not 2.1200). Particle 1 is still the new gbest, so the handout's conclusions stand.
2. **ABC slides, p₂**: printed 0.859, but 0.9·0.2/0.2386 + 0.1 = **0.854**.
3. **ABC slides, scout**: printed x₂ = −0.8, but −5 + 0.58·10 = **+0.8**. f = 1.13 either way.
4. **Deb Table 1**: new average printed 0.711; the four printed values average to 0.7103 (rounding).
5. *(note)* The ABC slide's final table also changes X₁ to (1.32, −0.92), which none of the shown steps produces.

The ABC slides only print the random choices for bee 1 and the scout. The other φ / partner / variable choices were worked backwards by hand from the printed tables (e.g. bee 2: −3 + φ(−3 − 2) = 0 ⇒ φ = −0.6) and are documented in `js/engines/abc.js`.

### Perceptron hand trace (AND, w = (w₀, w₁, w₂) = (0, 0, 0), η = 1, y = 1 if z ≥ 0)

| Epoch | (0,0)→0 | (0,1)→0 | (1,0)→0 | (1,1)→1 | w after epoch | mistakes |
|---|---|---|---|---|---|---|
| 1 | z=0, y=1 ✗ → (−1,0,0) | z=−1 ✓ | z=−1 ✓ | z=−1 ✗ → (0,1,1) | (0, 1, 1) | 2 |
| 2 | z=0 ✗ → (−1,1,1) | z=0 ✗ → (−2,1,0) | z=−1 ✓ | z=−1 ✗ → (−1,2,1) | (−1, 2, 1) | 3 |
| 3 | z=−1 ✓ | z=0 ✗ → (−2,2,0) | z=0 ✗ → (−3,1,0) | z=−2 ✗ → (−2,2,1) | (−2, 2, 1) | 3 |
| 4 | ✓ | z=−1 ✓ | z=0 ✗ → (−3,1,1) | z=−1 ✗ → (−2,2,2) | (−2, 2, 2) | 2 |
| 5 | ✓ | z=0 ✗ → (−3,2,1) | z=−1 ✓ | z=0 ✓ | (−3, 2, 1) | 1 |
| 6 | ✓ | ✓ | ✓ | ✓ | (−3, 2, 1) | 0 → converged |

---

## Run locally

No build step and no dependencies. It is plain HTML, CSS and JavaScript.

```bash
python -m http.server 8765
```

Then open http://localhost:8765. You can also open `index.html` directly in a browser.

## Deploy (GitHub Pages, free)

```bash
git remote add origin https://github.com/<your-username>/softlab.git
git push -u origin main
```

On GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**. The site appears at `https://<your-username>.github.io/softlab/` in about a minute. Netlify Drop or Vercel also work: drag the folder in, no settings needed.

## Project structure

```
index.html                 page shell
css/style.css              design tokens (light + dark), layout
js/core.js                 seeded RNG, scripted "textbook" random numbers, formatting, benchmark functions
js/engines/*.js            pure algorithm engines (no DOM): pso, abc, ga, fuzzy, perceptron, race
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

- Course slides and handouts: Soft Computing (Dr. Rahul Kumar Verma), PSO step-by-step example, ABC Algo, PPT-Genetic Algo, Schema Theory lecture, ANN lectures.
- K. Deb, *An Introduction to Genetic Algorithms*, Sādhanā 24 (1999).
- D. E. Goldberg, *Genetic Algorithms in Search, Optimization and Machine Learning*, 1989.
- J. Kennedy & R. Eberhart, *Particle Swarm Optimization*, 1995. A. P. Engelbrecht, *Computational Intelligence*, 2005.
- D. Karaboga, *An idea based on honey bee swarm for numerical optimization*, TR06, 2005.
- S. N. Sivanandam & S. N. Deepa, *Principles of Soft Computing* (washing-machine FLC).
- Inspiration for the step-through format: VisuAlgo (https://visualgo.net). No code or assets were reused.
