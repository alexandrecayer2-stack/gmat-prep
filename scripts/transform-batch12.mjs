// Transform the raw generated batch (Downloads/gmat_batch_001.json) into the
// project's content-file format, split by section:
//   QR → quant-12.json      (problem_solving)
//   VR → verbal-12.json     (critical_reasoning)
//   DS → data_insights-12.json (data_sufficiency, statements folded into stem)
//
// Correctness-critical fields (answer letter, choice keys, choice text) are
// carried VERBATIM from the source. Only presentation is derived: KaTeX math
// wrapping for QR/DS, and the stimulus/question split for CR. The content gate
// (`npm run validate`) is the backstop. Run dry first, then with --write.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = '/Users/alexandre/Downloads/gmat_batch_001.json';
const OUT = join(process.cwd(), 'content', 'questions');
const WRITE = process.argv.includes('--write');

const batch = JSON.parse(readFileSync(SRC, 'utf8'));

// Verified corrections for source answers that are provably wrong (independent
// re-derivation; see check-batch12.mjs). Keyed by source id. The answer letter
// is replaced and the explanation rewritten to match the correct answer.
const OVERRIDES = {
  'DS-006': { answer: 'E', explanation: 'Les deux énoncés donnent un quatrième nombre égal à 28 − 18 = 10, mais les trois nombres de somme 18 ne sont pas connus un à un : l’un d’eux peut dépasser 10 (par exemple 16, 1 et 1). Le plus grand des quatre n’est donc pas déterminé, même en combinant les deux énoncés.' },
  'DS-012': { answer: 'D', explanation: '(1) Si la somme dépasse 10, la moyenne (somme ÷ 2) dépasse 5. (2) Si les deux nombres sont positifs avec un produit supérieur à 25, l’inégalité arithmético-géométrique donne une moyenne au moins égale à la racine du produit, donc supérieure à 5. Chaque énoncé suffit seul.' },
  'DS-014': { answer: 'D', explanation: '(1) Deux côtés égaux : le triangle est isocèle (réponse « oui »). (2) Des angles de 30, 60 et 90 degrés décrivent un triangle scalène, donc non isocèle (réponse « non » établie avec certitude). Chaque énoncé répond seul à la question.' },
  'DS-027': { answer: 'E', explanation: 'Les diviseurs de 24 strictement supérieurs à 6 sont 8, 12 et 24 : l’énoncé (1) laisse donc plusieurs valeurs possibles. L’énoncé (2) « n est pair » est aussi insuffisant. Ensemble, 8, 12 et 24 étant tous pairs, n n’est toujours pas déterminé.' },
  'DS-036': { answer: 'D', explanation: '(1) Un rapport A:B = 5:4 implique A > B. (2) A − B = 3 étant positif, on a aussi A > B. Chaque énoncé suffit seul à répondre « oui ».' },
  'DS-046': { answer: 'E', explanation: 'Deux entiers impairs consécutifs de produit 15 sont soit 3 et 5 (somme 8), soit −5 et −3 (somme −8). L’énoncé (1) laisse donc p = 8 ou p = −8, et l’énoncé (2) « p est pair » ne tranche pas, les deux valeurs étant paires. Même réunis, les énoncés ne déterminent pas p.' },
};

// ---------------------------------------------------------------------------
// Math formatting — wrap clear inline math in $...$ (KaTeX), bracing exponents
// so multi-char powers like 7^10 render as 7^{10}. Operands are numbers, single
// (bounded) variables, coefficient-variables (2x), paren groups and |abs|
// groups — never multi-letter words, so prose and hyphenated words (y-intercept,
// four-day) are left untouched.
// ---------------------------------------------------------------------------
const EXPSUF = String.raw`(?:\^\{?[0-9A-Za-z]+\}?)?`;
const GRP = String.raw`(?:\([^()]*\)|\|[^|]*\|)${EXPSUF}`;
const NUM = String.raw`[-+]?\d+(?:\.\d+)?(?![A-Za-z])${EXPSUF}`;
const VAR = String.raw`\d*(?<![A-Za-z])[A-Za-z](?![A-Za-z])${EXPSUF}`;
// A term is an operand optionally followed by paren groups (coefficient × group,
// e.g. 3(2x-5) or (2^3)(4^2)). Only GRP may be juxtaposed — never a bare letter,
// so words like "intercept" are never swept up.
const OPERAND = `(?:${GRP}|${NUM}|${VAR})(?:${GRP})*`;
const OP = String.raw`[ ]?[-+*/=<>:][ ]?`;
const EXPR_RE = new RegExp(`${OPERAND}(?:${OP}${OPERAND})+`, 'g');
const EXP_RE = new RegExp(String.raw`(?<![A-Za-z$\\])(?:\d*[A-Za-z]|\d+|\([^()]*\))\^[0-9A-Za-z]+(?![A-Za-z$])`, 'g');

const braceExp = (s) => s.replace(/\^\{?([0-9A-Za-z]+)\}?/g, (_, e) => `^{${e}}`);

// Apply fn only to text OUTSIDE existing $...$ spans, so each pass protects the
// spans the previous pass produced.
const protect = (text, fn) =>
  text
    .split(/(\$[^$]*\$)/)
    .map((seg) => (seg.startsWith('$') && seg.endsWith('$') ? seg : fn(seg)))
    .join('');

