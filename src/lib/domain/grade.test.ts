import { describe, it, expect } from 'vitest';
import { gradeAnswer, isAnswerComplete, emptySelection } from './grade';
import { SECTION_FROM_TYPE, SECTION_TYPES } from './constants';
import type { CorrectAnswer, QuestionType, Section } from './types';

describe('gradeAnswer', () => {
  it('grades single-answer questions', () => {
    const c: CorrectAnswer = { format: 'single', value: 'B' };
    expect(gradeAnswer(c, { format: 'single', value: 'B' })).toBe(true);
    expect(gradeAnswer(c, { format: 'single', value: 'A' })).toBe(false);
    expect(gradeAnswer(c, { format: 'single', value: null })).toBe(false);
  });

  it('requires every part to match for multi-part answers', () => {
    const c: CorrectAnswer = { format: 'dichotomous', value: { s1: 'Yes', s2: 'No' } };
    expect(gradeAnswer(c, { format: 'dichotomous', value: { s1: 'Yes', s2: 'No' } })).toBe(true);
    expect(gradeAnswer(c, { format: 'dichotomous', value: { s1: 'Yes', s2: 'Yes' } })).toBe(false);
    expect(gradeAnswer(c, { format: 'dichotomous', value: { s1: 'Yes' } })).toBe(false);
  });

  it('fails on null or format mismatch', () => {
    const c: CorrectAnswer = { format: 'single', value: 'A' };
    expect(gradeAnswer(c, null)).toBe(false);
    expect(gradeAnswer(c, { format: 'dichotomous', value: {} })).toBe(false);
  });
});

describe('isAnswerComplete', () => {
  it('single requires a value', () => {
    const c: CorrectAnswer = { format: 'single', value: 'C' };
    expect(isAnswerComplete(c, { format: 'single', value: null })).toBe(false);
    expect(isAnswerComplete(c, { format: 'single', value: 'A' })).toBe(true);
  });

  it('multi-part requires every part filled (regardless of correctness)', () => {
    const c: CorrectAnswer = { format: 'two_part', value: { partA: 'r1', partB: 'r2' } };
    expect(isAnswerComplete(c, { format: 'two_part', value: { partA: 'r1' } })).toBe(false);
    expect(isAnswerComplete(c, { format: 'two_part', value: { partA: 'r3', partB: 'r4' } })).toBe(true);
  });

  it('emptySelection seeds the correct empty shape', () => {
    expect(emptySelection({ format: 'single', value: 'A' })).toEqual({ format: 'single', value: null });
    expect(emptySelection({ format: 'dropdowns', value: { b1: 'x' } })).toEqual({
      format: 'dropdowns',
      value: {},
    });
  });
});

describe('section/type taxonomy', () => {
  it('every type listed under a section maps back to that section', () => {
    for (const [section, types] of Object.entries(SECTION_TYPES) as [Section, QuestionType[]][]) {
      for (const t of types) expect(SECTION_FROM_TYPE[t]).toBe(section);
    }
  });
});
