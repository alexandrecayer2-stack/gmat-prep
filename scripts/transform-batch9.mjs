#!/usr/bin/env node
/**
 * Transform gmat_focus_questions(1).json (batch 9) into content files.
 *
 * Fixes applied:
 *  - LaTeX single-backslash sequences pre-processed before JSON.parse
 *  - Question IDs prefixed with "qc-" to avoid collisions
 *  - Group IDs renamed: rc-p1/p2/p3 → rc-c1/c2/c3
 *  - DS choices removed (UI renders them from question type)
 *  - q-quant-32 wrong answer fixed (x=10, choice E "8"→"10", answer C→E)
 *  - ds-02 answer A→D (stmt2 definitively answers "no")
 *  - ds-09 answer C→A (x²<1 → -1<x<1 → all values <1 → sufficient alone)
 *  - ds-12 answer C→A (x²=16 → x=±4, both integers → sufficient alone)
 *  - ta-01 s1 "True"→"False" (West=160 is highest, not South=150)
 *  - ta-04 s2 "False"→"True" (B total=85 > A total=80)
 *  - Two-part stems replaced with actual problem content
 *  - Two-part column labels made descriptive
 *  - orderIndex assigned (0 for all, sequential for RC within group)
 *  - Empty assets: {} preserved (schema allows it)
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const src = resolve(root, '..', 'Downloads', 'gmat_focus_questions(1).json');

// ── Step 1: Pre-process raw text to fix single-backslash LaTeX ───────────────
// These LaTeX sequences appear as \frac, \binom, \right in the file but need
// to be \\frac etc. for valid JSON. Use negative lookbehind to avoid
// double-escaping sequences that are already correct (\\frac → two backslashes).
let raw = readFileSync(src, 'utf8');
raw = raw.replace(/(?<!\\)\\(frac|binom|right|left)/g, '\\\\$1');

const data = JSON.parse(raw);
const questions = data.QUESTIONS;
const groups = data.GROUPS;

// ── Step 2: ID and group mapping ─────────────────────────────────────────────
const GROUP_MAP = { 'rc-p1': 'rc-c1', 'rc-p2': 'rc-c2', 'rc-p3': 'rc-c3' };

function remapId(originalId) {
  // q-quant-XX → qc-quant-XX
  // q-cr-XX    → qc-cr-XX
  // rc-p1-q1   → qc-rc-c1-q1  (etc.)
  // ds-XX      → qc-ds-XX
  // gi-XX      → qc-gi-XX
  // ta-XX      → qc-ta-XX
  // tp-XX      → qc-tp-XX
  if (originalId.startsWith('q-')) return 'qc-' + originalId.slice(2);
  if (originalId.startsWith('rc-p1-')) return 'qc-rc-c1-' + originalId.slice(6);
  if (originalId.startsWith('rc-p2-')) return 'qc-rc-c2-' + originalId.slice(6);
  if (originalId.startsWith('rc-p3-')) return 'qc-rc-c3-' + originalId.slice(6);
  if (originalId.startsWith('ds-')) return 'qc-ds-' + originalId.slice(3);
  if (originalId.startsWith('gi-')) return 'qc-gi-' + originalId.slice(3);
  if (originalId.startsWith('ta-')) return 'qc-ta-' + originalId.slice(3);
  if (originalId.startsWith('tp-')) return 'qc-tp-' + originalId.slice(3);
  return 'qc-' + originalId;
}

// ── Step 3: Two-part stem/column rewrites ────────────────────────────────────
const TWO_PART_FIXES = {
  'tp-01': {
    stem: 'Evaluate each arithmetic expression.\n\nPart A: What is the value of $2+4$?\n\nPart B: What is the value of $20\\div 2$?',
    colA: 'Value of $2+4$',
    colB: 'Value of $20\\div 2$',
  },
  'tp-02': {
    stem: 'Evaluate each expression.\n\nPart A: What is the value of $2^2$?\n\nPart B: What is the value of $3+9$?',
    colA: 'Value of $2^2$',
    colB: 'Value of $3+9$',
  },
  'tp-03': {
    stem: 'Use the given measurements to compute each quantity.\n\nPart A: What is the area of a rectangle with length $2$ and width $4$?\n\nPart B: What is the value of $12-8$?',
    colA: 'Area of rectangle (length 2, width 4)',
    colB: 'Value of $12-8$',
  },
  'tp-04': {
    stem: 'Use the given rates to compute each value.\n\nPart A: What is the value of $30\\div 3$?\n\nPart B: What is the value of $18\\div 3$?',
    colA: 'Value of $30\\div 3$',
    colB: 'Value of $18\\div 3$',
  },
  'tp-05': {
    stem: 'Use the given data to compute each value.\n\nPart A: What is the value of $8+4$?\n\nPart B: What is the value of $16\\div 2$?',
    colA: 'Value of $8+4$',
    colB: 'Value of $16\\div 2$',
  },
  'tp-06': {
    stem: 'Determine each requested value.\n\nPart A: What is the value of $14-8$?\n\nPart B: What is the value of $12\\div 3$?',
    colA: 'Value of $14-8$',
    colB: 'Value of $12\\div 3$',
  },
};

// ── Step 4: Answer/choice corrections ────────────────────────────────────────
function applyCorrections(q) {
  const id = q.id;

  if (id === 'q-quant-32') {
    // Explanation gives x=10, but choice E was "8". Fix E→"10" and answer C→E.
    q.choices = q.choices.map(c => c.key === 'E' ? { key: 'E', text: '10' } : c);
    q.correctAnswer = { format: 'single', value: 'E' };
  }

  if (id === 'ds-02') {
    // Stmt2 "n≡1(mod3)" definitively answers "no, not divisible" → sufficient.
    q.correctAnswer = { format: 'single', value: 'D' };
  }

  if (id === 'ds-09') {
    // x²<1 → -1<x<1, all values <1 → YES, stmt1 alone sufficient.
    q.correctAnswer = { format: 'single', value: 'A' };
  }

  if (id === 'ds-12') {
    // x²=16 → x=±4, both integers → stmt1 alone sufficient.
    q.correctAnswer = { format: 'single', value: 'A' };
  }

  if (id === 'ta-01') {
    // West (160) has highest sales, not South (150). s1 = False.
    q.correctAnswer = { format: 'dichotomous', value: { s1: 'False', s2: 'True', s3: 'True' } };
  }

  if (id === 'ta-04') {
    // B total=85 > A total=80. "Store B had more total visits than A" is True.
    q.correctAnswer = { format: 'dichotomous', value: { s1: 'True', s2: 'True', s3: 'True' } };
  }
}

// ── Step 5: Transform each question ──────────────────────────────────────────
// Track RC orderIndex per group
const rcOrderIndex = { 'rc-p1': 0, 'rc-p2': 0, 'rc-p3': 0 };

const transformed = questions.map(q => {
  applyCorrections(q);

  const newId = remapId(q.id);
  const mappedGroupId = GROUP_MAP[q.groupId] ?? q.groupId;
  // Omit groupId entirely when empty (schema requires non-empty string or absent)
  const newGroupId = mappedGroupId || undefined;

  // orderIndex
  let orderIndex = 0;
  if (q.type === 'reading_comprehension' && q.groupId) {
    orderIndex = rcOrderIndex[q.groupId]++;
  }

  // Remove DS choices
  let choices = q.choices;
  if (q.type === 'data_sufficiency') {
    choices = undefined;
  }

  // Two-part fixes
  let stem = q.stem;
  let assets = q.assets;
  if (q.type === 'two_part_analysis' && TWO_PART_FIXES[q.id]) {
    const fix = TWO_PART_FIXES[q.id];
    stem = fix.stem;
    assets = {
      twoPart: {
        columns: [
          { key: 'partA', label: fix.colA },
          { key: 'partB', label: fix.colB },
        ],
      },
    };
  }

  return {
    id: newId,
    section: q.section,
    type: q.type,
    topic: q.topic,
    difficulty: q.difficulty,
    groupId: newGroupId,
    orderIndex,
    stem,
    assets,
    ...(choices !== undefined ? { choices } : {}),
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    estimatedTimeSeconds: q.estimatedTimeSeconds,
    tags: q.tags,
  };
});

// ── Step 6: Split by section ──────────────────────────────────────────────────
const quant  = transformed.filter(q => q.section === 'quant');
const verbal = transformed.filter(q => q.section === 'verbal');
const di     = transformed.filter(q => q.section === 'data_insights');

// ── Step 7: Transform groups ──────────────────────────────────────────────────
const transformedGroups = groups.map(g => ({
  id: GROUP_MAP[g.id] ?? g.id,
  section: g.section,
  title: g.title,
  passage: g.passage,
}));

// ── Step 8: Write output files ────────────────────────────────────────────────
const write = (path, data) =>
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');

write(resolve(root, 'content', 'questions', 'quant-9.json'),        quant);
write(resolve(root, 'content', 'questions', 'verbal-9.json'),       verbal);
write(resolve(root, 'content', 'questions', 'data_insights-9.json'), di);
write(resolve(root, 'content', 'question_groups-6.json'),           transformedGroups);

console.log(`quant-9.json:         ${quant.length} questions`);
console.log(`verbal-9.json:        ${verbal.length} questions`);
console.log(`data_insights-9.json: ${di.length} questions`);
console.log(`question_groups-6.json: ${transformedGroups.length} groups`);
console.log('Done.');
