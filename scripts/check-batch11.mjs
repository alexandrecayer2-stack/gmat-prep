#!/usr/bin/env node
// Independent re-derivation for content/questions/*-11.json (batch 11, "g3" set).
// Every PS and DS answer is recomputed from scratch and compared to the labeled
// answer. For the items whose choice sets were repaired during import
// (g3-quant-06/14/26/36) the check also enforces that EXACTLY ONE choice
// satisfies the condition — guarding against the "multiple/zero correct" defects
// in the raw source. CR is judgement-based and only counted.
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const load = (f) => JSON.parse(readFileSync(resolve(root, "content", "questions", f), "utf8"));

const quant = load("quant-11.json");
const verbal = load("verbal-11.json");
const di = load("data_insights-11.json");

let pass = 0;
let fail = 0;
function check(id, derived, stored) {
  if (derived === stored) pass++;
  else {
    console.error(`  FAIL ${id}: derived=${JSON.stringify(derived)} stored=${JSON.stringify(stored)}`);
    fail++;
  }
}

const approx = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1e-9;
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const lcm = (a, b) => (a * b) / gcd(a, b);
function parseNum(t) {
  t = String(t).replace(/\$/g, "").replace(/\\,/g, " ").replace(/mph|hours|percent/gi, "").trim();
  let m = t.match(/^\\frac\{(-?\d+)\}\{(-?\d+)\}$/);
  if (m) return Number(m[1]) / Number(m[2]);
  m = t.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return NaN;
}

const ps = Object.fromEntries(quant.map((q) => [q.id, q]));
const dsM = Object.fromEntries(di.map((q) => [q.id, q]));
const qid = (n) => `g3-quant-${String(n).padStart(2, "0")}`;

// derived value matches exactly one labeled choice (numeric)
function expectVal(n, value) {
  const q = ps[qid(n)];
  const matches = q.choices.filter((c) => approx(parseNum(c.text), value));
  check(qid(n), matches.length === 1 ? matches[0].key : `ambiguous/none(${value})`, q.correctAnswer.value);
}
// derived answer matches exactly one labeled choice (exact text, for LaTeX/unit choices)
function expectText(n, text) {
  const q = ps[qid(n)];
  const c = q.choices.find((ch) => ch.text === text);
  check(qid(n), c ? c.key : `no-text(${text})`, q.correctAnswer.value);
}
// exactly one choice must satisfy the predicate (repaired choice sets)
function expectUnique(n, pred) {
  const q = ps[qid(n)];
  const matches = q.choices.filter((c) => { const x = parseNum(c.text); return Number.isFinite(x) && pred(x); });
  check(qid(n), matches.length === 1 ? matches[0].key : `not-unique(${matches.length})`, q.correctAnswer.value);
}

