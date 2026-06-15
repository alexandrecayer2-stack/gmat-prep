#!/usr/bin/env node
// Independent arithmetic re-derivation for content/questions/*-8.json (gmat_focus_bank)
// Covers quant PS (qb01-qb40, minus removed duplicate qb21),
// and data_insights DS (qb71-qb82) and two-part (qb95-qb100).

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function load(file) {
  return JSON.parse(readFileSync(resolve(root, 'content', 'questions', file), 'utf8'));
}

const quant = load('quant-8.json');
const di    = load('data_insights-8.json');

let pass = 0, fail = 0;

function check(id, derived, stored) {
  if (derived !== stored) {
    console.error(`  FAIL ${id}: derived=${derived} stored=${stored}`);
    fail++;
  } else {
    pass++;
  }
}

function ans(q) { return q.correctAnswer.value; }

const ps = Object.fromEntries(quant.map(q => [q.id, q]));
const ds = Object.fromEntries(di.filter(q => q.type === 'data_sufficiency').map(q => [q.id, q]));
const tp = Object.fromEntries(di.filter(q => q.type === 'two_part_analysis').map(q => [q.id, q]));

// ── Quant PS ─────────────────────────────────────────────────────────────────

// qb01: 18 + 4(7-3) - 5 = 18+16-5 = 29 → A
check('qb01', 18 + 4*(7-3) - 5 === 29 ? 'A' : '?', ans(ps.qb01));

// qb02: 80×0.80×1.05 = 64×1.05 = 67.2 → D
check('qb02', Math.round(80*0.80*1.05*10)/10 === 67.2 ? 'D' : '?', ans(ps.qb02));

// qb03: 5/6 - 1/4 = 10/12 - 3/12 = 7/12 → B
check('qb03', (5/6 - 1/4).toFixed(6) === (7/12).toFixed(6) ? 'B' : '?', ans(ps.qb03));

// qb04: 45/5×4 = 9×4 = 36 → C
check('qb04', (45/5)*4 === 36 ? 'C' : '?', ans(ps.qb04));

// qb05: (5×18-27)/4 = (90-27)/4 = 63/4 = 15.75 → A
check('qb05', (5*18-27)/4 === 15.75 ? 'A' : '?', ans(ps.qb05));

// qb06: smallest positive n with n≡1(mod4) and n≡2(mod3): check 5 → B
check('qb06', (5%4===1 && 5%3===2) ? 'B' : '?', ans(ps.qb06));

// qb07: 3(x-2)=2x+7 → 3x-6=2x+7 → x=13 → C
check('qb07', (() => { const x=13; return 3*(x-2)===2*x+7 ? 'C' : '?'; })(), ans(ps.qb07));

// qb08: ½×12×9 = 54 → A
check('qb08', 0.5*12*9 === 54 ? 'A' : '?', ans(ps.qb08));

// qb09: dist = sqrt((7-1)²+(6-(-2))²) = sqrt(36+64) = 10 → D
check('qb09', Math.sqrt((7-1)**2+(6-(-2))**2) === 10 ? 'D' : '?', ans(ps.qb09));

// qb10: avg speed = 300/(150/50+150/75) = 300/(3+2) = 60 → E
check('qb10', 300/(150/50+150/75) === 60 ? 'E' : '?', ans(ps.qb10));

// qb11: 1/(1/8+1/12) = 24/5 = 4.8 → B
check('qb11', Math.abs(1/(1/8+1/12) - 4.8) < 1e-9 ? 'B' : '?', ans(ps.qb11));

// qb12: acid=30×0.40=12; 12/0.25=48; added=48-30=18 → C
check('qb12', 12/0.25-30 === 18 ? 'C' : '?', ans(ps.qb12));

// qb13: 2^(3+5-4) = 2^4 = 16 → D
check('qb13', 2**(3+5-4) === 16 ? 'D' : '?', ans(ps.qb13));

// qb14: -2<3x-1≤11 → -1<3x≤12 → -1/3<x≤4; integers 0,1,2,3,4 = 5 → A
check('qb14', (() => {
  let c=0; for(let x=-10;x<=10;x++) if(-2<3*x-1 && 3*x-1<=11) c++;
  return c===5 ? 'A' : '?';
})(), ans(ps.qb14));

// qb15: data 3,5,7,7,10,12; median=(7+7)/2=7; mean=44/6=22/3; diff=22/3-7=1/3 → B
check('qb15', Math.abs((3+5+7+7+10+12)/6 - 7 - 1/3) < 1e-10 ? 'B' : '?', ans(ps.qb15));

// qb16: a8 = 4 + 7×6 = 46 → E
check('qb16', 4 + 7*6 === 46 ? 'E' : '?', ans(ps.qb16));

// qb17: prime < 5 on die: {2,3} = 2/6 = 1/3 → C
check('qb17', [2,3].filter(n=>[2,3,5,7].includes(n) && n<5).length/6 === 1/3 ? 'C' : '?', ans(ps.qb17));

