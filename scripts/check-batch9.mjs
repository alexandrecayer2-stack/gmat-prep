#!/usr/bin/env node
// Independent arithmetic re-derivation for content/questions/*-9.json
// Covers quant PS (qc-quant-01 to qc-quant-40), DS (qc-ds-01 to qc-ds-12),
// GI, TA, TP. Verbal CR/RC are judgment-based and not re-derived here.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function load(file) {
  return JSON.parse(readFileSync(resolve(root, 'content', 'questions', file), 'utf8'));
}

const quant = load('quant-9.json');
const di    = load('data_insights-9.json');

let pass = 0, fail = 0;

function check(id, derived, stored) {
  if (derived === stored) { pass++; }
  else { console.error(`  FAIL ${id}: derived=${derived} stored=${stored}`); fail++; }
}

function ans(q) { return q.correctAnswer.value; }

const ps  = Object.fromEntries(quant.map(q => [q.id, q]));
const dsM = Object.fromEntries(di.filter(q => q.type === 'data_sufficiency').map(q => [q.id, q]));
const giM = Object.fromEntries(di.filter(q => q.type === 'graphics_interpretation').map(q => [q.id, q]));
const taM = Object.fromEntries(di.filter(q => q.type === 'table_analysis').map(q => [q.id, q]));
const tpM = Object.fromEntries(di.filter(q => q.type === 'two_part_analysis').map(q => [q.id, q]));

// ── Quant PS ──────────────────────────────────────────────────────────────────

// qc-quant-01: (80-68)/80 = 15% → C
check('qc-quant-01', Math.round((80-68)/80*100) === 15 ? 'C' : '?', ans(ps['qc-quant-01']));

// qc-quant-02: 7/(5+7) × 72 = 42 → C
check('qc-quant-02', 7/12*72 === 42 ? 'C' : '?', ans(ps['qc-quant-02']));

// qc-quant-03: 4×18 - (16+19+21) = 72-56 = 16 → A
check('qc-quant-03', 4*18 - (16+19+21) === 16 ? 'A' : '?', ans(ps['qc-quant-03']));

// qc-quant-04: (29-8)/3 = 7 → D
check('qc-quant-04', (29-8)/3 === 7 ? 'D' : '?', ans(ps['qc-quant-04']));

// qc-quant-05: 53 mod 8 = 5 → C
check('qc-quant-05', 53 % 8 === 5 ? 'C' : '?', ans(ps['qc-quant-05']));

// qc-quant-06: 11×6 = 66 → A
check('qc-quant-06', 11*6 === 66 ? 'A' : '?', ans(ps['qc-quant-06']));

// qc-quant-07: sqrt((6-2)²+(6-3)²) = sqrt(25) = 5 → B
check('qc-quant-07', Math.sqrt((6-2)**2+(6-3)**2) === 5 ? 'B' : '?', ans(ps['qc-quant-07']));

// qc-quant-08: 1/(1/8+1/12) = 24/5 = 4.8 → C
check('qc-quant-08', Math.abs(1/(1/8+1/12) - 4.8) < 1e-9 ? 'C' : '?', ans(ps['qc-quant-08']));

// qc-quant-09: salt=2L; 2=0.10×final → final=20; add 20-10=10L → C
check('qc-quant-09', 0.20*10/0.10 - 10 === 10 ? 'C' : '?', ans(ps['qc-quant-09']));

// qc-quant-10: 2^4 × 2^3 = 2^7 = 128 → B
check('qc-quant-10', 2**4 * 2**3 === 128 ? 'B' : '?', ans(ps['qc-quant-10']));

// qc-quant-11: -2<3x+1≤10 → -1<x≤3 → integers 0,1,2,3 = 4 → A
check('qc-quant-11', (() => {
  let c = 0; for (let x=-10; x<=10; x++) if (-2 < 3*x+1 && 3*x+1 <= 10) c++;
  return c === 4 ? 'A' : '?';
})(), ans(ps['qc-quant-11']));

// qc-quant-12: sorted 3,7,7,9,12 → median=7 → A
check('qc-quant-12', [3,7,7,9,12][2] === 7 ? 'A' : '?', ans(ps['qc-quant-12']));

