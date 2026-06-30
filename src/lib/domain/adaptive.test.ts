import { describe, expect, it } from 'vitest';
import { pickNextUnitIndex, ADAPTIVE_START_ABILITY, type UnitMeta } from './adaptive';
import type { GradedItem } from './scoring';

const candidates: UnitMeta[] = [
  { difficulty: 'easy', type: 'problem_solving' }, // b = 75
  { difficulty: 'medium', type: 'problem_solving' }, // b = 80
  { difficulty: 'hard', type: 'problem_solving' }, // b = 85
];

const item = (difficulty: GradedItem['difficulty'], isCorrect: boolean): GradedItem => ({
  section: 'quant',
  difficulty,
  type: 'problem_solving',
  isCorrect,
});

describe('pickNextUnitIndex', () => {
  it('starts on the medium item for a fresh section (start ability ≈ medium)', () => {
    expect(ADAPTIVE_START_ABILITY).toBe(80);
    expect(pickNextUnitIndex(candidates, [])).toBe(1); // medium
  });

  it('moves toward the hard item after a sustained run of correct answers', () => {
    // The Bayesian prior keeps the estimate conservative for the first few
    // items; a sustained run of correct answers is needed to push it up a tier.
    const answered = Array.from({ length: 5 }, () => item('hard', true));
    expect(pickNextUnitIndex(candidates, answered)).toBe(2); // hard
  });

  it('stays near medium after only a few correct answers (prior is conservative)', () => {
    const answered = [item('medium', true), item('medium', true), item('hard', true)];
    expect(pickNextUnitIndex(candidates, answered)).toBe(1); // still medium
  });

  it('moves toward the easy item after a run of wrong answers', () => {
    const answered = [item('medium', false), item('medium', false), item('easy', false)];
    expect(pickNextUnitIndex(candidates, answered)).toBe(0); // easy
  });

  it('returns -1 when there are no candidates', () => {
    expect(pickNextUnitIndex([], [])).toBe(-1);
  });

  it('breaks ties to the lowest index (deterministic)', () => {
    // Two identical-difficulty candidates → the earlier index wins.
    const dup: UnitMeta[] = [
      { difficulty: 'medium', type: 'problem_solving' },
      { difficulty: 'medium', type: 'problem_solving' },
    ];
    expect(pickNextUnitIndex(dup, [])).toBe(0);
  });
});
