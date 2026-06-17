// Content-quality gate. The single source of truth for "is this content safe to
// ship?", shared by `npm run validate` (CI) and `npm run seed` (so malformed
// content can never reach the live database).
//
// It runs four independent layers of checks:
//   1. Structure   — JSON parses + matches the Zod schema (schema.ts).
//   2. References  — unique ids, resolvable groupId, group/section consistency.
//   3. Escaping    — balanced `$` in Markdown fields; no stray `\$` in raw text.
//   4. Answers     — re-derives the labeled answer from any `answerCheck` it
//                    carries, and reports coverage on computable types.
//   5. Duplicates  — a content fingerprint catches copy/paste within the bank.
//
// Lessons learned (README rule #1): LLM-authored questions are not trustworthy —
// wrong answers, duplicates, and invalid JSON have all slipped through before.
// This gate is the automated backstop.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ZodError } from 'zod';
import {
  questionsFileSchema,
  questionGroupsFileSchema,
  learnArticlesFileSchema,
  learnChaptersFileSchema,
  learnLessonsFileSchema,
  type ValidatedQuestion,
  type ValidatedQuestionGroup,
  type ValidatedLearnArticle,
  type ValidatedLearnChapter,
  type ValidatedLearnLesson,
} from '../../src/lib/domain/schema';
import type { QuestionType } from '../../src/lib/domain/types';

export interface GateResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  questions: ValidatedQuestion[];
  groups: ValidatedQuestionGroup[];
  learn: ValidatedLearnArticle[];
  chapters: ValidatedLearnChapter[];
  lessons: ValidatedLearnLesson[];
  stats: { questions: number; groups: number; learn: number; chapters: number; lessons: number; answerChecks: number };
}

const CONTENT = join(process.cwd(), 'content');
const loadJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

function zodLines(file: string, error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.map(String).join('.') || '(root)';
    return `${file}: [${path}] ${issue.message}`;
  });
}

// Computable types whose answer can, in principle, be re-derived by a script.
// (RC / CR are judgement-based and are exempt from the coverage report.)
const COMPUTABLE_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>([
  'problem_solving',
  'data_sufficiency',
  'graphics_interpretation',
  'table_analysis',
  'two_part_analysis',
  'multi_source_reasoning',
]);

// ---------------------------------------------------------------------------
// Layer 3 — Markdown escaping
// ---------------------------------------------------------------------------
// In Markdown-rendered fields every `$` must be either an escaped `\$` (literal
// currency) or part of a balanced `$...$` math pair — an odd count means a
// literal dollar is leaking into KaTeX math mode.
function unbalancedDollars(text: string | null | undefined): boolean {
  if (!text) return false;
  const unescaped = text.replace(/\\\$/g, '');
  const count = (unescaped.match(/\$/g) || []).length;
  return count % 2 !== 0;
}

// Raw-text fields (choices, table cells) are NOT Markdown — a `\$` there renders
// the backslash literally, which is almost always an authoring mistake.
function hasStrayEscape(text: unknown): boolean {
  return typeof text === 'string' && text.includes('\\$');
}

// ---------------------------------------------------------------------------
// Layer 4 — Answer re-derivation
// ---------------------------------------------------------------------------
// `answerCheck` is a JS expression that returns true when the labeled answer is
// correct. It is evaluated with a small, purpose-built helper API in scope. The
// content is first-party and this runs only at build time, so a scoped
// `Function` is an acceptable trade-off for full arithmetic expressiveness.
function runAnswerCheck(q: ValidatedQuestion): string | null {
  const expr = q.answerCheck;
  if (!expr) return null;

  const choices = q.choices ?? [];
  const answer = q.correctAnswer.value as string | Record<string, string>;
  const assets = q.assets ?? {};
  const text = (key: string): string => {
    const c = choices.find((ch) => ch.key === key);
    if (!c) throw new Error(`answerCheck: no choice with key "${key}"`);
    return c.text;
  };
  const num = (x: unknown): number => Number(String(x).replace(/[^0-9.\-]/g, ''));
  const helpers = {
    q,
    choices,
    answer,
    assets,
    rows: assets.table?.rows ?? [],
    data: assets.chart?.data ?? [],
    text,
    num,
    sum: (xs: number[]) => xs.reduce((a, b) => a + b, 0),
    max: (xs: number[]) => Math.max(...xs),
    min: (xs: number[]) => Math.min(...xs),
    count: (xs: unknown[], pred: (x: unknown) => boolean) => xs.filter(pred).length,
  };

  try {
    const keys = Object.keys(helpers);
    const fn = new Function(...keys, `"use strict"; return (${expr});`);
    const result = fn(...keys.map((k) => helpers[k as keyof typeof helpers]));
    if (result !== true) {
      return `${q.id}: answerCheck did not hold (returned ${JSON.stringify(result)}): ${expr}`;
    }
    return null;
  } catch (err) {
    return `${q.id}: answerCheck threw — ${(err as Error).message}: ${expr}`;
  }
}