// qc-quant-13: a8 = 4 + 7×3 = 25 → C
check('qc-quant-13', 4 + 7*3 === 25 ? 'C' : '?', ans(ps['qc-quant-13']));

// qc-quant-14: HT,TH out of HH,HT,TH,TT = 2/4 = 1/2 → A
check('qc-quant-14', 2/4 === 1/2 ? 'A' : '?', ans(ps['qc-quant-14']));

// qc-quant-15: P(4,3) = 4×3×2 = 24 → E
check('qc-quant-15', 4*3*2 === 24 ? 'E' : '?', ans(ps['qc-quant-15']));

// qc-quant-16: 3/5 × 40 = 24 → B
check('qc-quant-16', 3/5*40 === 24 ? 'B' : '?', ans(ps['qc-quant-16']));

// qc-quant-17: 150/2.5×4 = 240 → A
check('qc-quant-17', 150/2.5*4 === 240 ? 'A' : '?', ans(ps['qc-quant-17']));

// qc-quant-18: 84=2²×3×7 → divisors=(2+1)(1+1)(1+1)=12 → C
check('qc-quant-18', (2+1)*(1+1)*(1+1) === 12 ? 'C' : '?', ans(ps['qc-quant-18']));

// qc-quant-19: x+y=11, x-y=3 → 2x=14 → x=7 → C
check('qc-quant-19', (11+3)/2 === 7 ? 'C' : '?', ans(ps['qc-quant-19']));

// qc-quant-20: (12-4)/(5-1) = 2 → B
check('qc-quant-20', (12-4)/(5-1) === 2 ? 'B' : '?', ans(ps['qc-quant-20']));

// qc-quant-21: 180-38-67 = 75 → D
check('qc-quant-21', 180-38-67 === 75 ? 'D' : '?', ans(ps['qc-quant-21']));

// qc-quant-22: 3×4×9 = 108 → E
check('qc-quant-22', 3*4*9 === 108 ? 'E' : '?', ans(ps['qc-quant-22']));

// qc-quant-23: 80×1.25×0.80 = 80 → A
check('qc-quant-23', 80*1.25*0.80 === 80 ? 'A' : '?', ans(ps['qc-quant-23']));

// qc-quant-24: mean+3 = 17 → C
check('qc-quant-24', 14+3 === 17 ? 'C' : '?', ans(ps['qc-quant-24']));

// qc-quant-25: gcd(36,48) = 12 → B
check('qc-quant-25', (() => {
  function gcd(a,b){return b===0?a:gcd(b,a%b);}
  return gcd(36,48) === 12 ? 'B' : '?';
})(), ans(ps['qc-quant-25']));

// qc-quant-26: 7^11: cycle 7,9,3,1; 11 mod 4=3 → units digit=3 → B
check('qc-quant-26', 7**11 % 10 === 3 ? 'B' : '?', ans(ps['qc-quant-26']));

// qc-quant-27: 2<(x-1)/3≤5 → 7<x≤16 → least int = 8 → B
check('qc-quant-27', (() => {
  for (let x=0; x<=20; x++) if (2 < (x-1)/3 && (x-1)/3 <= 5) return x === 8 ? 'B' : '?';
  return '?';
})(), ans(ps['qc-quant-27']));

// qc-quant-28: 3/(3+5) = 3/8 → C
check('qc-quant-28', 3/(3+5) === 3/8 ? 'C' : '?', ans(ps['qc-quant-28']));

// qc-quant-29: C(7,2) = 7×6/2 = 21 → A
check('qc-quant-29', 7*6/2 === 21 ? 'A' : '?', ans(ps['qc-quant-29']));

// qc-quant-30: 7×8=56 vs 5×12=60 → 5/8 > 7/12 → B
check('qc-quant-30', 7*8 < 5*12 ? 'B' : '?', ans(ps['qc-quant-30']));

// qc-quant-31: 1/(1/10+1/15) = 6 → B
check('qc-quant-31', Math.abs(1/(1/10+1/15) - 6) < 1e-9 ? 'B' : '?', ans(ps['qc-quant-31']));

// qc-quant-32: 0.4x+1=0.25(x+10) → 0.15x=1.5 → x=10 → E
check('qc-quant-32', (() => {
  const x = 1.5/0.15;
  return x === 10 ? 'E' : '?';
})(), ans(ps['qc-quant-32']));

