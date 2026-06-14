// Independent re-derivation of every computable answer in the -6 batch
// (quant-6 + data_insights-6). Recomputes each result from scratch and compares
// it to the stored correctAnswer, so a wrong label can never reach the seed.
import { readFileSync } from 'node:fs';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
let fails = 0;
const ok = (name, cond) => { if (!cond) fails++; console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}`); };
const byId = (arr, id) => arr.find((x) => x.id === id);

// ---- Quant (Problem Solving) ----
const q = read('content/questions/quant-6.json');
const txt = (id) => { const qq = byId(q, id); return qq.choices.find((c) => c.key === qq.correctAnswer.value).text; };
const n = (id) => Number(txt(id).replace(/[$\\%,]/g, ''));

ok('q01 order-of-ops', n('q6-q01') === 7 + 6 * 5 - 4 && n('q6-q01') === 33);
ok('q02 15% of 240', n('q6-q02') === 0.15 * 240 && n('q6-q02') === 36);
ok('q03 3/4*5/6', txt('q6-q03') === '$\\frac{5}{8}$' && (3 / 4) * (5 / 6) === 5 / 8);
ok('q04 ratio 5:3 of 64', n('q6-q04') === (64 / 8) * 3 && n('q6-q04') === 24);
ok('q05 mean', n('q6-q05') === (12 + 15 + 18 + 21 + 24) / 5 && n('q6-q05') === 18);
ok('q06 units 7^4', n('q6-q06') === 7 ** 4 % 10 && n('q6-q06') === 1);
ok('q07 4x-7=21', n('q6-q07') === (21 + 7) / 4 && n('q6-q07') === 7);
ok('q08 30 of 120', n('q6-q08') === (30 / 120) * 100 && n('q6-q08') === 25);
ok('q09 perimeter', n('q6-q09') === 2 * (8 + 5) && n('q6-q09') === 26);
ok('q10 2.5*0.4', n('q6-q10') === 2.5 * 0.4 && n('q6-q10') === 1);
ok('q11 5 consec sum 65', n('q6-q11') === 65 / 5 + 2 && n('q6-q11') === 15);
ok('q12 1st 3-digit mult 7', n('q6-q12') === 7 * Math.ceil(100 / 7) && n('q6-q12') === 105);
ok('q13 7/20 percent', n('q6-q13') === (7 / 20) * 100 && n('q6-q13') === 35);
ok('q14 speed', n('q6-q14') === 180 / 3 && n('q6-q14') === 60);
ok('q15 pct increase', n('q6-q15') === ((65 - 50) / 50) * 100 && n('q6-q15') === 30);
ok('q16 system x', n('q6-q16') === (() => { for (let y = 0; y < 20; y++) { const x = 11 - 2 * y; if (2 * x - y === 2) return x; } })() && n('q6-q16') === 3);
ok('q17 work 4 & 12', Math.abs(n('q6-q17') - 1 / (1 / 4 + 1 / 12)) < 1e-9 && n('q6-q17') === 3);
ok('q18 mixture', n('q6-q18') === ((0.25 * 40 + 0.5 * 60) / 100) * 100 && n('q6-q18') === 40);
ok('q19 2^5*2^3', n('q6-q19') === 2 ** 5 * 2 ** 3 && n('q6-q19') === 256);
ok('q20 count integers', n('q6-q20') === (() => { let c = 0; for (let x = -50; x <= 50; x++) if (-3 <= 2 * x + 1 && 2 * x + 1 < 9) c++; return c; })() && n('q6-q20') === 6);
ok('q21 ratio total', n('q6-q21') === 12 + (12 / 2) * 3 && n('q6-q21') === 30);
ok('q22 profit pct', n('q6-q22') === ((30 - 24) / 24) * 100 && n('q6-q22') === 25);
ok('q23 median', n('q6-q23') === (8 + 10) / 2 && n('q6-q23') === 9);
ok('q24 circle area', txt('q6-q24') === '$49\\pi$');
ok('q25 distance', n('q6-q25') === Math.sqrt((4 - 1) ** 2 + (6 - 2) ** 2) && n('q6-q25') === 5);
ok('q26 10th term', n('q6-q26') === 5 + 9 * 3 && n('q6-q26') === 32);
ok('q27 C(6,2)', n('q6-q27') === (6 * 5) / 2 && n('q6-q27') === 15);
ok('q28 LEVEL arr', n('q6-q28') === 120 / (2 * 2) && n('q6-q28') === 30);
ok('q29 sum=7 prob', txt('q6-q29') === '$\\frac{1}{6}$' && 6 / 36 === 1 / 6);
ok('q30 divisors 360', n('q6-q30') === (() => { let c = 0; for (let i = 1; i <= 360; i++) if (360 % i === 0) c++; return c; })() && n('q6-q30') === 24);
ok('q31 pipe B', Math.abs(n('q6-q31') - 1 / (1 / 6 - 1 / 10)) < 1e-9 && n('q6-q31') === 15);
ok('q32 3^2x=81', n('q6-q32') === 4 / 2 && n('q6-q32') === 2);
ok('q33 equilateral area', txt('q6-q33') === '$9\\sqrt{3}$');
ok('q34 dilute', n('q6-q34') === (() => { for (let x = 0; x <= 100; x++) if (Math.abs(6 / (20 + x) - 0.25) < 1e-12) return x; })() && n('q6-q34') === 4);
ok('q35 catch up', n('q6-q35') === 30 / (60 - 45) && n('q6-q35') === 2);
ok('q36 x^2+1/x^2', n('q6-q36') === 4 ** 2 - 2 && n('q6-q36') === 14);
ok('q37 3^100 mod 5', n('q6-q37') === (() => { let r = 1; for (let i = 0; i < 100; i++) r = (r * 3) % 5; return r; })() && n('q6-q37') === 1);
ok('q38 cube diagonal', txt('q6-q38') === '$4\\sqrt{3}$');
ok('q39 distinct even 3-digit', n('q6-q39') === (() => { let c = 0; for (let h = 1; h <= 9; h++) for (let t = 0; t <= 9; t++) for (let u = 0; u <= 9; u += 2) if (h !== t && h !== u && t !== u) c++; return c; })() && n('q6-q39') === 328);
ok('q40 sum first 20 even', n('q6-q40') === (() => { let s = 0; for (let i = 1; i <= 20; i++) s += 2 * i; return s; })() && n('q6-q40') === 420);

// ---- Data Insights ----
const d = read('content/questions/data_insights-6.json');
const T = (b) => (b ? 'True' : 'False');
const dval = (id) => byId(d, id).correctAnswer.value;
const rows = (id) => byId(d, id).assets.table.rows;
const cdata = (id) => byId(d, id).assets.chart.data;

// Data Sufficiency — stored letter vs. expected, plus underlying arithmetic.
const dsExpected = { 'ds6-01': 'A', 'ds6-02': 'A', 'ds6-03': 'D', 'ds6-04': 'E', 'ds6-05': 'A', 'ds6-06': 'C', 'ds6-07': 'A', 'ds6-08': 'A', 'ds6-09': 'C', 'ds6-10': 'D', 'ds6-11': 'A', 'ds6-12': 'C' };
for (const [id, letter] of Object.entries(dsExpected)) ok(`${id} letter`, byId(d, id).correctAnswer.value === letter);
ok('ds6-03 area', (20 / 4) ** 2 === 25 && (5 * Math.SQRT2 / Math.SQRT2) ** 2 === 25);
ok('ds6-06 apple price', (5.5 - 4.5) / 2 === 0.5);
ok('ds6-09 hypotenuse', Math.sqrt(6 ** 2 + 8 ** 2) === 10);
ok('ds6-10 A-time', 1 / (1 / 3 - 1 / 6) === 6);
ok('ds6-11 x', 40 - (6 + 9 + 13) === 12);
ok('ds6-12 neither', 50 - (30 + 25 - 15) === 10);

// Graphics — recompute each blank from the chart data.
{
  let v = dval('gi6-01'); let data = cdata('gi6-01');
  ok('gi6-01 b1', data.reduce((a, b) => (b.sold > a.sold ? b : a)).genre === v.b1);
  ok('gi6-01 b2', String(data.reduce((s, x) => s + x.sold, 0)) === v.b2);

  v = dval('gi6-02'); data = cdata('gi6-02');
  let inc = []; for (let i = 1; i < data.length; i++) inc.push({ k: `${data[i - 1].month} to ${data[i].month}`, dd: data[i].mm - data[i - 1].mm });
  ok('gi6-02 b1', inc.reduce((a, b) => (b.dd > a.dd ? b : a)).k === v.b1);
  ok('gi6-02 b2', String(data.reduce((s, x) => s + x.mm, 0) / data.length) === v.b2);

  v = dval('gi6-03'); data = cdata('gi6-03');
  ok('gi6-03 b1', (data.at(-1).grade > data[0].grade ? 'positive' : 'negative') === v.b1);
  ok('gi6-03 b2', String(data.find((x) => x.hours === 3).grade) === v.b2);

  v = dval('gi6-04'); data = cdata('gi6-04');
  ok('gi6-04 b1', data.reduce((a, b) => (b.defects > a.defects ? b : a)).shift === v.b1);
  ok('gi6-04 b2', String(data.reduce((s, x) => s + x.defects, 0)) === v.b2);

  v = dval('gi6-05'); data = cdata('gi6-05');
  inc = []; for (let i = 1; i < data.length; i++) inc.push({ k: `${data[i - 1].week} to ${data[i].week}`, dd: data[i].price - data[i - 1].price });
  ok('gi6-05 b1', inc.reduce((a, b) => (b.dd > a.dd ? b : a)).k === v.b1);
  const net = data.at(-1).price - data[0].price;
  ok('gi6-05 b2', (net >= 0 ? `+${net}` : String(net)) === v.b2);

  v = dval('gi6-06'); data = cdata('gi6-06');
  ok('gi6-06 b1', (data.at(-1).sales < data[0].sales ? 'negative' : 'positive') === v.b1);
  const slope = (data.at(-1).sales - data[0].sales) / (data.at(-1).price - data[0].price);
  ok('gi6-06 b2', String(slope) === v.b2);
}

// Tables — recompute each True/False statement from rows.
{
  let r = rows('ta6-01'); let v = dval('ta6-01');
  ok('ta6-01 s1', T(r.reduce((a, b) => (b.age > a.age ? b : a)).salary === Math.max(...r.map((x) => x.salary))) === v.s1);
  ok('ta6-01 s2', T(r.filter((x) => x.salary >= 60000).length > r.length / 2) === v.s2);
  ok('ta6-01 s3', T(r.reduce((a, b) => (b.age < a.age ? b : a)).name === 'Sato') === v.s3);

  r = rows('ta6-02'); v = dval('ta6-02');
  ok('ta6-02 s1', T(r.reduce((a, b) => (b.units > a.units ? b : a)).revenue === Math.max(...r.map((x) => x.revenue))) === v.s1);
  ok('ta6-02 s2', T(r.filter((x) => x.revenue >= 600).length > r.length / 2) === v.s2);
  ok('ta6-02 s3', T(r.reduce((a, b) => (b.price > a.price ? b : a)).units === Math.min(...r.map((x) => x.units))) === v.s3);

  r = rows('ta6-03'); v = dval('ta6-03');
  ok('ta6-03 s1', T(r.every((x) => x.gross > x.budget)) === v.s1);
  ok('ta6-03 s2', T(r.reduce((a, b) => (b.budget > a.budget ? b : a)).gross === Math.max(...r.map((x) => x.gross))) === v.s2);
  ok('ta6-03 s3', T(r.filter((x) => x.gross >= 2 * x.budget).length > r.length / 2) === v.s3);

  r = rows('ta6-04'); v = dval('ta6-04');
  ok('ta6-04 s1', T(r.reduce((a, b) => (b.km > a.km ? b : a)).pace === Math.min(...r.map((x) => x.pace))) === v.s1);
  ok('ta6-04 s2', T(r.filter((x) => x.km > 9).every((x) => x.minutes >= 60)) === v.s2);
  ok('ta6-04 s3', T(r.filter((x) => x.pace === 6.0).length > r.length / 2) === v.s3);

  r = rows('ta6-05'); v = dval('ta6-05');
  ok('ta6-05 s1', T(r.reduce((a, b) => (b.cost > a.cost ? b : a)).data === Math.max(...r.map((x) => x.data))) === v.s1);
  ok('ta6-05 s2', T(r.filter((x) => x.cost >= 30).length > r.length / 2) === v.s2);
  ok('ta6-05 s3', T(r.reduce((a, b) => (b.cost < a.cost ? b : a)).minutes === Math.min(...r.map((x) => x.minutes))) === v.s3);

  r = rows('ta6-06'); v = dval('ta6-06');
  ok('ta6-06 s1', T(r.reduce((a, b) => (b.rate > a.rate ? b : a)).profit === Math.max(...r.map((x) => x.profit))) === v.s1);
  ok('ta6-06 s2', T(r.filter((x) => x.amount > 1000).every((x) => x.profit >= 50)) === v.s2);
  ok('ta6-06 s3', T(r.filter((x) => x.profit >= 50).length > r.length / 2) === v.s3);
}

// Two-part — recompute each column value.
{
  const opt = (qq, k) => qq.choices.find((c) => c.key === k).text;
  const both = (id, a, b) => { const p = byId(d, id); ok(`${id} A`, opt(p, p.correctAnswer.value.partA) === a); ok(`${id} B`, opt(p, p.correctAnswer.value.partB) === b); };
  both('tp6-01', String(5 + 3 * 4), String((26 - 5) / 3)); // 17, 7
  both('tp6-02', String(4 * 3 - 1), String((23 + 1) / 4)); // 11, 6
  both('tp6-03', String((30 - 2 * 9) / 2), String(9 * ((30 - 2 * 9) / 2))); // 6, 54
  both('tp6-04', String(4 + 2 * 7), String((24 - 4) / 2)); // 18, 10
  both('tp6-05', String(3 ** 2 + 3), String((() => { for (let x = 1; x < 50; x++) if (x * x + x === 30) return x; })())); // 12, 5
  both('tp6-06', String(2 ** 4), String(Math.log2(128))); // 16, 7
}

console.log(fails === 0 ? '\nALL BATCH-6 CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails ? 1 : 0);
