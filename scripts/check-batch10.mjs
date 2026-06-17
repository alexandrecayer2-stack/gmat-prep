#!/usr/bin/env node
// Independent re-derivation for content/questions/*-10.json (batch 10).
// Every computable answer (PS, DS, GI, TA, TP) is recomputed here from scratch
// — deliberately NOT by reading the stored answer, but by solving the item — and
// compared against the labeled answer. CR/RC are judgement-based and only counted.
//
// Run standalone (`node scripts/check-batch10.mjs`) or via `npm run validate`,
// which executes every scripts/check-*.mjs as part of the content gate.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const load = (f) => JSON.parse(readFileSync(resolve(root, 'content', 'questions', f), 'utf8'));

const quant = load('quant-10.json');
const verbal = load('verbal-10.json');
const di = load('data_insights-10.json');

let pass = 0;
let fail = 0;
function check(id, derived, stored) {
  if (JSON.stringify(derived) === JSON.stringify(stored)) pass++;
  else {
    console.error(`  FAIL ${id}: derived=${JSON.stringify(derived)} stored=${JSON.stringify(stored)}`);
    fail++;
  }
}

const approx = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9;
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
function parseNum(t) {
  t = String(t).trim();
  if (/percent/i.test(t)) return parseFloat(t);
  const m = t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  if (/^-?\d+(?:\.\d+)?$/.test(t)) return Number(t);
  return NaN;
}

const ps = Object.fromEntries(quant.map((q) => [q.id, q]));
const byType = (t) => Object.fromEntries(di.filter((q) => q.type === t).map((q) => [q.id, q]));
const dsM = byType('data_sufficiency');
const giM = byType('graphics_interpretation');
const taM = byType('table_analysis');
const tpM = byType('two_part_analysis');

// ── Problem Solving: match the computed value to exactly one labeled choice ─────
function expectPS(n, value) {
  const id = `qd-quant-${String(n).padStart(2, '0')}`;
  const q = ps[id];
  const matches = q.choices.filter((c) => approx(parseNum(c.text), value));
  const derivedKey = matches.length === 1 ? matches[0].key : `ambiguous/none(${value})`;
  check(id, derivedKey, q.correctAnswer.value);
}
function expectPSText(n, text) {
  const id = `qd-quant-${String(n).padStart(2, '0')}`;
  const q = ps[id];
  const c = q.choices.find((ch) => ch.text === text);
  check(id, c ? c.key : `no-text(${text})`, q.correctAnswer.value);
}

expectPS(1, 250 * 0.7); // 175
expectPS(2, (4 / 7) * 84); // 48
expectPS(3, 5 * 22 - (18 + 20 + 25 + 19)); // 28
expectPS(4, (27 + 9) / 4); // 9
expectPS(5, 67 % 9); // 4
expectPS(6, 13 * 7); // 91
expectPS(7, Math.sqrt(36 + 64)); // 10
expectPS(8, 1 / (1 / 6 + 1 / 9)); // 3.6
expectPS(9, (0.2 * 5) / 0.1 - 5); // 5
expectPS(10, 3 ** 2 * 3 ** 4); // 729
expectPS(11, (() => { let c = 0; for (let x = -20; x <= 20; x++) if (-3 < 2 * x - 1 && 2 * x - 1 <= 5) c++; return c; })()); // 4
expectPS(12, (() => { const a = [5, 9, 9, 12, 14].slice().sort((x, y) => x - y); return a[(a.length - 1) / 2]; })()); // 9
expectPS(13, 5 + 9 * 4); // 41
expectPS(14, 2 / 4); // 1/2
expectPS(15, 5 * 4); // 20
expectPS(16, (2 / 5) * 60); // 24
expectPS(17, (180 / 3) * 5); // 300
expectPS(18, (2 + 1) * (1 + 1) * (1 + 1)); // 12
expectPS(19, (15 + 3) / 2); // 9
expectPS(20, (11 - 3) / (6 - 2)); // 2
expectPS(21, 180 - 40 - 75); // 65
expectPS(22, 2 * 5 * 6); // 60
expectPS(23, 100 * 1.2 * 0.8); // 96
expectPS(24, 12 + 5); // 17
expectPS(25, gcd(48, 72)); // 24
expectPS(26, 3 ** 17 % 10); // 3
expectPS(27, (() => { for (let x = 0; x <= 100; x++) if ((x + 2) / 4 > 3) return x; return NaN; })()); // 11
expectPS(28, 4 / (4 + 6)); // 2/5
expectPS(29, (8 * 7) / 2); // 28
expectPSText(30, 5 * 7 < 4 * 9 ? '4/7' : '5/9'); // 35<36 -> 4/7
expectPS(31, 1 / (1 / 12 + 1 / 6)); // 4
expectPS(32, (3 - 2) / (0.5 - 0.3)); // 5