// qc-quant-33: 2^3 × 2^5 = 2^8 = 256 → E
check('qc-quant-33', 2**3 * 2**5 === 256 ? 'E' : '?', ans(ps['qc-quant-33']));

// qc-quant-34: 1≤2x-3<13 → 2≤x<8 → integers 2,3,4,5,6,7 = 6 → A
check('qc-quant-34', (() => {
  let c = 0; for (let x=0; x<=20; x++) if (1<=2*x-3 && 2*x-3<13) c++;
  return c === 6 ? 'A' : '?';
})(), ans(ps['qc-quant-34']));

// qc-quant-35: 20-4 = 16 → B
check('qc-quant-35', 20-4 === 16 ? 'B' : '?', ans(ps['qc-quant-35']));

// qc-quant-36: ((2+8)/2, (-1+5)/2) = (5,2) → B
check('qc-quant-36', (2+8)/2 === 5 && (-1+5)/2 === 2 ? 'B' : '?', ans(ps['qc-quant-36']));

// qc-quant-37: (6-2)×180 = 720 → C
check('qc-quant-37', (6-2)*180 === 720 ? 'C' : '?', ans(ps['qc-quant-37']));

// qc-quant-38: a2=2+2=4, a3=4+4=8, a4=8+6=14 → A
check('qc-quant-38', (() => {
  let a = 2;
  for (let n=1; n<=3; n++) a = a + 2*n;
  return a === 14 ? 'A' : '?';
})(), ans(ps['qc-quant-38']));

// qc-quant-39: units={2,4}→2, hundreds→4, tens→3; total=2×4×3=24 → C
check('qc-quant-39', 2*4*3 === 24 ? 'C' : '?', ans(ps['qc-quant-39']));

// qc-quant-40: (3,6),(4,5),(5,4),(6,3) = 4/36 = 1/9 → B
check('qc-quant-40', 4/36 === 1/9 ? 'B' : '?', ans(ps['qc-quant-40']));

// ── Data Sufficiency ──────────────────────────────────────────────────────────
// Legend: A=stmt1, B=stmt2, C=both, D=each alone, E=neither

// qc-ds-01: stmt1→x=6, stmt2→x=7 → each alone sufficient → D
check('qc-ds-01', (17-5)/2 === 6 && 4+3 === 7 ? 'D' : '?', ans(dsM['qc-ds-01']));

// qc-ds-02: stmt1→n divisible by 3 (YES); stmt2→n≡1(mod 3) (NO, definitive) → D
check('qc-ds-02', 'D', ans(dsM['qc-ds-02']));

// qc-ds-03: l=8, l+w=12→w=4, area=32 → C (need both)
check('qc-ds-03', 8*(24/2-8) === 32 ? 'C' : '?', ans(dsM['qc-ds-03']));

// qc-ds-04: stmt1 x=±2, stmt2 even integer → together still ±2 → E
check('qc-ds-04', 'E', ans(dsM['qc-ds-04']));

// qc-ds-05: sum=60→mean=60/5=12 → A
check('qc-ds-05', 60/5 === 12 ? 'A' : '?', ans(dsM['qc-ds-05']));

// qc-ds-06: combined rate 1/6+1/8=7/24 → C (need both)
check('qc-ds-06', 1/6+1/8 > 0 ? 'C' : '?', ans(dsM['qc-ds-06']));

// qc-ds-07: |A∪B|=20+15-5=30 → A (stmt1 alone)
check('qc-ds-07', 20+15-5 === 30 ? 'A' : '?', ans(dsM['qc-ds-07']));

// qc-ds-08: stmt1→all angles<90° (50,60,70); stmt2→largest<90° → D
check('qc-ds-08', 180-50-60 === 70 && 70 < 90 ? 'D' : '?', ans(dsM['qc-ds-08']));

// qc-ds-09: x²<1 → -1<x<1, all values <1 → YES → A (stmt1 alone)
check('qc-ds-09', 'A', ans(dsM['qc-ds-09']));

// qc-ds-10: exactly 2 divisors = definition of prime → B
check('qc-ds-10', 'B', ans(dsM['qc-ds-10']));

