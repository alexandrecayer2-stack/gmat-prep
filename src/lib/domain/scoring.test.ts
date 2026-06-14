import { describe, it, expect } from 'vitest';
import {
  estimateDiagnostic,
  requiredSectionAvgForTotal,
  sectionScaledFromWeightedAccuracy,
  totalFromSectionScaled,
  type GradedItem,
} from './scoring';

describe('section scaled score', () => {
  it('maps weighted accuracy across the 60-90 band', () => {
    expect(sectionScaledFromWeightedAccuracy(0)).toBe(60);
    expect(sectionScaledFromWeightedAccuracy(0.5)).toBe(75);
    expect(sectionScaledFromWeightedAccuracy(1)).toBe(90);
  });
  it('clamps out-of-range input', () => {
    expect(sectionScaledFromWeightedAccuracy(-1)).toBe(60);
    expect(sectionScaledFromWeightedAccuracy(2)).toBe(90);
  });
});

describe('total score', () => {
  it('maps the section average onto 205-805 (rounded to 10)', () => {
    expect(totalFromSectionScaled([60, 60, 60])).toBe(205);
    expect(totalFromSectionScaled([75, 75, 75])).toBe(505);
    expect(totalFromSectionScaled([90, 90, 90])).toBe(805);
  });
  it('inverse maps total back to a plausible section average', () => {
    expect(requiredSectionAvgForTotal(505)).toBe(75);
    expect(requiredSectionAvgForTotal(805)).toBe(90);
    expect(requiredSectionAvgForTotal(205)).toBe(60);
  });
});

describe('estimateDiagnostic', () => {
  const mk = (section: GradedItem['section'], difficulty: GradedItem['difficulty'], isCorrect: boolean): GradedItem => ({
    section,
    difficulty,
    isCorrect,
  });

  it('weights harder questions more heavily', () => {
    const onlyEasy = estimateDiagnostic([mk('quant', 'easy', true), mk('quant', 'hard', false)]);
    const onlyHard = estimateDiagnostic([mk('quant', 'easy', false), mk('quant', 'hard', true)]);
    // Same raw count (1/2) but getting the HARD one right scores higher.
    expect(onlyHard.perSection.quant.scaled).toBeGreaterThan(onlyEasy.perSection.quant.scaled);
  });

  it('produces a total inside the confidence range and within bounds', () => {
    const items: GradedItem[] = [
      mk('quant', 'easy', true),
      mk('quant', 'medium', true),
      mk('verbal', 'medium', false),
      mk('verbal', 'hard', false),
      mk('data_insights', 'medium', true),
      mk('data_insights', 'hard', false),
    ];
    const est = estimateDiagnostic(items);
    expect(est.low).toBeLessThanOrEqual(est.total);
    expect(est.high).toBeGreaterThanOrEqual(est.total);
    expect(est.total).toBeGreaterThanOrEqual(205);
    expect(est.total).toBeLessThanOrEqual(805);
    expect(est.questionCount).toBe(6);
  });

  it('all-correct beats all-wrong', () => {
    const all = (correct: boolean) =>
      estimateDiagnostic([
        mk('quant', 'medium', correct),
        mk('verbal', 'medium', correct),
        mk('data_insights', 'medium', correct),
      ]).total;
    expect(all(true)).toBeGreaterThan(all(false));
  });
});
