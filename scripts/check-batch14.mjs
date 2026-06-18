#!/usr/bin/env node
// Independent re-derivation for content/questions/*-14.json (batch 14, "g6" set,
// imported from gmat_batch-14.json). Every Problem Solving value and Data
// Sufficiency verdict is recomputed from scratch and compared to the stored
// answer. Critical Reasoning is judgement-based and only counted.
//
// Source fixes verified here (see transform-batch14.mjs):
//   - DS-017 → g6-ds-17: only (1) x+y=12 gives the sum, so A (source said D).
//   - DS-003 → g6-ds-03: statement (1) reworded to "a positive integer less than
//     4" ({1,2,3}); neither alone, both together give z=2 → C.
//   - Dropped on import as duplicates: QR-001 (= existing g5-quant-01) and
//     DS-032 (= DS-012), so g6 ids are contiguous over the kept items.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const load = (f) => JSON.parse(readFileSync(resolve(root, 'content', 'questions', f), 'utf8'));

const quant = load('quant-14.json');
const verbal = load('verbal-14.json');
const di = load('data_insights-14.json');

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
const median = (xs) => [...xs].sort((a, b) => a - b)[(xs.length - 1) / 2];

// Parse a choice label to a number across this batch's answer formats:
// integers, fractions (a/b), currency ($), percentages, degrees (°), multiples
// of π, "X mph", and time like "3 hours 45 minutes".
function parseAns(t) {
  t = String(t).trim();
  if (/hour/i.test(t)) {
    const h = t.match(/(\d+)\s*hours?/i);
    const m = t.match(/(\d+)\s*minutes?/i);
    return (h ? Number(h[1]) : 0) + (m ? Number(m[1]) / 60 : 0);
  }
  if (/π|\bpi\b/i.test(t)) {
    const m = t.match(/-?\d+(?:\.\d+)?/);
    return (m ? Number(m[0]) : 1) * Math.PI;
  }
  let s = t
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/°/g, '')
    .replace(/percent|miles per hour|mph|widgets?|minutes?/gi, '')
    .replace(/%/g, '')
    .trim();
  const fr = s.match(/^(-?\d+)\s*[/:]\s*(-?\d+)$/);
  if (fr) return Number(fr[1]) / Number(fr[2]);
  if (/^-?\d+(?:\.\d+)?$/.test(s)) return Number(s);
  return NaN;
}

const ps = Object.fromEntries(quant.map((q) => [q.id, q]));
const qid = (n) => `g6-quant-${pad2(n)}`;
function expectVal(n, value) {
  const q = ps[qid(n)];
  const matches = q.choices.filter((c) => approx(parseAns(c.text), value));
  check(qid(n), matches.length === 1 ? matches[0].key : `ambiguous/none(${value})`, q.correctAnswer.value);
}

// ── Problem Solving (32) ───────────────────────────────────────────────────────
expectVal(1, (31 - 7) / 3); // 3x+7=31 => x=8 (C)
expectVal(2, (3 / 8) * 40); // apples 3:5 of 40 => 15 (B)
expectVal(3, (3 / 4) * 28); // 21 (C)
expectVal(4, 12 * 7); // rectangle area 84 (E)
expectVal(5, 1 / (1 / 6 + 1 / 10)); // 3.75 h = 3h45 (B)
expectVal(6, 4 * 15 - (12 + 14 + 16)); // fourth number 18 (E)
expectVal(7, 2 ** (3 + 4)); // 2^7 = 128 (D)
expectVal(8, 180 - 35 - 75); // third angle 70° (D)
expectVal(9, 2 / 4); // P(exactly one head) = 1/2 (B)
expectVal(10, 150 / 50); // 3 hours (A)
expectVal(11, median([2, 5, 7, 9, 11])); // 7 (C)
expectVal(12, 80 * (1 - 0.3)); // sale price $56 (C)
expectVal(13, (10 - 4) * 3); // x/3+4=10 => x=18 (E)
expectVal(14, 54 * 3); // geometric, next term 162 (C)
expectVal(15, 4 * 9); // square perimeter 36 (B)
expectVal(16, Math.hypot(6, 8)); // distance 10 (A)
expectVal(17, 3 / 10); // P(red) = 3/10 (A)
expectVal(18, 39 / 3); // middle of 3 consecutive ints summing 39 => 13 (D)
expectVal(19, (9 + 5) / (2 - 1)); // 2x-5=x+9 => x=14 (E)
expectVal(20, 2 * Math.PI * 3); // circumference 6π (C)
expectVal(21, 2000 * 0.05 * 2); // simple interest $200 (E)
expectVal(22, 20 + 15 - 5); // |music ∪ art| = 30 (D)
expectVal(23, (2 * 40 * 60) / (40 + 60)); // harmonic mean 48 mph (E)
expectVal(24, Math.sqrt(4)); // positive root of (x-2)(x+2)=0 => 2 (A)
expectVal(25, 17 % 5); // remainder 2 (B)
expectVal(26, 2 ** 2); // area scales by 2^2 = 4 (C)
expectVal(27, 5 * 4 * 3); // 5P3 = 60 (E)
expectVal(28, 1 - (1 / 2) ** 2); // P(at least one head) = 3/4 (D)
expectVal(29, (12 / 3) * 5); // 4 widgets/h × 5h = 20 (B)
expectVal(30, 250 * (1 - 0.4)); // remaining after spending 40% => $150 (C)
expectVal(31, (10 + 4) / 2); // x+y=10, x-y=4 => x=7 (C)
expectVal(32, 3 ** 3); // volume scales by 3^3 = 27 (D)

// ── Data Sufficiency (32) ──────────────────────────────────────────────────────
const dsLetter = (s1, s2, both) => (s1 && s2 ? 'D' : s1 ? 'A' : s2 ? 'B' : both ? 'C' : 'E');
// [statement-1 alone sufficient, statement-2 alone sufficient, both together sufficient]
const DS = {
  1: [true, false, true], 2: [false, true, true], 3: [false, false, true], 4: [true, true, true],
  5: [true, false, true], 6: [false, false, true], 7: [false, true, true], 8: [true, true, true],
  9: [true, false, true], 10: [true, false, true], 11: [true, false, true], 12: [true, false, true],
  13: [false, true, true], 14: [true, false, true], 15: [false, false, true], 16: [false, false, true],
  17: [true, false, true], 18: [true, false, true], 19: [true, true, true], 20: [true, false, true],
  21: [false, true, true], 22: [false, false, true], 23: [true, true, true], 24: [true, false, true],
  25: [false, false, false], 26: [false, false, false], 27: [false, false, true], 28: [true, false, true],
  29: [false, false, true], 30: [true, true, true], 31: [true, false, true], 32: [true, true, true],
};
const dsM = Object.fromEntries(di.map((q) => [q.id, q]));
for (let n = 1; n <= 32; n++) {
  const id = `g6-ds-${pad2(n)}`;
  check(id, dsLetter(...DS[n]), dsM[id].correctAnswer.value);
}

// ── Coverage ───────────────────────────────────────────────────────────────────
check('count-ps', quant.filter((q) => q.type === 'problem_solving').length, 32);
check('count-cr', verbal.filter((q) => q.type === 'critical_reasoning').length, 33);
check('count-ds', di.filter((q) => q.type === 'data_sufficiency').length, 32);

const total = pass + fail;
if (fail > 0) {
  console.error(`\ncheck-batch14: ${fail}/${total} FAILED`);
  process.exit(1);
} else {
  console.log(`check-batch14: all ${total} re-derivations passed (CR judgement-based, not re-derived)`);
}
