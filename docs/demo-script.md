# SoftLab demo video script (about 4½ minutes)

Record at 1440×900 or larger with the browser zoomed to 100%. Speak over the screen; the times are targets.

## 0:00–0:25 · Intro (Home page)
- "This is SoftLab, an interactive lab for the Soft Computing course. It covers genetic algorithms with the schema theorem, PSO, the artificial bee colony, a Mamdani fuzzy controller and perceptron learning."
- Point at the live swarm in the hero. "Every module works the same way: pick a problem, change parameters, then play, pause, step forward or step back."

## 0:25–1:35 · PSO with the course handout
- Open **PSO**. Point out that the **📖 Handout example** is already loaded: same 5 particles, velocities and r₁, r₂ as the handout.
- Press **Step** once. Show the three arrows (grey inertia, blue cognitive, orange social) and read one line of the hand-calculation tape: "v₁₁ = 0.4752 + 2×0.34×0 + 2×0.86×(1.64 − 2.7045) = −1.3557, same as the handout."
- Step to particle 1's second component and say: "The handout prints −5.35 here, but 2×0.91×(1.3202 − 4.8030) is −6.34, so the correct value is −5.64. SoftLab caught that slip." Scroll to **Checked against the textbook** and show the ✎ book slip row with its explanation.
- Press **Back** to show rewind, then switch to **Rastrigin, 12 particles**, press **Play**, and drag the speed slider. Switch topology to ring to show it explores longer.

## 1:35–2:30 · Genetic algorithm + schema theorem
- Open **Genetic Algorithm** (Deb's sin x example is loaded). Step through Selection → Crossover → Mutation → Evaluate; the table fills in like Deb's Table 1 and the roulette wheel shows the spins.
- "Average fitness goes from 0.569 to 0.710, matching Deb."
- Scroll to the **Schema theorem** panel. "H = 10*** had one copy. The theorem promised at least 1.18 on average, and we got 2." Type `0****` to show any schema can be tracked; the plot shading updates.
- Load **Bumpy function**, set the step to one generation, press Play, and watch the bound vs actual chart.

## 2:30–3:15 · Artificial Bee Colony
- Open **Bee Colony** (slides example). Step through bee 1: "φ = 0.81 sends it to 7.67, which is clamped to 5. f = 26 is worse, so it's rejected and the trial counter goes to 1, as on the slides."
- Step into the onlooker phase. Show the dance-floor bars with the black tick for r = 0.39 < 0.729.
- Step to the scout: the source with trial 2 > limit 1 is abandoned (arrow from the ghost to the new spot). Mention the slide's sign slip (−0.8 vs +0.8).

## 3:15–3:50 · Fuzzy controller
- Open **Fuzzy Logic** (dirt 60, grease 70). Step: memberships 0.8 / 0.2 and 0.6 / 0.4 appear on the plots; rules light up one by one in the grid with their min strength; aggregate; centroid = 33.6 min.
- Drag dirt to 90 and point at the control surface marker moving.

## 3:50–4:25 · Perceptron
- Open **Perceptron** (AND, hand trace). Press Play: the line moves after each mistake and converges at epoch 6 with w = (−3, 2, 1), matching the README hand trace.
- Load **XOR**: "it never converges, because no single line separates XOR. That is why we need hidden layers." Click a few points to show the custom dataset.

## 4:25–4:50 · Race + wrap-up
- Open **Race**, press Play: PSO vs ABC vs GA on Rastrigin, compared per evaluation.
- Open **Verification**: "66 checks against four sources and two hand calculations: 60 match and 6 are slips in the sources, confirmed by recomputation. It's a static site, it runs offline, and the repo README has the full list."
