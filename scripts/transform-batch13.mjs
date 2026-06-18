// Transform Downloads/gmat_batch.json into the project's content format as
// batch 13 (the "g5" set), split by section:
//   QR → quant-13.json      (problem_solving)
//   VR → verbal-13.json     (critical_reasoning)
//   DS → data_insights-13.json (data_sufficiency)
//
// Same pipeline as transform-batch12.mjs. Differences:
//   - SKIP drops 2 source items that duplicate existing bank content:
//       QR-007 (verbatim of g4-quant-08) and DS-010 (exact in-batch dup of DS-006).
//   - Currency `$` in Markdown fields (stem/explanation/stimulus) is escaped to
//     `\$` so it doesn't open KaTeX math mode (the gate rejects unbalanced `$`).
//   - Choices are kept raw (rendered as plain text by answer-inputs.tsx).
// All 33 QR and 33 DS answers were independently re-derived and are correct, so
// there are no answer OVERRIDES this batch (see check-batch13.mjs).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = '/Users/alexandre/Downloads/gmat_batch.json';
const OUT = join(process.cwd(), 'content', 'questions');
const WRITE = process.argv.includes('--write');
const SKIP = new Set(['QR-007', 'DS-010']);

const batch = JSON.parse(readFileSync(SRC, 'utf8'));

// Clarity rewrites for explanations whose raw source notation renders poorly
// (e.g. the French decimal "1,10^2"). Keyed by source id; answers are unchanged.
const EXPL_OVERRIDES = {
  'QR-021': 'La valeur finale est 1000 × (1,10)² = 1000 × 1,21 = 1210.',
};

// ---------------------------------------------------------------------------
// Math formatting (identical operand grammar to batch 12). Markdown fields also
// get literal currency `$` escaped to `\$` up front.
// ---------------------------------------------------------------------------
const EXPSUF = String.raw`(?:\^\{?[0-9A-Za-z]+\}?)?`;
const GRP = String.raw`(?:\([^()]*\)|\|[^|]*\|)${EXPSUF}`;
const NUM = String.raw`[-+]?\d+(?:\.\d+)?(?![A-Za-z])${EXPSUF}`;
const VAR = String.raw`\d*(?<![A-Za-z])[A-Za-z](?![A-Za-z])${EXPSUF}`;
const OPERAND = `(?:${GRP}|${NUM}|${VAR})(?:${GRP})*`;
const OP = String.raw`[ ]?[-+*/=<>:][ ]?`;
const EXPR_RE = new RegExp(`${OPERAND}(?:${OP}${OPERAND})+`, 'g');
// Lookbehind excludes a preceding letter/digit/comma/dot so the base is a whole
// token, never a decimal's fractional part or the middle of a number (French
// "1,10^2" must stay one number, not become "1,1" + "0^2").
const EXP_RE = new RegExp(String.raw`(?<![A-Za-z$\\,.\d])(?:\d*[A-Za-z]|\d+|\([^()]*\))\^[0-9A-Za-z]+(?![A-Za-z$])`, 'g');

const braceExp = (s) => s.replace(/\^\{?([0-9A-Za-z]+)\}?/g, (_, e) => `^{${e}}`);
const esc = (t) => (t ? t.replace(/\$/g, '\\$') : t); // escape literal currency
const protect = (text, fn) =>
  text.split(/(\$[^$]*\$)/).map((seg) => (seg.startsWith('$') && seg.endsWith('$') ? seg : fn(seg))).join('');
const wrapSqrt = (s) => s.replace(/\bsqrt\(([^()]*)\)/g, (_, inner) => `$\\sqrt{${braceExp(inner.trim())}}$`);
const wrapExpr = (s) => s.replace(EXPR_RE, (m) => `$${braceExp(m)}$`);
const wrapExp = (s) => s.replace(EXP_RE, (m) => `$${braceExp(m)}$`);

function fmtMath(text) {
  if (!text) return text;
  let s = protect(esc(text), wrapSqrt);
  s = protect(s, wrapExpr);
  s = protect(s, wrapExp);
  return s;
}
function fmtExpl(text) {
  if (!text) return text;
  let s = protect(esc(text), wrapSqrt);
  s = protect(s, wrapExp);
  return s;
}

// CR stimulus / question split (last sentence = question / completion lead-in).
function splitCR(stem) {
  const parts = stem.trim().split(/(?<=[.?!])\s+/);
  if (parts.length < 2) return { passageOrStimulus: '', stem: stem.trim() };
  return { passageOrStimulus: parts.slice(0, -1).join(' '), stem: parts[parts.length - 1] };
}

