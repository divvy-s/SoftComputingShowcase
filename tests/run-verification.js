/* Runs every textbook / hand-calculation check headlessly.
 * Usage: node tests/run-verification.js      (exit code 1 if any check fails) */
const path = require('path');
const files = ['core.js', 'engines/pso.js', 'engines/abc.js', 'engines/ga.js', 'engines/fuzzy.js', 'engines/perceptron.js', 'engines/race.js', 'verify.js'];
for (const f of files) require(path.join(__dirname, '..', 'js', f));
const SC = globalThis.SC;

let fails = 0;
const mark = { pass: '✔ pass', slip: '✎ book slip', note: 'ℹ note', fail: '✘ FAIL' };
for (const check of SC.verifiers) {
  const r = check();
  console.log(`\n=== ${r.title}\n    source: ${r.source}`);
  for (const row of r.rows) {
    if (row.status === 'fail') fails++;
    console.log(`  ${mark[row.status].padEnd(12)} ${row.what}\n      book: ${row.book}\n      tool: ${row.tool}${row.note ? '\n      ' + row.note : ''}`);
  }
}

/* smoke test: every engine runs to completion without throwing and survives JSON snapshots */
const smoke = [
  ['pso', {}],
  ['pso', { topology: 'ring', gran: 'iteration' }],
  ['abc', {}],
  ['abc', { gran: 'cycle' }],
  ['ga', {}],
  ['ga', { sel: 'tournament' }],
  ['ga', { sel: 'rank', problem: 'quad', L: 8 }],
  ['fuzzy', { gran: 'stage', defuzz: 'mom' }],
  ['perceptron', { data: 'xor' }],
  ['perceptron', { data: 'blobs' }],
  ['race', { budget: 600 }],
];
for (const [k, p] of smoke) {
  const E = SC.engines[k];
  let st = E.create(p);
  let steps = 0;
  while (!st.done && steps < 5000) {
    E.step(st);
    st = JSON.parse(JSON.stringify(st)); // same round-trip the UI's step-back history uses
    steps++;
  }
  const ok = st.done;
  if (!ok) fails++;
  console.log(`smoke ${k} ${JSON.stringify(p)}: ${ok ? 'finished' : 'DID NOT FINISH'} in ${steps} steps`);
}
console.log(fails ? `\n${fails} FAILURE(S)` : '\nAll checks passed (book slips are differences in the source, confirmed by independent arithmetic).');
process.exit(fails ? 1 : 0);