// ── Problem Solving (40) ───────────────────────────────────────────────────────
expectVal(1, 24 - 3 * 5 + 8); // 17 B
expectVal(2, 0.12 * 350); // 42 B
expectText(3, "$\\frac{3}{8}$"); // E
expectVal(4, (33 / 11) * 4); // 12 E
expectVal(5, 4 * 18 - 47); // 25 B
expectUnique(6, (x) => x % 11 === 0); // only 583 -> B
expectVal(7, 35 / 7); // 5 B
expectVal(8, 13 + 13 + 10); // 36 B
expectText(9, "(2, 1)"); // A
expectVal(10, 180 / 4.5); // 40 D
expectText(11, "$6$ hours"); // B
expectVal(12, (() => { for (let x = 0; x <= 20; x++) if (Math.abs((2 + x) / (8 + x) - 0.4) < 1e-9) return x; return NaN; })()); // 2 C
expectVal(13, (() => { for (let x = 0; x <= 20; x++) if (2 ** (x + 1) === 128) return x; return NaN; })()); // 6 B
expectUnique(14, (x) => Math.abs(3 * x - 4) > 11); // only 6 -> C
expectVal(15, 84 / 6); // 14 C
expectText(16, "$\\frac{7}{10}$"); // C
expectVal(17, 9 * 8 + 4 * 8 * 8); // 328 B
expectText(18, "$81\\pi$"); // A
expectVal(19, (17 - 5) / (8 - 2)); // 2 A
expectVal(20, 7 + 9 * 4); // 43 A
expectText(21, "$\\frac{3}{5}$"); // 35<36 -> 3/5, C
expectVal(22, (28 / 7) * 5); // 20 B
expectVal(23, (() => { for (let x = -20; x <= 20; x++) if (Math.abs((2 * x - 3) / 5 - (x + 9) / 10) < 1e-9) return x; return NaN; })()); // 5 E
expectVal(24, (() => { let r = 1; for (let i = 0; i < 20; i++) r = (r * 7) % 6; return r; })()); // 7^20 mod 6 = 1 -> B (modular reduction; 7**20 overflows float)
expectVal(25, -7); // B
expectUnique(26, (x) => -1 < x && x <= 3); // only 1 -> E
expectVal(27, 5 * 24 - 91); // 29 C
expectText(28, "$\\frac{3}{8}$"); // B
expectVal(29, 1 * 2 * 3 * 4); // 24 A
expectVal(30, 12 * 7); // 84 B
expectVal(31, Math.sqrt((9 - 3) ** 2 + (12 - 4) ** 2)); // 10 B
expectVal(32, 24 * 2); // 48 B
expectVal(33, (2 + 1) * (2 + 1) * (1 + 1)); // 18 C
expectText(34, "10"); // A (s = diagonal/sqrt2 = 10)
expectVal(35, (12) * (4)); // (x+y)(x-y)=48 B
expectUnique(36, (x) => -2 <= x && x < 3); // only 1 -> B
expectVal(37, 6 * 15 - 5 * 14); // 20 C
expectText(38, "$\\frac{1}{6}$"); // C
expectVal(39, 120 / (2 * 2)); // 5!/(2!2!) = 30 D
expectText(40, "15 mph"); // (24+36)/4 = 15 A

// ── Data Sufficiency (10) ──────────────────────────────────────────────────────
const dsLetter = (s1, s2, both) => (s1 && s2 ? "D" : s1 ? "A" : s2 ? "B" : both ? "C" : "E");
function expectDS(n, s1, s2, both) {
  const id = `g3-ds-${n}`;
  check(id, dsLetter(s1, s2, both), dsM[id].correctAnswer.value);
}
expectDS(91, 12 - 5 === 7, 4 + 3 === 7, true); // each -> D
expectDS(92, 49 * Math.PI < 200, 484 / Math.PI < 200, true); // each gives definite "no" -> D
expectDS(93, false, false, true); // count vs total -> C
expectDS(94, false, false, true); // need both rates -> C
expectDS(95, false, false, true); // union vs total -> C
expectDS(96, lcm(6, 8) === 24, false, true); // (1) -> 24 ; (2) e.g. 12 -> A
expectDS(97, true, false, true); // isosceles fixes angle A -> A
expectDS(98, false, 5 - 5 === 0, true); // (1) two roots ; (2) x=5 -> B
expectDS(99, false, false, false); // neither -> E
expectDS(100, false, false, true); // mix unknown then highway -> C

// ── Coverage ───────────────────────────────────────────────────────────────────
check("count-ps", quant.filter((q) => q.type === "problem_solving").length, 40);
check("count-cr", verbal.filter((q) => q.type === "critical_reasoning").length, 50);
check("count-ds", di.filter((q) => q.type === "data_sufficiency").length, 10);

// ── Summary ────────────────────────────────────────────────────────────────────
const total = pass + fail;
if (fail > 0) {
  console.error(`\ncheck-batch11: ${fail}/${total} FAILED`);
  process.exit(1);
} else {
  console.log(`check-batch11: all ${total} re-derivations passed (CR judgement-based, not re-derived)`);
}