const wrapSqrt = (s) =>
  s.replace(/\bsqrt\(([^()]*)\)/g, (_, inner) => `$\\sqrt{${braceExp(inner.trim())}}$`);
const wrapExpr = (s) => s.replace(EXPR_RE, (m) => `$${braceExp(m)}$`);
const wrapExp = (s) => s.replace(EXP_RE, (m) => `$${braceExp(m)}$`);

// Full formatting for QR/DS stems, statements and choices.
function fmtMath(text) {
  if (!text) return text;
  let s = protect(text, wrapSqrt);
  s = protect(s, wrapExpr);
  s = protect(s, wrapExp);
  return s;
}
// Lighter pass for explanations (French prose): sqrt + standalone exponents
// only — avoids wrapping every equality mid-sentence.
function fmtExpl(text) {
  if (!text) return text;
  let s = protect(text, wrapSqrt);
  s = protect(s, wrapExp);
  return s;
}

// ---------------------------------------------------------------------------
// CR stimulus / question split: the last sentence is the question (or the
// trailing completion lead-in, e.g. "The argument assumes that"); everything
// before it is the stimulus.
// ---------------------------------------------------------------------------
function splitCR(stem) {
  const parts = stem.trim().split(/(?<=[.?!])\s+/);
  if (parts.length < 2) return { passageOrStimulus: '', stem: stem.trim() };
  return { passageOrStimulus: parts.slice(0, -1).join(' '), stem: parts[parts.length - 1] };
}

// ---------------------------------------------------------------------------
// Topic + timing helpers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const quant = [];
const verbal = [];
const di = [];
let nq = 0, nv = 0, nd = 0;

for (const q of batch.questions) {
  if (q.section === 'QR') {
    const id = `g4-quant-${String(++nq).padStart(2, '0')}`;
    // "Solve for x:" — the colon here is punctuation, not a ratio. Wrap the lone
    // variable and keep the colon outside math before the general pass runs.
    const stem0 = q.stem.replace(/\b([Ss]olve for )([A-Za-z])(:)/, (_, a, b, c) => `${a}$${b}$${c}`);
    quant.push({
      id, section: 'quant', type: 'problem_solving',
      topic: afterDash(q.topic), difficulty: q.difficulty, orderIndex: 0,
      stem: fmtMath(stem0), assets: {},
      // Choices render as plain text (answer-inputs.tsx renders {c.text}, not via
      // the KaTeX Markdown component), so keep option text raw — no $ wrapping.
      choices: Object.entries(q.options).map(([key, text]) => ({ key, text })),
      correctAnswer: { format: 'single', value: q.answer },
      explanation: fmtExpl(q.explanation),
      estimatedTimeSeconds: time('problem_solving', q.difficulty),
    });
  } else if (q.section === 'VR') {
    const id = `g4-cr-${String(++nv).padStart(2, '0')}`;
    const { passageOrStimulus, stem } = splitCR(q.stem);
    verbal.push({
      id, section: 'verbal', type: 'critical_reasoning',
      topic: crTopic(q.topic), difficulty: q.difficulty, orderIndex: 0,
      passageOrStimulus, stem, assets: {},
      choices: Object.entries(q.options).map(([key, text]) => ({ key, text })),
      correctAnswer: { format: 'single', value: q.answer },
      explanation: q.explanation,
      estimatedTimeSeconds: time('critical_reasoning', q.difficulty),
    });
  } else if (q.section === 'DS') {
    const id = `g4-ds-${String(++nd).padStart(2, '0')}`;
    const stem = `${fmtMath(q.stem)}\n\n(1) ${fmtMath(q.statement_1)}\n(2) ${fmtMath(q.statement_2)}`;
    const ov = OVERRIDES[q.id];
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
  writeFileSync(join(OUT, 'quant-12.json'), JSON.stringify(quant, null, 2) + '\n');
  writeFileSync(join(OUT, 'verbal-12.json'), JSON.stringify(verbal, null, 2) + '\n');
  writeFileSync(join(OUT, 'data_insights-12.json'), JSON.stringify(di, null, 2) + '\n');
  console.log(`✓ Wrote quant-12 (${quant.length}), verbal-12 (${verbal.length}), data_insights-12 (${di.length}).`);
} else {
  console.log('=== DRY RUN (no files written) — review math + CR splits ===\n');
  console.log('--- QR stems & choices ---');
  for (const q of quant) console.log(q.id, '|', q.stem, '||', q.choices.map((c) => c.text).join(' '));
  console.log('\n--- DS stems (formatted) ---');
  for (const q of di) console.log(q.id, '|', q.stem.replace(/\n/g, ' / '));
  console.log('\n--- DS/QR explanations (sample with math) ---');
  for (const q of [...quant, ...di].filter((q) => /\$/.test(q.explanation))) console.log(q.id, '|', q.explanation);
  console.log('\n--- CR splits ---');
  for (const q of verbal) console.log(`${q.id} [STIM] ${q.passageOrStimulus}\n       [Q] ${q.stem}`);
}