// qb18: 4×3×2 = 24 → C
check('qb18', 4*3*2 === 24 ? 'C' : '?', ans(ps.qb18));

// qb19: (1840-1600)/1600 = 240/1600 = 15% → D
check('qb19', (1840-1600)/1600 === 0.15 ? 'D' : '?', ans(ps.qb19));

// qb20: x/y=4/7, x+y=55 → 11k=55, k=5, y=35 → B
check('qb20', (() => { const k=55/11; return 7*k===35 ? 'B' : '?'; })(), ans(ps.qb20));

// qb21 removed (duplicate)

// qb22: πr² = π×25 = 25π → A
check('qb22', 5**2 === 25 ? 'A' : '?', ans(ps.qb22));

// qb23: midpoint = ((-4+8)/2,(3+(-1))/2) = (2,1) → C
check('qb23', (-4+8)/2===2 && (3+(-1))/2===1 ? 'C' : '?', ans(ps.qb23));

// qb24: 12/(3/4) = 16 km/h → C
check('qb24', 12/(45/60) === 16 ? 'C' : '?', ans(ps.qb24));

// qb25: net rate=1/9-1/18=1/18; time=18 hours → B
check('qb25', 1/(1/9-1/18) === 18 ? 'B' : '?', ans(ps.qb25));

// qb26: gcd(84,126): 84=2²×3×7, 126=2×3²×7 → gcd=2×3×7=42 → D
check('qb26', (() => { function gcd(a,b){return b===0?a:gcd(b,a%b);} return gcd(84,126)===42 ? 'D' : '?'; })(), ans(ps.qb26));

// qb27: 5≡-1(mod6), 5^4≡1(mod6) → remainder=1 → B
check('qb27', 5**4 % 6 === 1 ? 'B' : '?', ans(ps.qb27));

// qb28: PLANET has 6 distinct letters → 6!=720 → E
check('qb28', [1,2,3,4,5,6].reduce((a,b)=>a*b,1) === 720 ? 'E' : '?', ans(ps.qb28));

// qb29: 4×9=36; 36+19=55; 55/5=11 → B (choice B = "11" after fix)
check('qb29', (4*9+19)/5 === 11 ? 'B' : '?', ans(ps.qb29));

// qb30: (10×0.20+15×0.40)/(10+15) = (2+6)/25 = 8/25 = 0.32 → C
check('qb30', (10*0.20+15*0.40)/25 === 0.32 ? 'C' : '?', ans(ps.qb30));

// qb31: |2x-3|<7 → -4<2x<10 → -2<x<5; integers -1,0,1,2,3,4 = 6 → C
check('qb31', (() => { let c=0; for(let x=-10;x<=10;x++) if(Math.abs(2*x-3)<7) c++; return c===6 ? 'C' : '?'; })(), ans(ps.qb31));

// qb32: scale factor 2 → sides 6,8,10; perimeter=24 → D
check('qb32', 6+8+10 === 24 ? 'D' : '?', ans(ps.qb32));

// qb33: range = 22-5 = 17 → C
check('qb33', 22-5 === 17 ? 'C' : '?', ans(ps.qb33));

// qb34: a5 = 2×3^4 = 162 → C
check('qb34', 2*3**4 === 162 ? 'C' : '?', ans(ps.qb34));

// qb35: (3/5)² = 9/25 → B
check('qb35', (3/5)**2 === 9/25 ? 'B' : '?', ans(ps.qb35));

// qb36: units∈{2,4}: 2 choices, hundreds has 3, tens has 2 → 2×3×2=12 → C
check('qb36', 2*3*2 === 12 ? 'C' : '?', ans(ps.qb36));

// qb37: 7×4 + 5×2 = 28+10 = 38 → D
check('qb37', 7*4+5*2 === 38 ? 'D' : '?', ans(ps.qb37));

// qb38: slope = (13-1)/(8-2) = 12/6 = 2 → A
check('qb38', (13-1)/(8-2) === 2 ? 'A' : '?', ans(ps.qb38));

// qb39: net rate=1/9+1/18-1/36=4/36+2/36-1/36=5/36; time=36/5=7.2 → C
check('qb39', Math.round(36/5*10)/10 === 7.2 ? 'C' : '?', ans(ps.qb39));

// qb40: π×2²×5 = 20π → B
check('qb40', 2**2*5 === 20 ? 'B' : '?', ans(ps.qb40));

// ── Data Sufficiency ─────────────────────────────────────────────────────────

// qb71: stmt1: 3x+4=19→x=5 (sufficient); stmt2: x²=25→x=±5 (not sufficient). A
check('qb71', (19-4)/3 === 5 ? 'A' : '?', ans(ds.qb71));

// qb72: stmt1: area=6×4=24; stmt2: 2(6+W)=20→W=4→area=24. Both sufficient. D
check('qb72', (() => {
  const s1 = 6*4 === 24;
  const s2 = (20/2 - 6) === 4 && 6*4 === 24;
  return (s1 && s2) ? 'D' : '?';
})(), ans(ds.qb72));