// ── Data Sufficiency: derive the A–E letter from sufficiency of each statement ──
// A=stmt1, B=stmt2, C=both, D=each, E=neither.
const dsLetter = (s1, s2, both) => (s1 && s2 ? 'D' : s1 ? 'A' : s2 ? 'B' : both ? 'C' : 'E');
function expectDS(n, s1, s2, both) {
  const id = `qd-ds-${String(n).padStart(2, '0')}`;
  check(id, dsLetter(s1, s2, both), dsM[id].correctAnswer.value);
}
expectDS(1, 3 * 4 + 2 === 14, false, true); // (1) x=4; (2) x=±4 -> A
expectDS(2, false, true, true); // (1) n>=5 ambiguous at 5; (2) n>6 -> B
expectDS(3, false, false, 10 * (28 / 2 - 10) === 40); // need both -> C
expectDS(4, true, true, true); // each -> D
expectDS(5, false, false, false); // ranges only -> E
expectDS(6, false, false, Math.abs(1 / (1 / 10 + 1 / 15) - 6) < 1e-9); // both -> C
expectDS(7, 18 + 12 - 4 === 26, false, true); // (1) alone -> A
expectDS(8, 50 < 90 && 60 < 90 && 70 < 90, 80 < 90, true); // each -> D
expectDS(9, (-3) ** 3 === -27, false, true); // (1) x=-3 -> A
expectDS(10, false, 4 ** 3 === 64, true); // (2) x=4 -> B
expectDS(11, true, false, true); // (1) sum=44 -> A
expectDS(12, false, false, true); // both -> C
expectDS(13, false, false, true); // both (2 and 3) -> C
expectDS(14, 45 / 3 === 15, 30 / 2 === 15, true); // each -> D
expectDS(15, false, false, true); // both -> C
expectDS(16, false, false, false); // neither -> E

// ── Graphics Interpretation: recompute each blank from the chart data ───────────
const cell = (q, xVal, key) => {
  const ch = q.assets.chart;
  return ch.data.find((r) => r[ch.xKey] === xVal)[key];
};
const series = (q, key) => q.assets.chart.data.map((r) => r[key]);
function expectGI(n, b1, b2) {
  const id = `qd-gi-${String(n).padStart(2, '0')}`;
  const v = giM[id].correctAnswer.value;
  check(`${id}-b1`, approx(parseNum(v.b1), b1) ? 'ok' : `stored=${v.b1}`, 'ok');
  check(`${id}-b2`, approx(parseNum(v.b2), b2) ? 'ok' : `stored=${v.b2}`, 'ok');
}
expectGI(1, cell(giM['qd-gi-01'], 'Apr', 'units'), cell(giM['qd-gi-01'], 'Apr', 'units') - cell(giM['qd-gi-01'], 'Jan', 'units')); // 95, 55
expectGI(2, Math.max(...series(giM['qd-gi-02'], 'temp')), Math.max(...series(giM['qd-gi-02'], 'temp')) - Math.min(...series(giM['qd-gi-02'], 'temp'))); // 22, 10
expectGI(3, series(giM['qd-gi-03'], 'rev').reduce((a, b) => a + b, 0) / 4, cell(giM['qd-gi-03'], 'D', 'rev') / cell(giM['qd-gi-03'], 'A', 'rev')); // 35, 2.5
expectGI(4, cell(giM['qd-gi-04'], 'W3', 'subs'), cell(giM['qd-gi-04'], 'W4', 'subs') - cell(giM['qd-gi-04'], 'W1', 'subs')); // 40, 50
expectGI(5, cell(giM['qd-gi-05'], 'D3', 'defects'), ((cell(giM['qd-gi-05'], 'D1', 'defects') - cell(giM['qd-gi-05'], 'D3', 'defects')) / cell(giM['qd-gi-05'], 'D1', 'defects')) * 100); // 48, 60
expectGI(6, Math.max(...series(giM['qd-gi-06'], 'tickets')), Math.max(...series(giM['qd-gi-06'], 'tickets')) - Math.min(...series(giM['qd-gi-06'], 'tickets'))); // 240, 90
expectGI(7, series(giM['qd-gi-07'], 'rain').reduce((a, b) => a + b, 0), series(giM['qd-gi-07'], 'rain').reduce((a, b) => a + b, 0) / 4); // 110, 27.5
expectGI(8, cell(giM['qd-gi-08'], 'Q4', 'prod'), ((cell(giM['qd-gi-08'], 'Q4', 'prod') - cell(giM['qd-gi-08'], 'Q1', 'prod')) / cell(giM['qd-gi-08'], 'Q1', 'prod')) * 100); // 450, 125

