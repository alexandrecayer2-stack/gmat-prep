import { describe, expect, it } from 'vitest';
import {
  arrangeUnits,
  countMatching,
  pickSpread,
  selectPracticeQuestions,
  takeUnits,
  type QuestionBank,
} from './selection';
import type { Difficulty, Question, QuestionType, QuestionWithGroup, Section } from './types';

let seq = 0;
function q(overrides: Partial<Question> = {}): Question {
  seq += 1;
  return {
    id: overrides.id ?? `q${seq}`,
    section: 'quant',
    type: 'problem_solving',
    difficulty: 'medium',
    topic: 'algebra',
    stem: 'stem',
    correctAnswer: { format: 'single', value: 'A' },
    explanation: 'because',
    estimatedTimeSeconds: 120,
    orderIndex: 0,
    ...overrides,
  };
}

describe('arrangeUnits', () => {
  it('keeps a group contiguous and ordered by orderIndex, with every question present', () => {
    const questions: Question[] = [
      q({ id: 'a' }),
      q({ id: 'g2', groupId: 'g', orderIndex: 1 }),
      q({ id: 'g1', groupId: 'g', orderIndex: 0 }),
      q({ id: 'b' }),
    ];
    const arranged = arrangeUnits(questions, {});
    expect(arranged).toHaveLength(4);
    expect(new Set(arranged.map((x) => x.id))).toEqual(new Set(['a', 'b', 'g1', 'g2']));

    const i1 = arranged.findIndex((x) => x.id === 'g1');
    const i2 = arranged.findIndex((x) => x.id === 'g2');
    expect(Math.abs(i1 - i2)).toBe(1); // adjacent
    expect(i1).toBeLessThan(i2); // ordered by orderIndex
  });
});

describe('takeUnits', () => {
  const flat: QuestionWithGroup[] = [
    { ...q({ id: 'A' }), group: null },
    { ...q({ id: 'B1', groupId: 'g' }), group: null },
    { ...q({ id: 'B2', groupId: 'g' }), group: null },
    { ...q({ id: 'B3', groupId: 'g' }), group: null },
    { ...q({ id: 'C' }), group: null },
  ];

  it('never splits a group, even if it overshoots the count', () => {
    const taken = takeUnits(flat, 2);
    // A (1), then the whole B-group is pulled in rather than split → 4 items.
    expect(taken.map((x) => x.id)).toEqual(['A', 'B1', 'B2', 'B3']);
  });

  it('returns everything when count >= length or count <= 0', () => {
    expect(takeUnits(flat, 99)).toHaveLength(5);
    expect(takeUnits(flat, 0)).toHaveLength(5);
  });

  it('caps standalone questions to the count', () => {
    const standalone: QuestionWithGroup[] = Array.from({ length: 6 }, (_, i) => ({
      ...q({ id: `s${i}` }),
      group: null,
    }));
    expect(takeUnits(standalone, 3)).toHaveLength(3);
  });
});

describe('pickSpread', () => {
  const bank: Question[] = [
    ...Array.from({ length: 3 }, () => q({ difficulty: 'easy' })),
    ...Array.from({ length: 2 }, () => q({ difficulty: 'medium' })),
    ...Array.from({ length: 1 }, () => q({ difficulty: 'hard' })),
  ];

  it('spreads across difficulties (one of each for n=3)', () => {
    const picked = pickSpread(bank, 3);
    expect(picked).toHaveLength(3);
    const counts = tally(picked.map((p) => p.difficulty));
    expect(counts).toEqual({ easy: 1, medium: 1, hard: 1 });
  });

  it('never returns more than are available', () => {
    expect(pickSpread(bank, 100)).toHaveLength(6);
  });
});

describe('selectPracticeQuestions + countMatching', () => {
  const bank: QuestionBank = {
    questions: [
      q({ id: 'q-easy', section: 'quant', type: 'problem_solving', difficulty: 'easy' }),
      q({ id: 'q-hard', section: 'quant', type: 'problem_solving', difficulty: 'hard' }),
      q({ id: 'v-cr', section: 'verbal', type: 'critical_reasoning', difficulty: 'medium' }),
    ],
    groups: [],
  };

  it('filters by section', () => {
    expect(selectPracticeQuestions(bank, { section: 'quant' }).map((x) => x.id).sort()).toEqual([
      'q-easy',
      'q-hard',
    ]);
    expect(countMatching(bank, { section: 'verbal' })).toBe(1);
  });

  it('filters by type and difficulty', () => {
    expect(countMatching(bank, { types: ['critical_reasoning'] as QuestionType[] })).toBe(1);
    expect(countMatching(bank, { section: 'quant', difficulty: 'easy' })).toBe(1);
  });

  it('caps to count', () => {
    expect(selectPracticeQuestions(bank, { count: 1 })).toHaveLength(1);
  });
});

function tally(xs: (Difficulty | Section | string)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of xs) out[x] = (out[x] ?? 0) + 1;
  return out;
}
