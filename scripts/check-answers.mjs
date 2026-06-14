// Independent re-derivation of every numeric/derivable seed answer.
// Zod validates structure; this validates that the labeled answers are CORRECT.
// Run: node scripts/check-answers.mjs
import { readFileSync } from 'node:fs';

const root = new URL('../content/', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const quant = read('questions/quant.json');
const di = read('questions/data_insights.json');

const byId = (arr, id) => {
  const q = arr.find((x) => x.id === id);
  if (!q) throw new Error(`missing question ${id}`);
  return q;
};
const correctChoiceText = (q) => {
  const c = (q.choices ?? []).find((c) => c.key === q.correctAnswer.value);
  if (!c) throw new Error(`${q.id}: correct key ${q.correctAnswer.value} not in choices`);
  return c.text;
};
const numIn = (s) => Number(String(s).replace(/[^0-9.]/g, ''));

let fails = 0;
const check = (name, expected, actual) => {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}: expected ${JSON.stringify(expected)}, labeled ${JSON.stringify(actual)}`);
};

// ---- Quant ----
check('percent', 40 * (1 - 0.25), numIn(correctChoiceText(byId(quant, 'quant-easy-percent-1'))));
check('average sum', 12 * 5, numIn(correctChoiceText(byId(quant, 'quant-easy-average-1'))));
check('ratio boys', (20 / 5) * 3, numIn(correctChoiceText(byId(quant, 'quant-easy-ratio-1'))));
check('n^2|72 -> 12', 12, numIn(correctChoiceText(byId(quant, 'quant-medium-numprop-1'))));
check('avg speed', 240 / (120 / 40 + 120 / 60), numIn(correctChoiceText(byId(quant, 'quant-medium-rate-1'))));
// coins: n+d=32, 5n+10d=250
(() => {
  let dimes = null;
  for (let d = 0; d <= 32; d++) {
    const n = 32 - d;
    if (5 * n + 10 * d === 250) dimes = d;
  }
  check('coins dimes', 18, dimes);
  check('coins label', 18, numIn(correctChoiceText(byId(quant, 'quant-medium-word-1'))));
})();
// probability: 1 - C(4,3)/C(7,3)
const C = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return Math.round(r); };
check('prob at least one woman', '31/35', `${C(7, 3) - C(4, 3)}/${C(7, 3)}`);
check('prob label', '31/35', correctChoiceText(byId(quant, 'quant-hard-prob-1')).trim());
check('work hours', 1 / (1 / 6 + 1 / 4 - 1 / 12), numIn(correctChoiceText(byId(quant, 'quant-hard-work-1'))));
// exponents: 3x+2 = 4x-4
check('exponent x', 6, numIn(correctChoiceText(byId(quant, 'quant-hard-exponent-1'))));

// ---- Data Insights ----
// Table: per-capita consistency + statement s2 count
(() => {
  const t = byId(di, 'di-medium-table-1');
  const rows = t.assets.table.rows;
  for (const r of rows) {
    check(`perCapita ${r.country}`, (r.gdp / r.population) * 1000, r.perCapita);
  }
  const atLeast20k = rows.filter((r) => r.perCapita >= 20000).length;
  check('s2 (>half >=20k)', true, atLeast20k > rows.length / 2);
  // s1: highest GDP also highest perCapita?
  const maxGdp = rows.reduce((a, b) => (b.gdp > a.gdp ? b : a));
  const maxPc = rows.reduce((a, b) => (b.perCapita > a.perCapita ? b : a));
  check('s1 (highGDP==highPC)', false, maxGdp.country === maxPc.country);
  // s3: smallest pop has highest perCapita?
  const minPop = rows.reduce((a, b) => (b.population < a.population ? b : a));
  check('s3 (smallPop==highPC)', false, minPop.country === maxPc.country);
  check('table answer', { s1: 'False', s2: 'True', s3: 'False' }, t.correctAnswer.value);
})();
// Two-part: R = 3u + 12
(() => {
  const q = byId(di, 'di-hard-twopart-1');
  const txt = (key) => q.choices.find((c) => c.key === key).text;
  const unitsForR48 = (48 - 12) / 3;
  const revForU20 = 3 * 20 + 12;
  check('two-part units', unitsForR48, numIn(txt(q.correctAnswer.value.partA)));
  check('two-part revenue', revForU20, numIn(txt(q.correctAnswer.value.partB)));
})();
// Graphics: monotonic increasing => positive; point at hours=5
(() => {
  const q = byId(di, 'di-medium-graphics-1');
  const data = q.assets.chart.data;
  let increasing = true;
  for (let i = 1; i < data.length; i++) if (data[i].score <= data[i - 1].score) increasing = false;
  check('graphics correlation', 'positive', increasing ? 'positive' : 'other');
  check('graphics b1 label', 'positive', q.correctAnswer.value.b1);
  const at5 = data.find((d) => d.hours === 5).score;
  check('graphics score@5', at5, numIn(q.correctAnswer.value.b2));
})();
// DS2: only even-even factor pair of 12 with x<y => sum unique
(() => {
  const pairs = [];
  for (let x = 1; x <= 12; x++) if (12 % x === 0) { const y = 12 / x; if (x % 2 === 0 && y % 2 === 0 && x < y) pairs.push([x, y]); }
  check('DS2 unique even pair', 1, pairs.length);
  check('DS2 answer is C', 'C', byId(di, 'di-hard-ds-1').correctAnswer.value);
})();

console.log(fails === 0 ? '\nALL ANSWER CHECKS PASSED' : `\n${fails} ANSWER CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