// ── Table Analysis: recompute each True/False statement from the table rows ─────
const bool2 = (b) => (b ? 'True' : 'False');
function rows(id) { return taM[id].assets.table.rows; }
function expectTA(n, s1, s2, s3) {
  const id = `qd-ta-${String(n).padStart(2, '0')}`;
  const v = taM[id].correctAnswer.value;
  check(`${id}-s1`, bool2(s1), v.s1);
  check(`${id}-s2`, bool2(s2), v.s2);
  check(`${id}-s3`, bool2(s3), v.s3);
}
{
  const r = rows('qd-ta-01');
  const P = r.find((x) => x.store === 'P'), Q = r.find((x) => x.store === 'Q'), R = r.find((x) => x.store === 'R'), S = r.find((x) => x.store === 'S');
  expectTA(1, P.visitors === Math.max(...r.map((x) => x.visitors)), S.sales / S.visitors > 0.2, R.sales < P.sales);
}
{
  const r = rows('qd-ta-02');
  const M = r.find((x) => x.dept === 'Marketing'), H = r.find((x) => x.dept === 'HR'), I = r.find((x) => x.dept === 'IT');
  expectTA(2, M.spend <= M.budget, H.spend < H.budget, I.spend === I.budget);
}
{
  const r = rows('qd-ta-03');
  const A = r.find((x) => x.worker === 'Ana'), B = r.find((x) => x.worker === 'Ben'), C = r.find((x) => x.worker === 'Cara'), D = r.find((x) => x.worker === 'Dan');
  expectTA(3, C.hours === Math.max(...r.map((x) => x.hours)), B.hours * B.rate > C.hours * C.rate, D.rate === Math.max(...r.map((x) => x.rate)));
}
{
  const r = rows('qd-ta-04');
  const A = r.find((x) => x.site === 'A'), B = r.find((x) => x.site === 'B'), C = r.find((x) => x.site === 'C');
  expectTA(4, A.weekday > C.weekday, B.weekday + B.weekend > A.weekday + A.weekend, C.weekend === Math.max(...r.map((x) => x.weekend)));
}
{
  const r = rows('qd-ta-05');
  const rate = (x) => x.returns / x.units;
  const N = r.find((x) => x.region === 'North'), S = r.find((x) => x.region === 'South'), E = r.find((x) => x.region === 'East'), W = r.find((x) => x.region === 'West');
  expectTA(5, W.units === Math.max(...r.map((x) => x.units)), rate(S) === Math.min(...r.map(rate)), rate(N) > rate(E));
}
{
  const r = rows('qd-ta-06');
  const fr = (x) => x.fail / (x.pass + x.fail);
  const H = r.find((x) => x.course === 'History'), Sc = r.find((x) => x.course === 'Science'), Ma = r.find((x) => x.course === 'Math'), Ar = r.find((x) => x.course === 'Art');
  expectTA(6, fr(H) === 0.4, Sc.pass < Ma.pass, Ar.fail === Math.min(...r.map((x) => x.fail)));
}
{
  const r = rows('qd-ta-07');
  const tot = (x) => x.rent + x.utilities;
  const Feb = r.find((x) => x.month === 'Feb'), Mar = r.find((x) => x.month === 'Mar');
  expectTA(7, tot(Feb) === Math.max(...r.map(tot)), Mar.utilities < 200, new Set(r.map((x) => x.rent)).size > 1);
}
{
  const r = rows('qd-ta-08');
  const Red = r.find((x) => x.team === 'Red'), Blue = r.find((x) => x.team === 'Blue'), Green = r.find((x) => x.team === 'Green');
  expectTA(8, Blue.game1 === Math.max(...r.map((x) => x.game1)), Green.game1 + Green.game2 > Red.game1 + Red.game2, Red.game1 > Red.game2);
}
{
  const r = rows('qd-ta-09');
  const Wi = r.find((x) => x.item === 'Widget'), Ga = r.find((x) => x.item === 'Gadget'), Gi = r.find((x) => x.item === 'Gizmo');
  expectTA(9, Ga.stock < Ga.reorder, Wi.stock === Math.max(...r.map((x) => x.stock)), Gi.stock === Gi.reorder);
}
{
  const r = rows('qd-ta-10');
  const grow = (x) => (x.y2023 - x.y2020) / x.y2020;
  const Al = r.find((x) => x.city === 'Alpha'), Be = r.find((x) => x.city === 'Beta'), Ga = r.find((x) => x.city === 'Gamma');
  expectTA(10, Be.y2023 < Be.y2020, grow(Al) === 0.3, grow(Ga) > grow(Al));
}

