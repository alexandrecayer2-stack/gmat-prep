#!/usr/bin/env node
// Independent re-derivation for content/questions/*-12.json (batch 12, "g4" set,
// imported from gmat_batch_001.json). Every Problem Solving and Data Sufficiency
// answer is recomputed from scratch and compared to the labeled answer. Six DS
// answers were wrong in the raw source and corrected on import (see OVERRIDES in
// transform-batch12.mjs); this script encodes the CORRECT sufficiency and so
// guards those corrections. Critical Reasoning is judgement-based and only counted.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const load = (f) => JSON.parse(readFileSync(resolve(root, 'content', 'questions', f), 'utf8'));

const quant = load('quant-12.json');
const verbal = load('verbal-12.json');
const di = load('data_insights-12.json');

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
function parseNum(t) {
  t = String(t).replace(/\$/g, '').replace(/percent|hours?|mph/gi, '').replace(/%/g, '').trim();
  const m = t.match(/^([-+]?\d+)\s*[/:]\s*([-+]?\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  if (/^[-+]?\d+(\.\d+)?$/.test(t)) return Number(t);
  return NaN;
}

const ps = Object.fromEntries(quant.map((q) => [q.id, q]));
const dsM = Object.fromEntries(di.map((q) => [q.id, q]));
const qid = (n) => `g4-quant-${pad2(n)}`;

// derived numeric value matches exactly one labeled choice
function expectVal(n, value) {
  const q = ps[qid(n)];
  const matches = q.choices.filter((c) => approx(parseNum(c.text), value));
  check(qid(n), matches.length === 1 ? matches[0].key : `ambiguous/none(${value})`, q.correctAnswer.value);
}
// derived answer matches a labeled choice by exact text (for ratio choices like
// 9:10 that share a numeric value with an unreduced distractor 18:20)
function expectText(n, text) {
  const q = ps[qid(n)];
  const c = q.choices.find((ch) => ch.text === text);
  check(qid(n), c ? c.key : `no-text(${text})`, q.correctAnswer.value);
}

// ── Problem Solving (12) ───────────────────────────────────────────────────────
expectVal(1, (1.2 * 0.75 - 1) * 100); // +20% then -25% => 0.90 => -10% (A)
expectText(2, '$9:10$'); // y=12 => x=9, z=10 => x:z = 9:10 (A)
expectVal(3, (15 + 7) / (6 - 4)); // 3(2x-5)=4x+7 => x=11 (C)
expectVal(4, (12 * 9) / 2); // 54 (D)
expectVal(5, 8 / 10); // P(not blue)=8/10=4/5 (D)
expectVal(6, (2 ** 3 * 4 ** 2) / 8); // 16 (B)
expectVal(7, 5 * 12 - 4 * 10); // 20 (C)
expectVal(8, 24 / 7); // 1/6+1/8=7/24 per hr => 24/7 hours (B)
expectVal(9, (7 ** 10) % 6); // 7≡1 mod6 => 1 (B)
expectVal(10, (11 - 3) / (6 - 2)); // slope 2 (B)
expectVal(11, Math.sqrt(10 ** 2 - 6 ** 2)); // 8 (D)
expectVal(12, 7 * 80 - 6 * 78); // 92 (D)

// ── Data Sufficiency (54) ──────────────────────────────────────────────────────
const dsLetter = (s1, s2, both) => (s1 && s2 ? 'D' : s1 ? 'A' : s2 ? 'B' : both ? 'C' : 'E');
// [statement-1 alone sufficient, statement-2 alone sufficient, both together sufficient]
const DS = {
  1: [true, false, true], 2: [true, false, true], 3: [false, false, true], 4: [false, false, true],
  5: [true, false, true], 6: [false, false, false], 7: [false, true, true], 8: [true, false, true],
  9: [true, true, true], 10: [false, false, true], 11: [true, true, true], 12: [true, true, true],
  13: [true, false, true], 14: [true, true, true], 15: [false, false, true], 16: [true, false, true],
  17: [false, false, true], 18: [true, true, true], 19: [true, false, true], 20: [true, true, true],
  21: [false, false, true], 22: [true, false, true], 23: [false, true, true], 24: [true, true, true],
  25: [true, false, true], 26: [true, false, true], 27: [false, false, false], 28: [false, false, false],
  29: [true, true, true], 30: [false, false, true], 31: [true, false, true], 32: [true, false, true],
  33: [true, true, true], 34: [true, false, true], 35: [true, false, true], 36: [true, true, true],
  37: [false, false, true], 38: [true, true, true], 39: [false, false, false], 40: [true, false, true],
  41: [true, true, true], 42: [true, false, true], 43: [false, true, true], 44: [true, false, true],
  45: [true, false, true], 46: [false, false, false], 47: [true, false, true], 48: [true, false, true],
  49: [true, false, true], 50: [true, false, true], 51: [true, false, true], 52: [true, false, true],
  53: [true, true, true], 54: [false, false, true],
};
for (let n = 1; n <= 54; n++) {
  const id = `g4-ds-${pad2(n)}`;
  check(id, dsLetter(...DS[n]), dsM[id].correctAnswer.value);
}

// ── Coverage ───────────────────────────────────────────────────────────────────
check('count-ps', quant.filter((q) => q.type === 'problem_solving').length, 12);
check('count-cr', verbal.filter((q) => q.type === 'critical_reasoning').length, 34);
check('count-ds', di.filter((q) => q.type === 'data_sufficiency').length, 54);

// ── Summary ────────────────────────────────────────────────────────────────────
const total = pass + fail;
if (fail > 0) {
  console.error(`\ncheck-batch12: ${fail}/${total} FAILED`);
  process.exit(1);
} else {
  console.log(`check-batch12: all ${total} re-derivations passed (CR judgement-based, not re-derived)`);
}
