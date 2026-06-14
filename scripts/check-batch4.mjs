// Independent re-derivation of every computable answer in the -4 batch.
import { readFileSync } from 'node:fs';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
let fails = 0;
const ok = (name, cond) => {
  if (!cond) fails++;
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}`);
};
const byId = (arr, id) => arr.find((x) => x.id === id);

// ---- Quant ----
const q = read('content/questions/quant-4.json');
const numChoice = (qq) =>
  qq.choices.find((c) => c.key === qq.correctAnswer.value).text.replace(/[$]/g, '');
ok('profit labeled 108', numChoice(byId(q, 'qx4-profit-markup')) === '108');
ok('profit calc', Math.round(80 * 1.35) === 108);
ok('overlap labeled 4', numChoice(byId(q, 'qx4-overlapping-sets')) === '4');
ok('overlap calc', 40 - (25 + 18 - 7) === 4);
ok('inequality labeled 4', numChoice(byId(q, 'qx4-inequality-range')) === '4');
ok('sequence labeled 29', numChoice(byId(q, 'qx4-sequence-recursive')) === '29');
ok('sequence calc', (() => { let a = 1; for (let i = 0; i < 3; i++) a = 2 * a + 3; return a; })() === 29);
ok('exponents labeled 27', numChoice(byId(q, 'qx4-exponents-pow')) === '27');
ok('exponents calc', 3 ** (5 - 2) === 27);

// ---- Data Insights ----
const d = read('content/questions/data_insights-4.json');
const rowsOf = (id) => byId(d, id).assets.table.rows;
const val = (id) => byId(d, id).correctAnswer.value;
const T = (b) => (b ? 'True' : 'False');

// product-revenue
{
  const r = rowsOf('ta4-product-revenue');
  const v = val('ta4-product-revenue');
  ok('rev = price*units', r.every((x) => x.revenue === x.price * x.units));
  const maxRev = r.reduce((a, b) => (b.revenue > a.revenue ? b : a));
  ok('pr s1', T(maxRev.product === 'C') === v.s1);
  const maxPrice = r.reduce((a, b) => (b.price > a.price ? b : a));
  const minUnits = r.reduce((a, b) => (b.units < a.units ? b : a));
  ok('pr s2', T(maxPrice.product === minUnits.product) === v.s2);
  ok('pr s3', T(r.filter((x) => x.units >= 40).length > r.length / 2) === v.s3);
}
// city-density
{
  const r = rowsOf('ta4-city-density');
  const v = val('ta4-city-density');
  ok('density = pop*1000/area', r.every((x) => x.density === (x.population * 1000) / x.area));
  const maxPop = r.reduce((a, b) => (b.population > a.population ? b : a));
  const maxArea = r.reduce((a, b) => (b.area > a.area ? b : a));
  ok('cd s1', T(maxPop.city === maxArea.city) === v.s1);
  const maxDen = r.reduce((a, b) => (b.density > a.density ? b : a));
  const minArea = r.reduce((a, b) => (b.area < a.area ? b : a));
  ok('cd s2', T(maxDen.city === minArea.city) === v.s2);
  ok('cd s3', T(r.filter((x) => x.density >= 2500).length > r.length / 2) === v.s3);
}
// box-office
{
  const r = rowsOf('ta4-box-office');
  const v = val('ta4-box-office');
  const maxGross = r.reduce((a, b) => (b.gross > a.gross ? b : a));
  const maxBudget = r.reduce((a, b) => (b.budget > a.budget ? b : a));
  ok('bo s1', T(maxGross.title === maxBudget.title) === v.s1);
  ok('bo s2', T(r.filter((x) => x.rating >= 7).every((x) => x.gross > x.budget)) === v.s2);
  ok('bo s3', T(r.filter((x) => x.gross >= 2 * x.budget).length > r.length / 2) === v.s3);
}
// graphics
{
  const g = (id) => byId(d, id);
  let m = g('gi4-monthly-sales-bar');
  let data = m.assets.chart.data;
  const monthName = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May' };
  ok('sales total', String(data.reduce((s, x) => s + x.sales, 0)) === m.correctAnswer.value.b2);
  ok('sales max', monthName[data.reduce((a, b) => (b.sales > a.sales ? b : a)).month] === m.correctAnswer.value.b1);

  let t = g('gi4-temperature-line');
  data = t.assets.chart.data;
  ok('temp avg', String(data.reduce((s, x) => s + x.temp, 0) / data.length) === t.correctAnswer.value.b2);
  let inc = [];
  for (let i = 1; i < data.length; i++) inc.push({ k: `${data[i - 1].day} to ${data[i].day}`, d: data[i].temp - data[i - 1].temp });
  ok('temp max increase', inc.reduce((a, b) => (b.d > a.d ? b : a)).k === t.correctAnswer.value.b1);

  let s = g('gi4-price-demand-scatter');
  data = s.assets.chart.data;
  const rate = (data.at(-1).demand - data[0].demand) / (data.at(-1).price - data[0].price);
  ok('scatter rate', String(rate) === s.correctAnswer.value.b2);
  ok('scatter negative', s.correctAnswer.value.b1 === 'negative' && rate < 0);
}
// two-part
{
  const optText = (qq, key) => qq.choices.find((c) => c.key === key).text;
  const taxi = byId(d, 'tp4-taxi-fare');
  ok('taxi fare', optText(taxi, taxi.correctAnswer.value.partA) === '13' && 3 + 2 * 5 === 13);
  ok('taxi miles', optText(taxi, taxi.correctAnswer.value.partB) === '7' && (17 - 3) / 2 === 7);
  const prod = byId(d, 'tp4-production-cost');
  ok('prod cost', optText(prod, prod.correctAnswer.value.partA) === '150' && 4 * 25 + 50 === 150);
  ok('prod units', optText(prod, prod.correctAnswer.value.partB) === '60' && (290 - 50) / 4 === 60);
  const quad = byId(d, 'tp4-quadratic-fn');
  ok('quad x', optText(quad, quad.correctAnswer.value.partA) === '5' && 5 * 5 - 2 * 5 === 15);
  ok('quad f4', optText(quad, quad.correctAnswer.value.partB) === '8' && 4 * 4 - 2 * 4 === 8);
}

console.log(fails === 0 ? '\nALL BATCH-4 CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails ? 1 : 0);