// ── Two-Part Analysis: map the computed value to its row option key ─────────────
function tpKey(q, value) {
  const c = q.choices.find((ch) => Number(ch.text) === value);
  return c ? c.key : `no(${value})`;
}
function expectTP(n, va, vb) {
  const id = `qd-tp-${String(n).padStart(2, '0')}`;
  const q = tpM[id];
  check(`${id}-A`, tpKey(q, va), q.correctAnswer.value.partA);
  check(`${id}-B`, tpKey(q, vb), q.correctAnswer.value.partB);
}
expectTP(1, 3 + 5, 24 / 4); // 8, 6
expectTP(2, 2 * 5, 14 - 6); // 10, 8
expectTP(3, 36 / 6, 2 ** 2 + 8); // 6, 12
expectTP(4, 20 - 2 * 8, 60 / 6); // 4, 10
expectTP(5, 3 * 4, Math.sqrt(64)); // 12, 8
expectTP(6, 18 / 3, 5 + 5); // 6, 10
expectTP(7, 2 * 2, 48 / 4); // 4, 12
expectTP(8, 30 - 22, 18 / 3 + 4); // 8, 10

// ── Coverage sanity: expected counts per type ──────────────────────────────────
const counts = {
  quant_ps: quant.filter((q) => q.type === 'problem_solving').length,
  cr: verbal.filter((q) => q.type === 'critical_reasoning').length,
  rc: verbal.filter((q) => q.type === 'reading_comprehension').length,
  ds: Object.keys(dsM).length,
  gi: Object.keys(giM).length,
  ta: Object.keys(taM).length,
  tp: Object.keys(tpM).length,
};
const expected = { quant_ps: 32, cr: 14, rc: 12, ds: 16, gi: 8, ta: 10, tp: 8 };
for (const k of Object.keys(expected)) check(`count-${k}`, counts[k], expected[k]);

// ── Summary ────────────────────────────────────────────────────────────────────
const total = pass + fail;
if (fail > 0) {
  console.error(`\ncheck-batch10: ${fail}/${total} FAILED`);
  process.exit(1);
} else {
  console.log(`check-batch10: all ${total} re-derivations passed (CR/RC judgement-based, not re-derived)`);
}
