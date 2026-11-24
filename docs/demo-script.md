# SoftLab demo video script (about 3½ minutes)

Record at 1440×900 or larger with the browser zoomed to 100%. Speak over the screen; the times are targets.

## 0:00–0:25 · Intro (Home page)
- "This is SoftLab, an interactive lab for swarm intelligence: particle swarm optimisation and the artificial bee colony."
- Point at the live swarm in the hero. "Every module works the same way: pick a problem, change parameters, then play, pause, step forward or step back."

## 0:25–1:45 · PSO with the course handout
- Open **PSO**. Point out that the **📖 Handout example** is already loaded: same 5 particles, velocities and r₁, r₂ as the handout.
- Press **Step** once. Show the three arrows (grey inertia, blue cognitive, orange social) and read one line of the hand-calculation tape: "v₁₁ = 0.4752 + 2×0.34×0 + 2×0.86×(1.64 − 2.7045) = −1.3557, same as the handout."
- Step to particle 1's second component and say: "The handout prints −5.35 here, but 2×0.91×(1.3202 − 4.8030) is −6.34, so the correct value is −5.64. SoftLab caught that slip." Scroll to **Checked against the textbook** and show the ✎ book slip row with its explanation.
- Press **Back** to show rewind, then switch to **Rastrigin, 12 particles**, press **Play**, and drag the speed slider. Switch topology to ring to show it explores longer.

## 1:45–2:45 · Artificial Bee Colony
- Open **Bee Colony** (slides example). Step through bee 1: "φ = 0.81 sends it to 7.67, which is clamped to 5. f = 26 is worse, so it's rejected and the trial counter goes to 1, as on the slides."
- Step into the onlooker phase. Show the dance-floor bars with the black tick for r = 0.39 < 0.729.
- Step to the scout: the source with trial 2 > limit 1 is abandoned (arrow from the ghost to the new spot). Mention the slide's sign slip (−0.8 vs +0.8).

## 2:45–3:15 · Race
- Open **Race**, press Play: PSO vs ABC on Rastrigin, compared per function evaluation. Switch to Himmelblau and change the seed to show a single race proves little.

## 3:15–3:35 · Wrap-up
- Open **Verification**: "28 values match the course material and 5 are slips in the sources, confirmed by recomputation. It's a static site, it runs offline, and the repo README has the full list."