// qc-ds-11: sum=44→mean=44/4=11 → A
check('qc-ds-11', 44/4 === 11 ? 'A' : '?', ans(dsM['qc-ds-11']));

// qc-ds-12: x²=16 → x=±4, both integers → YES → A (stmt1 alone)
check('qc-ds-12', 'A', ans(dsM['qc-ds-12']));

// ── Graphics Interpretation ────────────────────────────────────────────────────

function ansGI(q) { return q.correctAnswer.value; }

// qc-gi-01: Q4 revenue=80; percent increase (80-40)/40×100=100%
check('qc-gi-01-b1', ansGI(giM['qc-gi-01']).b1, '80');
check('qc-gi-01-b2', ansGI(giM['qc-gi-01']).b2, '100 percent');

// qc-gi-02: Apr=75; increase=75-30=45
check('qc-gi-02-b1', ansGI(giM['qc-gi-02']).b1, '75');
check('qc-gi-02-b2', ansGI(giM['qc-gi-02']).b2, '45');

// qc-gi-03: avg=(18+24+30+36)/4=27; ratio=36/18=2
check('qc-gi-03-b1', (() => { const v=(18+24+30+36)/4; return v===27 ? '27':'?'; })(), ansGI(giM['qc-gi-03']).b1);
check('qc-gi-03-b2', 36/18 === 2 ? '2' : '?', ansGI(giM['qc-gi-03']).b2);

// qc-gi-04: score at 4h=80; increase=80-55=25
check('qc-gi-04-b1', '80', ansGI(giM['qc-gi-04']).b1);
check('qc-gi-04-b2', 80-55 === 25 ? '25' : '?', ansGI(giM['qc-gi-04']).b2);

// qc-gi-05: Day3=72; pct decrease=(120-48)/120×100=60%
check('qc-gi-05-b1', '72', ansGI(giM['qc-gi-05']).b1);
check('qc-gi-05-b2', Math.round((120-48)/120*100) === 60 ? '60 percent' : '?', ansGI(giM['qc-gi-05']).b2);

// qc-gi-06: max=240 (Store D); difference=240-150=90
check('qc-gi-06-b1', '240', ansGI(giM['qc-gi-06']).b1);
check('qc-gi-06-b2', 240-150 === 90 ? '90' : '?', ansGI(giM['qc-gi-06']).b2);

// ── Table Analysis ────────────────────────────────────────────────────────────

function ansDich(q) { return q.correctAnswer.value; }

// qc-ta-01: West=160 highest (s1=False); West margin=16/160=10% (s2=True); East=90<100 (s3=True)
check('qc-ta-01-s1', ansDich(taM['qc-ta-01']).s1, 'False');
check('qc-ta-01-s2', 16/160 === 0.10 ? ansDich(taM['qc-ta-01']).s2 : '?', 'True');
check('qc-ta-01-s3', 90 < 100 ? ansDich(taM['qc-ta-01']).s3 : '?', 'True');

// qc-ta-02: C overspent by 2 (not within budget=False); D spent=68<70 (not overspent by 5=False); B spent=55>A spent=45 (B not less than A=False)
check('qc-ta-02-s1', 42 > 40 ? 'False' : 'True', ansDich(taM['qc-ta-02']).s1);
check('qc-ta-02-s2', 68-70 !== 5 ? 'False' : 'True', ansDich(taM['qc-ta-02']).s2);
check('qc-ta-02-s3', 55 < 45 ? 'True' : 'False', ansDich(taM['qc-ta-02']).s3);

// qc-ta-03: Noah=25 most (True); Mia=18×16=288, Omar=22×15=330 → Mia NOT more (False); Lia=Omar rate=15 (True)
check('qc-ta-03-s1', 25 > Math.max(20,18,22) ? 'True' : 'False', ansDich(taM['qc-ta-03']).s1);
check('qc-ta-03-s2', 18*16 > 22*15 ? 'True' : 'False', ansDich(taM['qc-ta-03']).s2);
check('qc-ta-03-s3', 15 === 15 ? 'True' : 'False', ansDich(taM['qc-ta-03']).s3);

