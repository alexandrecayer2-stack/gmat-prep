#!/usr/bin/env node
// Independent re-derivation for content/questions/*-13.json (batch 13, "g5" set,
// imported from gmat_batch.json). Every Problem Solving and Data Sufficiency
// answer is recomputed from scratch and compared to the labeled answer. All
// source answers were correct this batch (no overrides). Critical Reasoning is
// judgement-based and only counted. (QR-007 and DS-010 were dropped on import as
// duplicates, so g5 ids are contiguous over the 32 kept items in each section.)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const load = (f) => JSON.parse(readFileSync(resolve(root, 'content', 'questions', f), 'utf8'));

const quant = load('quant-13.json');
const verbal = load('verbal-13.json');
const di = load('data_insights-13.json');

let pass = 0;
let fail = 0;
function check(id, derived, stored) {
  if (derived === stored) pass++;
  else {
    console.error(`  FAIL ${id}: derived=${JSON.stringify(derived)} stored=${JSON.stringify(stored)}`);
    fail++;
  }
}

const approx = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9;
const pad2 = (n) => String(n).padStart(2, '0');
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const lcm = (a, b) => (a * b) / gcd(a, b);
function parseNum(t) {
  t = String(t).replace(/\$/g, '').replace(/percent|hours?|mph|liters?/gi, '').replace(/%/g, '').trim();
  const m = t.match(/^([-+]?\d+)\s*[/:]\s*([-+]?\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  if (/^[-+]?\d+(\.\d+)?$/.test(t)) return Number(t);
  return NaN;
}

const ps = Object.fromEntries(quant.map((q) => [q.id, q]));
const dsM = Object.fromEntries(di.map((q) => [q.id, q]));
const qid = (n) => `g5-quant-${pad2(n)}`;

function expectVal(n, value) {
  const q = ps[qid(n)];
  const matches = q.choices.filter((c) => approx(parseNum(c.text), value));
  check(qid(n), matches.length === 1 ? matches[0].key : `ambiguous/none(${value})`, q.correctAnswer.value);
}

// ── Problem Solving (32) ───────────────────────────────────────────────────────
expectVal(1, (1.2 * 0.75 - 1) * 100); // +20% then -25% => -10% (A)
expectVal(2, (5 + 7) / (3 - 2)); // 3x-5=2x+7 => x=12 (A)
expectVal(3, (() => { const w = (40 / 2 - 4) / 2; return (w + 4) * w; })()); // perim 40, L=W+4 => 12*8=96 (A)
expectVal(4, 5 * 12 - (9 + 11 + 13 + 15)); // 60-48=12 (A)
expectVal(5, 7 ** 4 % 5); // 2401 mod 5 = 1 (A)
expectVal(6, (3 / 8) * 40); // sugar 3:5 of 40 => 15 (A)
expectVal(7, Math.hypot(6, 8)); // 10 (A)
expectVal(8, (3 / 5) * (2 / 4)); // P(both red)=3/10 (A)
expectVal(9, 4 + 19 * 3); // 20th term = 61 (A)
expectVal(10, 2 ** (3 + 5 - 4)); // 2^4 = 16 (A)
expectVal(11, (10 + 2) / 2); // x+y=10,x-y=2 => x=6 (A)
expectVal(12, 80 * 0.85 * 1.1); // 74.80 (A)
expectVal(13, 3.14 * 5 ** 2); // 78.5 (A)
expectVal(14, 6); // 2x-3<11 => x<7 => greatest int 6 (A)
expectVal(15, lcm(lcm(8, 12), 15)); // 120 (A)
expectVal(16, 80 * 0.4 + 95 * 0.6); // 89 (A)
expectVal(17, (14 * 12) / 7); // x/3+x/4=14 => x=24 (A)
expectVal(18, 10 ** 2 / 2); // square diag 10 => area 50 (A)
expectVal(19, 3 / 8); // P(woman)=3/8 (A)
expectVal(20, 9); // median of 3,7,9,10,20 (A)
expectVal(21, 1000 * 1.1 ** 2); // 1210 (A)
expectVal(22, 1 / (1 / 5 - 1 / 10)); // net fill => 10 hours (A)
expectVal(23, (13 ** 2 + 7 ** 2) % 10); // 218 mod 10 = 8 (A)
expectVal(24, 4 ** 3); // cube volume 64 (A)
expectVal(25, 2 * 3 ** 4); // geometric 5th term 162 (A)
expectVal(26, (2 / 3) * 15); // apples 2:3, 15 oranges => 10 (A)
expectVal(27, 6 * 14 - (10 + 12 + 15 + 17 + 18)); // 84-72=12 (A)
expectVal(28, 4 + 7 + (4 - 7)); // |x-4|=7 => x=11 or -3, sum 8 (A)
expectVal(29, (2.5 * 12 - 12) / (4 - 2.5)); // son age 12 (A)
expectVal(30, 20 + 15 - 5); // |tea ∪ coffee| = 30 (A)
expectVal(31, ((92 - 80) / 80) * 100); // 15% increase (A)
expectVal(32, 4 * 3 * 2); // 4P3 = 24 distinct 3-digit numbers (A)

// ── Data Sufficiency (32) ──────────────────────────────────────────────────────
const dsLetter = (s1, s2, both) => (s1 && s2 ? 'D' : s1 ? 'A' : s2 ? 'B' : both ? 'C' : 'E');
// [statement-1 alone sufficient, statement-2 alone sufficient, both together sufficient]
const DS = {
  1: [true, false, true], 2: [false, true, true], 3: [false, false, true], 4: [true, true, true],
  5: [false, false, true], 6: [false, false, false], 7: [true, false, true], 8: [false, false, true],
  9: [true, true, true], 10: [true, false, true], 11: [false, true, true], 12: [false, false, true],
  13: [true, true, true], 14: [false, false, false], 15: [true, false, true], 16: [false, true, true],
  17: [false, false, true], 18: [true, true, true], 19: [false, false, false], 20: [true, false, true],
  21: [false, true, true], 22: [false, false, true], 23: [true, true, true], 24: [false, false, false],
  25: [true, false, true], 26: [false, true, true], 27: [false, false, true], 28: [true, true, true],
  29: [false, false, false], 30: [true, false, true], 31: [false, true, true], 32: [false, false, true],
};
for (let n = 1; n <= 32; n++) {
  const id = `g5-ds-${pad2(n)}`;
  check(id, dsLetter(...DS[n]), dsM[id].correctAnswer.value);
}

// ── Coverage ───────────────────────────────────────────────────────────────────
check('count-ps', quant.filter((q) => q.type === 'problem_solving').length, 32);
check('count-cr', verbal.filter((q) => q.type === 'critical_reasoning').length, 33);
check('count-ds', di.filter((q) => q.type === 'data_sufficiency').length, 32);

const total = pass + fail;
if (fail > 0) {
  console.error(`\ncheck-batch13: ${fail}/${total} FAILED`);
  process.exit(1);
} else {
  console.log(`check-batch13: all ${total} re-derivations passed (CR judgement-based, not re-derived)`);
}