const afterDash = (t) => (t.includes(' - ') ? t.split(' - ').slice(1).join(' - ') : t).toLowerCase().trim();
function crTopic(t) {
  const s = t.toLowerCase();
  if (/weaken/.test(s)) return 'weaken';
  if (/strengthen/.test(s)) return 'strengthen';
  if (/necessary assumption|assumption/.test(s)) return 'assumption';
  if (/inference/.test(s)) return 'inference';
  if (/paradox|discrepancy/.test(s)) return 'paradox';
  if (/flaw/.test(s)) return 'flaw';
  if (/evaluate/.test(s)) return 'evaluate';
  if (/conclusion/.test(s)) return 'main idea';
  if (/complete/.test(s)) return 'complete the argument';
  return afterDash(t);
}
const time = (type, diff) =>
  type === 'problem_solving' ? { easy: 90, medium: 120, hard: 150 }[diff]
  : type === 'data_sufficiency' ? { easy: 120, medium: 120, hard: 150 }[diff]
  : { easy: 90, medium: 105, hard: 120 }[diff];

const quant = [];
const verbal = [];
const di = [];
let nq = 0, nv = 0, nd = 0;

for (const q of batch.questions) {
  if (SKIP.has(q.id)) continue;
  if (q.section === 'QR') {
    const id = `g5-quant-${String(++nq).padStart(2, '0')}`;
    const stem0 = q.stem.replace(/\b([Ss]olve for )([A-Za-z])(:)/, (_, a, b, c) => `${a}$${b}$${c}`);
    quant.push({
      id, section: 'quant', type: 'problem_solving',
      topic: afterDash(q.topic), difficulty: q.difficulty, orderIndex: 0,
      stem: fmtMath(stem0), assets: {},
      choices: Object.entries(q.options).map(([key, text]) => ({ key, text })),
      correctAnswer: { format: 'single', value: q.answer },
      explanation: EXPL_OVERRIDES[q.id] ?? fmtExpl(q.explanation),
      estimatedTimeSeconds: time('problem_solving', q.difficulty),
    });
  } else if (q.section === 'VR') {
    const id = `g5-cr-${String(++nv).padStart(2, '0')}`;
    const { passageOrStimulus, stem } = splitCR(q.stem);
    verbal.push({
      id, section: 'verbal', type: 'critical_reasoning',
      topic: crTopic(q.topic), difficulty: q.difficulty, orderIndex: 0,
      passageOrStimulus: esc(passageOrStimulus), stem: esc(stem), assets: {},
      choices: Object.entries(q.options).map(([key, text]) => ({ key, text })),
      correctAnswer: { format: 'single', value: q.answer },
      explanation: esc(q.explanation),
      estimatedTimeSeconds: time('critical_reasoning', q.difficulty),
    });
  } else if (q.section === 'DS') {
    const id = `g5-ds-${String(++nd).padStart(2, '0')}`;
    const stem = `${fmtMath(q.stem)}\n\n(1) ${fmtMath(q.statement_1)}\n(2) ${fmtMath(q.statement_2)}`;
    di.push({
      id, section: 'data_insights', type: 'data_sufficiency',
      topic: afterDash(q.topic), difficulty: q.difficulty, orderIndex: 0,
      stem, assets: {},
      correctAnswer: { format: 'single', value: q.answer },
      explanation: fmtExpl(q.explanation),
      estimatedTimeSeconds: time('data_sufficiency', q.difficulty),
    });
  }
}

if (WRITE) {
  writeFileSync(join(OUT, 'quant-13.json'), JSON.stringify(quant, null, 2) + '\n');
  writeFileSync(join(OUT, 'verbal-13.json'), JSON.stringify(verbal, null, 2) + '\n');
  writeFileSync(join(OUT, 'data_insights-13.json'), JSON.stringify(di, null, 2) + '\n');
  console.log(`✓ Wrote quant-13 (${quant.length}), verbal-13 (${verbal.length}), data_insights-13 (${di.length}). Skipped: ${[...SKIP].join(', ')}`);
} else {
  console.log('=== DRY RUN ===\n--- QR (currency + math) ---');
  for (const q of quant) console.log(q.id, '|', q.stem, '||', q.choices.map((c) => c.text).join(' / '));
  console.log('\n--- DS ---');
  for (const q of di) console.log(q.id, '|', q.stem.replace(/\n/g, ' / '));
  console.log('\n--- CR splits ---');
  for (const q of verbal) console.log(`${q.id} [S] ${q.passageOrStimulus}\n      [Q] ${q.stem}`);
  console.log('\n--- explanations with $ (check currency escaped) ---');
  for (const q of [...quant, ...di, ...verbal].filter((q) => q.explanation.includes('$'))) console.log(q.id, '|', q.explanation);
}