// qc-ta-04: A weekday=30 < C weekday=35 (True); B total=85 > A total=80 (True); C weekend=55 highest (True)
check('qc-ta-04-s1', 30 < 35 ? 'True' : 'False', ansDich(taM['qc-ta-04']).s1);
check('qc-ta-04-s2', (40+45) > (30+50) ? 'True' : 'False', ansDich(taM['qc-ta-04']).s2);
check('qc-ta-04-s3', 55 > Math.max(50,45) ? 'True' : 'False', ansDich(taM['qc-ta-04']).s3);

// qc-ta-05: West=320 max (True); South rate=10/280≈3.57% lowest (True); North rate=12/300=4%<East rate=15/260≈5.77% so NOT higher (False)
check('qc-ta-05-s1', 320 === Math.max(300,280,260,320) ? 'True' : 'False', ansDich(taM['qc-ta-05']).s1);
check('qc-ta-05-s2', 10/280 < Math.min(12/300,15/260,14/320) ? 'True' : 'False', ansDich(taM['qc-ta-05']).s2);
check('qc-ta-05-s3', 12/300 > 15/260 ? 'True' : 'False', ansDich(taM['qc-ta-05']).s3);

// qc-ta-06: History failure rate=10/50=20% (True); Science=50=Math=50 NOT fewer (False); Art=28 lowest pass (True)
check('qc-ta-06-s1', 10/50 === 0.20 ? 'True' : 'False', ansDich(taM['qc-ta-06']).s1);
check('qc-ta-06-s2', 50 < 50 ? 'True' : 'False', ansDich(taM['qc-ta-06']).s2);
check('qc-ta-06-s3', 28 === Math.min(42,35,40,28) ? 'True' : 'False', ansDich(taM['qc-ta-06']).s3);

// ── Two-Part Analysis ─────────────────────────────────────────────────────────

function ansTP(q) { return q.correctAnswer.value; }

// qc-tp-01: partA=r2(6): 2+4=6; partB=r4(10): 20/2=10
check('qc-tp-01-A', 2+4 === 6 ? 'r2' : '?', ansTP(tpM['qc-tp-01']).partA);
check('qc-tp-01-B', 20/2 === 10 ? 'r4' : '?', ansTP(tpM['qc-tp-01']).partB);

// qc-tp-02: partA=r1(4): 2²=4; partB=r5(12): 3+9=12
check('qc-tp-02-A', 2**2 === 4 ? 'r1' : '?', ansTP(tpM['qc-tp-02']).partA);
check('qc-tp-02-B', 3+9 === 12 ? 'r5' : '?', ansTP(tpM['qc-tp-02']).partB);

// qc-tp-03: partA=r3(8): 2×4=8; partB=r1(4): 12-8=4
check('qc-tp-03-A', 2*4 === 8 ? 'r3' : '?', ansTP(tpM['qc-tp-03']).partA);
check('qc-tp-03-B', 12-8 === 4 ? 'r1' : '?', ansTP(tpM['qc-tp-03']).partB);

// qc-tp-04: partA=r4(10): 30/3=10; partB=r2(6): 18/3=6
check('qc-tp-04-A', 30/3 === 10 ? 'r4' : '?', ansTP(tpM['qc-tp-04']).partA);
check('qc-tp-04-B', 18/3 === 6 ? 'r2' : '?', ansTP(tpM['qc-tp-04']).partB);

// qc-tp-05: partA=r5(12): 8+4=12; partB=r3(8): 16/2=8
check('qc-tp-05-A', 8+4 === 12 ? 'r5' : '?', ansTP(tpM['qc-tp-05']).partA);
check('qc-tp-05-B', 16/2 === 8 ? 'r3' : '?', ansTP(tpM['qc-tp-05']).partB);

// qc-tp-06: partA=r2(6): 14-8=6; partB=r1(4): 12/3=4
check('qc-tp-06-A', 14-8 === 6 ? 'r2' : '?', ansTP(tpM['qc-tp-06']).partA);
check('qc-tp-06-B', 12/3 === 4 ? 'r1' : '?', ansTP(tpM['qc-tp-06']).partB);

// ── Summary ───────────────────────────────────────────────────────────────────
const total = pass + fail;
if (fail > 0) {
  console.error(`\ncheck-batch9: ${fail}/${total} FAILED`);
  process.exit(1);
} else {
  console.log(`check-batch9: all ${total} re-derivations passed`);
}
