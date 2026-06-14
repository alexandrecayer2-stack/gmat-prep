import { z } from 'zod';
import { SECTION_FROM_TYPE } from './constants';

// Zod schemas mirror the domain types and are the single source of truth for
// seed-time validation. The seed script fails loudly on any malformed content.

export const sectionSchema = z.enum(['quant', 'verbal', 'data_insights']);

export const questionTypeSchema = z.enum([
  'problem_solving',
  'critical_reasoning',
  'reading_comprehension',
  'data_sufficiency',
  'graphics_interpretation',
  'table_analysis',
  'two_part_analysis',
  'multi_source_reasoning',
]);

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);

export const choiceSchema = z.object({
  key: z.string().min(1),
  text: z.string().min(1),
});

const cellSchema = z.union([z.string(), z.number()]);

const tableAssetSchema = z.object({
  columns: z
    .array(z.object({ key: z.string().min(1), label: z.string(), numeric: z.boolean().optional() }))
    .min(1),
  rows: z.array(z.record(z.string(), cellSchema)).min(1),
  sortable: z.boolean().optional(),
  caption: z.string().optional(),
});

const chartAssetSchema = z.object({
  type: z.enum(['bar', 'line', 'scatter']),
  data: z.array(z.record(z.string(), cellSchema)).min(1),
  xKey: z.string().min(1),
  series: z
    .array(z.object({ key: z.string().min(1), label: z.string(), color: z.string().optional() }))
    .min(1),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  title: z.string().optional(),
});

const dropdownBlankSchema = z.object({
  key: z.string().min(1),
  before: z.string().optional(),
  after: z.string().optional(),
  label: z.string().optional(),
  options: z.array(z.object({ value: z.string().min(1), label: z.string().optional() })).min(2),
});

const twoPartConfigSchema = z.object({
  columns: z.array(z.object({ key: z.string().min(1), label: z.string() })).length(2),
});

const dichotomousConfigSchema = z.object({
  labels: z.tuple([z.string().min(1), z.string().min(1)]),
  prompt: z.string().optional(),
});

const assetsSchema = z.object({
  table: tableAssetSchema.optional(),
  chart: chartAssetSchema.optional(),
  dropdowns: z.array(dropdownBlankSchema).optional(),
  twoPart: twoPartConfigSchema.optional(),
  dichotomous: dichotomousConfigSchema.optional(),
});

const correctAnswerSchema = z.discriminatedUnion('format', [
  z.object({ format: z.literal('single'), value: z.string().min(1) }),
  z.object({ format: z.literal('two_part'), value: z.record(z.string(), z.string()) }),
  z.object({ format: z.literal('dropdowns'), value: z.record(z.string(), z.string()) }),
  z.object({ format: z.literal('dichotomous'), value: z.record(z.string(), z.string()) }),
]);

