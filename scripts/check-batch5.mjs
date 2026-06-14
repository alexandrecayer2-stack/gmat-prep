// Independent re-derivation of every computable answer in the -5 batch.
import { readFileSync } from 'node:fs';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
let fails = 0;
const ok = (name, cond) => { if (!cond) fails++; console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}`); };
const byId = (arr, id) => arr.find((x) => x.id === id);

// ---- Quant ----
const q = read('content/questions/quant-5.json');
const num = (qq) => qq.choices.find((c) => c.key === qq.correctAnswer.value).text.replace(/[$\\%]/g, '');
ok('weighted-avg 80', num(byId(q, 'q5-weighted-average')) === '80' && (10 * 70 + 20 * 85) / 30 === 80);
ok('percent-change 25', num(byId(q, 'q5-percent-change')) === '25' && ((50 - 40) / 40) * 100 === 25);
ok('ratio-share 160', num(byId(q, 'q5-ratio-share')) === '160' && (360 / 9) * 4 === 160);
ok('avg-speed 40', num(byId(q, 'q5-avg-speed')) === '40' && 120 / (60 / 30 + 60 / 60) === 40);
ok('system b=3', num(byId(q, 'q5-system-substitution')) === '3' && (() => { for (let b = 0; b < 10; b++) if (5 * (b + 1) + 2 * b === 26) return b; })() === 3);
ok('prob 7/8', num(byId(q, 'q5-prob-complement')) === '7/8' && 1 - (1 / 2) ** 3 === 0.875);
ok('divisors 12', num(byId(q, 'q5-divisors')) === '12' && (() => { let c = 0; for (let i = 1; i <= 72; i++) if (72 % i === 0) c++; return c; })() === 12);
ok('work 2.4', num(byId(q, 'q5-work-three')) === '2.4' && Math.abs(1 / (1 / 4 + 1 / 6) - 2.4) < 1e-9);

// ---- Data Insights ----
const d = read('content/questions/data_insights-5.json');
const T = (b) => (b ? 'True' : 'False');
const rows = (id) => byId(d, id).assets.table.rows;
const dv = (id) => byId(d, id).correctAnswer.value;

// graphics
{
  let v = byId(d, 'gi5-votes-bar'); let data = v.assets.chart.data;
  ok('votes total', String(data.reduce((s, x) => s + x.votes, 0)) === v.correctAnswer.value.b2);
  ok('votes max', data.reduce((a, b) => (b.votes > a.votes ? b : a)).district === v.correctAnswer.value.b1);

  let vis = byId(d, 'gi5-visitors-line'); data = vis.assets.chart.data;
  ok('visitors total', String(data.reduce((s, x) => s + x.visitors, 0)) === vis.correctAnswer.value.b2);
  let inc = []; for (let i = 1; i < data.length; i++) inc.push({ k: `${data[i - 1].week} to ${data[i].week}`, dd: data[i].visitors - data[i - 1].visitors });
  ok('visitors max inc', inc.reduce((a, b) => (b.dd > a.dd ? b : a)).k === vis.correctAnswer.value.b1);

  let pr = byId(d, 'gi5-practice-scatter'); data = pr.assets.chart.data;
  ok('practice @4', String(data.find((x) => x.hours === 4).errors) === pr.correctAnswer.value.b2);
  ok('practice negative', pr.correctAnswer.value.b1 === 'negative' && data.at(-1).errors < data[0].errors);

  let pf = byId(d, 'gi5-profit-bar'); data = pf.assets.chart.data;
  const monthName = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May' };
  ok('profit lowest', monthName[data.reduce((a, b) => (b.profit < a.profit ? b : a)).month] === pf.correctAnswer.value.b1);
  ok('profit count>0', String(data.filter((x) => x.profit > 0).length) === pf.correctAnswer.value.b2);
}
// tables
{
  let r = rows('ta5-scores'); let v = dv('ta5-scores');
  ok('sc s1', T(r.reduce((a, b) => (b.score > a.score ? b : a)).student === 'Cara') === v.s1);
  ok('sc s2', T(r.filter((x) => x.score > 80).length > r.length / 2) === v.s2);
  ok('sc s3', T(Math.min(...r.map((x) => x.score)) < 70) === v.s3);

  r = rows('ta5-gdp'); v = dv('ta5-gdp');
  const maxGdp = r.reduce((a, b) => (b.gdp > a.gdp ? b : a));
  const maxGrowth = r.reduce((a, b) => (b.growth > a.growth ? b : a));
  ok('gdp s1', T(maxGdp.country === maxGrowth.country) === v.s1);
  ok('gdp s2', T(r.filter((x) => x.growth > 2).length > r.length / 2) === v.s2);
  const minGdp = r.reduce((a, b) => (b.gdp < a.gdp ? b : a));
  ok('gdp s3', T(minGdp.country === maxGrowth.country) === v.s3);

  r = rows('ta5-inventory'); v = dv('ta5-inventory');
  ok('inv s1', T(byId(rows('ta5-inventory'), 'W1') ? false : true) || true); // placeholder
  const w1 = r.find((x) => x.product === 'W1');
  ok('inv s1 real', T(w1.stock < w1.reorder) === v.s1);
  ok('inv s2', T(r.filter((x) => x.stock >= x.reorder).length > r.length / 2) === v.s2);
  const maxPrice = r.reduce((a, b) => (b.price > a.price ? b : a));
  ok('inv s3', T(maxPrice.stock < maxPrice.reorder) === v.s3);

  r = rows('ta5-athletes'); v = dv('ta5-athletes');
  const maxPts = r.reduce((a, b) => (b.points > a.points ? b : a));
  const maxPpg = r.reduce((a, b) => (b.ppg > a.ppg ? b : a));
  ok('ath s1', T(maxPts.athlete === maxPpg.athlete) === v.s1);
  ok('ath s2', T(r.filter((x) => x.games > 18).every((x) => x.points >= 200)) === v.s2);
  ok('ath s3', T(r.filter((x) => x.ppg >= 12).length > r.length / 2) === v.s3);
}
// two-part
{
  const opt = (qq, k) => qq.choices.find((c) => c.key === k).text;
  let p = byId(d, 'tp5-phone-plan');
  ok('phone cost', opt(p, p.correctAnswer.value.partA) === '30' && 20 + 0.1 * 100 === 30);
  ok('phone min', opt(p, p.correctAnswer.value.partB) === '150' && (35 - 20) / 0.1 === 150);
  let l = byId(d, 'tp5-line-eval');
  ok('line y', opt(l, l.correctAnswer.value.partA) === '13' && 2 * 5 + 3 === 13);
  ok('line x', opt(l, l.correctAnswer.value.partB) === '6' && (15 - 3) / 2 === 6);
  let rc = byId(d, 'tp5-rectangle');
  ok('rect w', opt(rc, rc.correctAnswer.value.partA) === '6' && 18 - 12 === 6);
  ok('rect area', opt(rc, rc.correctAnswer.value.partB) === '72' && 12 * 6 === 72);
  let e = byId(d, 'tp5-exp-fn');
  ok('exp f5', opt(e, e.correctAnswer.value.partA) === '32' && 2 ** 5 === 32);
  ok('exp x', opt(e, e.correctAnswer.value.partB) === '6' && 2 ** 6 === 64);
}
console.log(fails === 0 ? '\nALL BATCH-5 CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails ? 1 : 0);
