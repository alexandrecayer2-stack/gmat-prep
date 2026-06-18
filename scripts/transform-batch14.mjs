// Transform Downloads/gmat_batch-14.json into the project's content format as
// batch 14 (the "g6" set), split by section:
//   QR → quant-14.json         (problem_solving)
//   VR → verbal-14.json        (critical_reasoning)
//   DS → data_insights-14.json (data_sufficiency)
//
// Same pipeline as transform-batch13.mjs. Differences this batch:
//   - SKIP drops 2 source items:
//       QR-001 (verbatim of existing g5-quant-01, the "+20% then -25% => -10%"
//               percentage item) and DS-032 (exact in-batch dup of DS-012).
//   - OVERRIDES fixes one wrong source answer:
//       DS-017 was labeled D but only statement (1) (x + y = 12) gives the sum;
//       statement (2) (x - y = 4) alone does not, so the answer is A. Its source
//       explanation was an unfinished editing note and is rewritten.
//   - STMT_OVERRIDES disambiguates DS-003: "an integer between 1 and 3" is read
//       as the open interval {2} under the usual GMAT convention, which would make
//       (1) alone sufficient (A) and contradict the intended C. Reworded to
//       "a positive integer less than 4" ({1,2,3}) so the intended C holds.
//   - Currency `$` in Markdown fields (stem/explanation) is escaped to `\$`.
//   - Choices are kept raw (rendered as plain text by answer-inputs.tsx).
// Every kept QR and DS answer is independently re-derived in check-batch14.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = '/Users/alexandre/Downloads/gmat_batch-14.json';
const OUT = join(process.cwd(), 'content', 'questions');
const WRITE = process.argv.includes('--write');
const SKIP = new Set(['QR-001', 'DS-032']);

const batch = JSON.parse(readFileSync(SRC, 'utf8'));

// Wrong/ambiguous source answers corrected on import (answer + clean explanation).
const OVERRIDES = {
  'DS-017': {
    answer: 'A',
    explanation:
      "L'énoncé (1) x + y = 12 donne directement la somme demandée. L'énoncé (2) x − y = 4 ne la fixe pas : par exemple x = 4, y = 0 donne une somme de 4, alors que x = 5, y = 1 donne une somme de 6. Seul l'énoncé (1) suffit.",
  },
};

// Statement rewrites that remove ambiguity without changing the intended answer.
const STMT_OVERRIDES = {
  'DS-003': { statement_1: 'z is a positive integer less than 4' },
};

// ---------------------------------------------------------------------------
// Math formatting (identical operand grammar to batch 13). Markdown fields also
// get literal currency `$` escaped to `\$` up front.
// ---------------------------------------------------------------------------
const EXPSUF = String.raw`(?:\^\{?[0-9A-Za-z]+\}?)?`;
const GRP = String.raw`(?:\([^()]*\)|\|[^|]*\|)${EXPSUF}`;
const NUM = String.raw`[-+]?\d+(?:\.\d+)?(?![A-Za-z])${EXPSUF}`;
const VAR = String.raw`\d*(?<![A-Za-z])[A-Za-z](?![A-Za-z])${EXPSUF}`;
const OPERAND = `(?:${GRP}|${NUM}|${VAR})(?:${GRP})*`;
const OP = String.raw`[ ]?[-+*/=<>:][ ]?`;
const EXPR_RE = new RegExp(`${OPERAND}(?:${OP}${OPERAND})+`, 'g');
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
  const ov = OVERRIDES[q.id];
  const stmt = STMT_OVERRIDES[q.id] ?? {};
  if (q.section === 'QR') {
    const id = `g6-quant-${String(++nq).padStart(2, '0')}`;
    const stem0 = q.stem.replace(/\b([Ss]olve for )([A-Za-z])(:)/, (_, a, b, c) => `${a}$${b}$${c}`);
    quant.push({
      id, section: 'quant', type: 'problem_solving',
      topic: afterDash(q.topic), difficulty: q.difficulty, orderIndex: 0,
      stem: fmtMath(stem0), assets: {},
      choices: Object.entries(q.options).map(([key, text]) => ({ key, text })),
      correctAnswer: { format: 'single', value: ov ? ov.answer : q.answer },
      explanation: ov ? ov.explanation : fmtExpl(q.explanation),
      estimatedTimeSeconds: time('problem_solving', q.difficulty),
    });
  } else if (q.section === 'VR') {
    const id = `g6-cr-${String(++nv).padStart(2, '0')}`;
    const { passageOrStimulus, stem } = splitCR(q.stem);
    verbal.push({
      id, section: 'verbal', type: 'critical_reasoning',
      topic: crTopic(q.topic), difficulty: q.difficulty, orderIndex: 0,
      passageOrStimulus: esc(passageOrStimulus), stem: esc(stem), assets: {},
      choices: Object.entries(q.options).map(([key, text]) => ({ key, text })),
      correctAnswer: { format: 'single', value: ov ? ov.answer : q.answer },
      explanation: ov ? ov.explanation : esc(q.explanation),
      estimatedTimeSeconds: time('critical_reasoning', q.difficulty),
    });
  } else if (q.section === 'DS') {
    const id = `g6-ds-${String(++nd).padStart(2, '0')}`;
    const s1 = stmt.statement_1 ?? q.statement_1;
    const s2 = stmt.statement_2 ?? q.statement_2;
    const stem = `${fmtMath(q.stem)}\n\n(1) ${fmtMath(s1)}\n(2) ${fmtMath(s2)}`;
    di.push({
      id, section: 'data_insights', type: 'data_sufficiency',
      topic: afterDash(q.topic), difficulty: q.difficulty, orderIndex: 0,
      stem, assets: {},
      correctAnswer: { format: 'single', value: ov ? ov.answer : q.answer },
      explanation: ov ? ov.explanation : fmtExpl(q.explanation),
      estimatedTimeSeconds: time('data_sufficiency', q.difficulty),
    });
  }
}

if (WRITE) {
  writeFileSync(join(OUT, 'quant-14.json'), JSON.stringify(quant, null, 2) + '\n');
  writeFileSync(join(OUT, 'verbal-14.json'), JSON.stringify(verbal, null, 2) + '\n');
  writeFileSync(join(OUT, 'data_insights-14.json'), JSON.stringify(di, null, 2) + '\n');
  console.log(`✓ Wrote quant-14 (${quant.length}), verbal-14 (${verbal.length}), data_insights-14 (${di.length}). Skipped: ${[...SKIP].join(', ')}`);
} else {
  console.log('=== DRY RUN ===\n--- QR (currency + math) ---');
  for (const q of quant) console.log(q.id, '|', q.stem, '||', q.choices.map((c) => c.text).join(' / '));
  console.log('\n--- DS ---');
  for (const q of di) console.log(q.id, '|', q.stem.replace(/\n/g, ' / '), '=>', q.correctAnswer.value);
  console.log('\n--- CR splits ---');
  for (const q of verbal) console.log(`${q.id} [S] ${q.passageOrStimulus}\n      [Q] ${q.stem}`);
  console.log('\n--- explanations with $ (check currency escaped) ---');
  for (const q of [...quant, ...di, ...verbal].filter((q) => q.explanation.includes('$'))) console.log(q.id, '|', q.explanation);
}