export const questionSchema = z
  .object({
    id: z.string().min(1),
    groupId: z.string().min(1).optional(),
    section: sectionSchema,
    type: questionTypeSchema,
    difficulty: difficultySchema,
    topic: z.string().min(1),
    stem: z.string().min(1),
    passageOrStimulus: z.string().optional(),
    assets: assetsSchema.optional(),
    choices: z.array(choiceSchema).optional(),
    correctAnswer: correctAnswerSchema,
    explanation: z.string().min(1),
    sourceNote: z.string().optional(),
    estimatedTimeSeconds: z.number().int().positive().default(120),
    orderIndex: z.number().int().default(0),
    // Optional machine-checkable re-derivation of the labeled answer. A JS
    // expression (returning a boolean) that the content gate evaluates with the
    // question in scope — see scripts/lib/content-gate.ts. Authoring-only: it is
    // never persisted to the database (the seed maps explicit columns).
    answerCheck: z.string().min(1).optional(),
  })
  .superRefine((q, ctx) => {
    // section <-> type consistency
    if (SECTION_FROM_TYPE[q.type] !== q.section) {
      ctx.addIssue({
        code: 'custom',
        message: `type "${q.type}" belongs to section "${SECTION_FROM_TYPE[q.type]}", not "${q.section}"`,
        path: ['type'],
      });
    }

    const choiceKeys = new Set((q.choices ?? []).map((c) => c.key));
    const ca = q.correctAnswer;

    if (ca.format === 'single') {
      if (q.type === 'data_sufficiency') {
        if (!['A', 'B', 'C', 'D', 'E'].includes(ca.value)) {
          ctx.addIssue({ code: 'custom', message: 'DS answer must be A–E', path: ['correctAnswer', 'value'] });
        }
      } else if (!q.choices || q.choices.length < 2) {
        ctx.addIssue({ code: 'custom', message: 'single-answer questions need at least 2 choices', path: ['choices'] });
      } else if (!choiceKeys.has(ca.value)) {
        ctx.addIssue({
          code: 'custom',
          message: `correct answer "${ca.value}" is not one of the choice keys`,
          path: ['correctAnswer', 'value'],
        });
      }
    }

    if (ca.format === 'two_part') {
      const cols = q.assets?.twoPart?.columns;
      if (!cols) {
        ctx.addIssue({ code: 'custom', message: 'two_part needs assets.twoPart.columns', path: ['assets', 'twoPart'] });
      }
      if (!q.choices || q.choices.length < 2) {
        ctx.addIssue({ code: 'custom', message: 'two_part needs shared row options in choices', path: ['choices'] });
      }
      const valueKeys = Object.keys(ca.value);
      const colKeys = (cols ?? []).map((c) => c.key);
      if (cols && (valueKeys.length !== colKeys.length || !colKeys.every((k) => valueKeys.includes(k)))) {
        ctx.addIssue({ code: 'custom', message: 'correctAnswer keys must match the two column keys', path: ['correctAnswer', 'value'] });
      }
      for (const [k, v] of Object.entries(ca.value)) {
        if (!choiceKeys.has(v)) {
          ctx.addIssue({ code: 'custom', message: `two_part answer for "${k}" ("${v}") is not a choice key`, path: ['correctAnswer', 'value', k] });
        }
      }
    }

    if (ca.format === 'dropdowns') {
      const blanks = q.assets?.dropdowns;
      if (!blanks || blanks.length === 0) {
        ctx.addIssue({ code: 'custom', message: 'dropdowns needs assets.dropdowns', path: ['assets', 'dropdowns'] });
      } else {
        const byKey = new Map(blanks.map((b) => [b.key, b]));
        const valueKeys = Object.keys(ca.value);
        for (const b of blanks) {
          if (!valueKeys.includes(b.key)) {
            ctx.addIssue({ code: 'custom', message: `missing answer for dropdown "${b.key}"`, path: ['correctAnswer', 'value'] });
          }
        }
        for (const [k, v] of Object.entries(ca.value)) {
          const b = byKey.get(k);
          if (!b) {
            ctx.addIssue({ code: 'custom', message: `answer key "${k}" has no matching dropdown`, path: ['correctAnswer', 'value', k] });
          } else if (!b.options.some((o) => o.value === v)) {
            ctx.addIssue({ code: 'custom', message: `dropdown "${k}" answer "${v}" is not an option`, path: ['correctAnswer', 'value', k] });
          }
        }
      }
    }

    if (ca.format === 'dichotomous') {
      const labels = q.assets?.dichotomous?.labels;
      if (!labels) {
        ctx.addIssue({ code: 'custom', message: 'dichotomous needs assets.dichotomous.labels', path: ['assets', 'dichotomous'] });
      }
      if (!q.choices || q.choices.length === 0) {
        ctx.addIssue({ code: 'custom', message: 'dichotomous needs statements in choices', path: ['choices'] });
      }
      const valueKeys = Object.keys(ca.value);
      for (const c of q.choices ?? []) {
        if (!valueKeys.includes(c.key)) {
          ctx.addIssue({ code: 'custom', message: `missing answer for statement "${c.key}"`, path: ['correctAnswer', 'value'] });
        }
      }
      for (const [k, v] of Object.entries(ca.value)) {
        if (!choiceKeys.has(k)) {
          ctx.addIssue({ code: 'custom', message: `answer key "${k}" has no matching statement`, path: ['correctAnswer', 'value', k] });
        }
        if (labels && !labels.includes(v)) {
          ctx.addIssue({ code: 'custom', message: `dichotomous answer "${v}" must be one of: ${labels.join(', ')}`, path: ['correctAnswer', 'value', k] });
        }
      }
    }
  });

export const questionGroupSchema = z.object({
  id: z.string().min(1),
  section: sectionSchema,
  title: z.string().optional(),
  passage: z.string().optional(),
  sources: z.array(z.object({ title: z.string().min(1), content: z.string().min(1) })).optional(),
  assets: assetsSchema.optional(),
});

export const learnArticleSchema = z.object({
  id: z.string().min(1),
  section: sectionSchema,
  topic: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  orderIndex: z.number().int().default(0),
});

export const questionsFileSchema = z.array(questionSchema);
export const questionGroupsFileSchema = z.array(questionGroupSchema);
export const learnArticlesFileSchema = z.array(learnArticleSchema);

export type ValidatedQuestion = z.infer<typeof questionSchema>;
export type ValidatedQuestionGroup = z.infer<typeof questionGroupSchema>;
export type ValidatedLearnArticle = z.infer<typeof learnArticleSchema>;