// ---------------------------------------------------------------------------
// Layer 5 — Duplicate detection
// ---------------------------------------------------------------------------
// A normalized fingerprint over the parts that actually make a question unique:
// stem + stimulus + the asset data it reasons about + its choice texts. Using
// the asset data (not just the stem) avoids false positives across Table /
// Two-Part items that legitimately share a generic instruction stem.
function fingerprint(q: ValidatedQuestion): string {
  // Keep math CONTENT (it's what distinguishes e.g. two Data Sufficiency items
  // whose statements live in `$...$`); only drop the escape and delimiters.
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\\\$/g, '')
      .replace(/[^a-z0-9]+/g, ' ') // also strips $ delimiters and operators
      .replace(/\s+/g, ' ')
      .trim();

  const assetData = JSON.stringify(
    q.assets?.table?.rows ?? q.assets?.chart?.data ?? q.assets?.dropdowns ?? '',
  );
  const choiceText = (q.choices ?? []).map((c) => c.text).join('|');

  return [norm(q.stem), norm(q.passageOrStimulus ?? ''), assetData, norm(choiceText)].join('§');
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------
export function runGate(): GateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ---- Layer 1: load + Zod ----
  const groups: ValidatedQuestionGroup[] = [];
  for (const file of readdirSync(CONTENT)
    .filter((f) => /^question_groups.*\.json$/.test(f))
    .sort()) {
    try {
      const parsed = questionGroupsFileSchema.safeParse(loadJson(join(CONTENT, file)));
      if (!parsed.success) errors.push(...zodLines(file, parsed.error));
      else groups.push(...parsed.data);
    } catch (err) {
      errors.push(`${file}: invalid JSON — ${(err as Error).message}`);
    }
  }

  const qDir = join(CONTENT, 'questions');
  const questions: ValidatedQuestion[] = [];
  for (const file of readdirSync(qDir)
    .filter((f) => f.endsWith('.json'))
    .sort()) {
    try {
      const parsed = questionsFileSchema.safeParse(loadJson(join(qDir, file)));
      if (!parsed.success) errors.push(...zodLines(`questions/${file}`, parsed.error));
      else questions.push(...parsed.data);
    } catch (err) {
      errors.push(`questions/${file}: invalid JSON — ${(err as Error).message}`);
    }
  }

  const learn: ValidatedLearnArticle[] = [];
  try {
    const parsed = learnArticlesFileSchema.safeParse(loadJson(join(CONTENT, 'learn.json')));
    if (!parsed.success) errors.push(...zodLines('learn.json', parsed.error));
    else learn.push(...parsed.data);
  } catch (err) {
    errors.push(`learn.json: invalid JSON — ${(err as Error).message}`);
  }

  const chapters: ValidatedLearnChapter[] = [];
  try {
    const parsed = learnChaptersFileSchema.safeParse(loadJson(join(CONTENT, 'learn_chapters.json')));
    if (!parsed.success) errors.push(...zodLines('learn_chapters.json', parsed.error));
    else chapters.push(...parsed.data);
  } catch (err) {
    errors.push(`learn_chapters.json: invalid JSON — ${(err as Error).message}`);
  }

  const lessons: ValidatedLearnLesson[] = [];
  try {
    const parsed = learnLessonsFileSchema.safeParse(loadJson(join(CONTENT, 'learn_lessons.json')));
    if (!parsed.success) errors.push(...zodLines('learn_lessons.json', parsed.error));
    else lessons.push(...parsed.data);
  } catch (err) {
    errors.push(`learn_lessons.json: invalid JSON — ${(err as Error).message}`);
  }

  // If structure is already broken, deeper checks would just add noise.
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
      questions,
      groups,
      learn,
      chapters,
      lessons,
      stats: { questions: questions.length, groups: groups.length, learn: learn.length, chapters: chapters.length, lessons: lessons.length, answerChecks: 0 },
    };
  }

  // ---- Layer 2: references + uniqueness ----
  // Validate chapter/lesson references
  const chapterIds = new Set(chapters.map((c) => c.id));
  for (const lesson of lessons) {
    if (!chapterIds.has(lesson.chapterId))
      errors.push(`Lesson ${lesson.id}: references unknown chapterId "${lesson.chapterId}"`);
  }

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const seenIds = new Set<string>();
  for (const q of questions) {
    if (seenIds.has(q.id)) errors.push(`Duplicate question id: ${q.id}`);
    seenIds.add(q.id);
    if (q.groupId) {
      const g = groupById.get(q.groupId);
      if (!g) errors.push(`Question ${q.id} references unknown group "${q.groupId}"`);
      else if (g.section !== q.section)
        errors.push(`Question ${q.id} (section ${q.section}) is in group "${q.groupId}" (section ${g.section})`);
    }
  }

  // ---- Layer 3: escaping ----
  for (const q of questions) {
    for (const [label, value] of [
      ['stem', q.stem],
      ['explanation', q.explanation],
      ['passageOrStimulus', q.passageOrStimulus],
    ] as const) {
      if (unbalancedDollars(value)) errors.push(`${q.id}.${label}: unbalanced $ (escape literal currency as \\$)`);
    }
    for (const c of q.choices ?? []) {
      if (hasStrayEscape(c.text)) warnings.push(`${q.id}: choice "${c.key}" contains a literal \\$ in raw text`);
    }
    for (const row of q.assets?.table?.rows ?? []) {
      for (const cell of Object.values(row)) {
        if (hasStrayEscape(cell)) warnings.push(`${q.id}: table cell contains a literal \\$ in raw text`);
      }
    }
  }
  for (const g of groups) {
    if (unbalancedDollars(g.passage)) errors.push(`${g.id}.passage: unbalanced $`);
    (g.sources ?? []).forEach((s, i) => {
      if (unbalancedDollars(s.content)) errors.push(`${g.id}.source[${i}]: unbalanced $`);
    });
  }
  for (const a of learn) {
    if (unbalancedDollars(a.body)) errors.push(`${a.id}.body: unbalanced $`);
  }
  for (const lesson of lessons) {
    if (unbalancedDollars(lesson.body)) errors.push(`${lesson.id}.body: unbalanced $`);
  }
  // Verify all exerciseIds resolve to known questions
  const questionIds = new Set(questions.map((q) => q.id));
  for (const lesson of lessons) {
    for (const exId of lesson.exerciseIds) {
      if (!questionIds.has(exId))
        errors.push(`Lesson ${lesson.id}: exerciseId "${exId}" references unknown question`);
    }
  }

  // ---- Layer 4: answer re-derivation ----
  let answerChecks = 0;
  let computableMissing = 0;
  for (const q of questions) {
    if (q.answerCheck) {
      answerChecks += 1;
      const failure = runAnswerCheck(q);
      if (failure) errors.push(failure);
    } else if (COMPUTABLE_TYPES.has(q.type)) {
      computableMissing += 1;
    }
  }
  if (computableMissing > 0) {
    warnings.push(
      `${computableMissing} computable question(s) have no answerCheck — re-derivation coverage is partial. ` +
        `Add an "answerCheck" expression to enforce them.`,
    );
  }

  // ---- Layer 5: duplicates ----
  const byPrint = new Map<string, string>();
  for (const q of questions) {
    const fp = fingerprint(q);
    const prior = byPrint.get(fp);
    if (prior) errors.push(`Duplicate content: ${q.id} is identical to ${prior}`);
    else byPrint.set(fp, q.id);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    questions,
    groups,
    learn,
    chapters,
    lessons,
    stats: {
      questions: questions.length,
      groups: groups.length,
      learn: learn.length,
      chapters: chapters.length,
      lessons: lessons.length,
      answerChecks,
    },
  };
}