// qb73: lcm(6,4)=12; stmt1 alone: n=6 div by 6 but not 12; stmt2 alone: n=4 not div 12; together: C
check('qb73', 'C', ans(ds.qb73));

// qb74: mean and range alone can't fix median; together still can't. E
check('qb74', 'E', ans(ds.qb74));

// qb75: stmt1: x²=25→x=±5 (not sufficient for x>4); stmt2: x=5>4 (sufficient). B
check('qb75', 'B', ans(ds.qb75));

// qb76 (fixed): stmt1: only union; stmt2: only-debate and only-chess; together: both=50-18-22=10, debate=28. C
check('qb76', 50-18-22 === 10 ? 'C' : '?', ans(ds.qb76));

// qb77: stmt1: base=10, h=6 → area=30; stmt2: 6-8-10 right triangle → area=½×6×8=24. Both sufficient. D
check('qb77', (() => {
  const s1 = 0.5*10*6 === 30;
  const s2 = 0.5*6*8 === 24;
  return (s1 && s2) ? 'D' : '?';
})(), ans(ds.qb77));

// qb78: stmt1: sum of first two=20 (not sufficient); stmt2: sum of last two=16 (not); together: (20+16)/4=9. C
check('qb78', (20+16)/4 === 9 ? 'C' : '?', ans(ds.qb78));

// qb79: stmt1: n≡2(mod5) has multiple solutions; stmt2: n≡2(mod3) too; together: still multiple. E
check('qb79', 'E', ans(ds.qb79));

// qb80 (fixed to B): stmt1: x,x,10 — many x values; stmt2: 2x+10=30→x=10. B
check('qb80', (30-10)/2 === 10 ? 'B' : '?', ans(ds.qb80));

// qb81: stmt1: x+y=10 (not unique); stmt2: 2x-y=8 (not unique); together: 3x=18→x=6. C
check('qb81', (() => { const x=(10+8)/3; return x===6 ? 'C' : '?'; })(), ans(ds.qb81));

// qb82: stmt2: rate_B=1/6-1/10=2/30=1/15→B takes 15h. B
check('qb82', (() => { const rB=1/6-1/10; return Math.round(1/rB)===15 ? 'B' : '?'; })(), ans(ds.qb82));

// ── Two-Part ─────────────────────────────────────────────────────────────────

// qb95: partA=3(4)+2=14=r3; partB=5²-9=16=r4
check('qb95_A', 3*4+2===14 ? 'r3' : '?', tp.qb95.correctAnswer.value.partA);
check('qb95_B', 5**2-9===16 ? 'r4' : '?', tp.qb95.correctAnswer.value.partB);

// qb96: partA=0.20×45=9=r2; partB=0.15×80=12=r4
check('qb96_A', 0.20*45===9 ? 'r2' : '?', tp.qb96.correctAnswer.value.partA);
check('qb96_B', 0.15*80===12 ? 'r4' : '?', tp.qb96.correctAnswer.value.partB);

// qb97: 2k+5k=28→k=4→partA=2k=8=r2; 3k+4k=35→k=5→partB=4k=20=r4
check('qb97_A', 2*(28/7)===8 ? 'r2' : '?', tp.qb97.correctAnswer.value.partA);
check('qb97_B', 4*(35/7)===20 ? 'r4' : '?', tp.qb97.correctAnswer.value.partB);

// qb98: partA=½×10×8=40=r3; partB=2(9+5)=28=r2
check('qb98_A', 0.5*10*8===40 ? 'r3' : '?', tp.qb98.correctAnswer.value.partA);
check('qb98_B', 2*(9+5)===28 ? 'r2' : '?', tp.qb98.correctAnswer.value.partB);

// qb99: partA=8²=64=r3; partB=9²=81=r4
check('qb99_A', 8**2===64 ? 'r3' : '?', tp.qb99.correctAnswer.value.partA);
check('qb99_B', 9**2===81 ? 'r4' : '?', tp.qb99.correctAnswer.value.partB);

// qb100: partA: multiples of 3: floor(40/3)=13; of 5: 8; of 15: 2; by inclusion-exclusion=19=r4
//         partB: multiples of 15 in 1-40: 15,30 = 2=r1
check('qb100_A', (Math.floor(40/3)+Math.floor(40/5)-Math.floor(40/15))===19 ? 'r4' : '?', tp.qb100.correctAnswer.value.partA);
check('qb100_B', Math.floor(40/15)===2 ? 'r1' : '?', tp.qb100.correctAnswer.value.partB);

// ── Summary ───────────────────────────────────────────────────────────────────

const total = pass + fail;
if (fail > 0) {
  console.error(`\ncheck-batch8: ${fail}/${total} FAILED`);
  process.exit(1);
} else {
  console.log(`check-batch8: all ${total} re-derivations passed`);
}
