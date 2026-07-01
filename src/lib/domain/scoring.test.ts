import { describe, it, expect } from 'vitest';
import {
  estimateAbility,
  estimateDiagnostic,
  itemDifficulty,
  probabilityCorrect,
  recencyWeight,
  RECENCY_HALF_LIFE_QUESTIONS,
  requiredSectionAvgForTotal,
  sectionScaledFromWeightedAccuracy,
  totalFromSectionScaled,
  type GradedItem,
} from './scoring';

const mk = (
  section: GradedItem['section'],
  difficulty: GradedItem['difficulty'],
  isCorrect: boolean,
  type?: GradedItem['type'],
): GradedItem => ({ section, difficulty, isCorrect, type });

describe('section ↔ total mapping', () => {
  it('legacy linear map spans the 60-90 band', () => {
    expect(sectionScaledFromWeightedAccuracy(0)).toBe(60);
    expect(sectionScaledFromWeightedAccuracy(0.5)).toBe(75);
    expect(sectionScaledFromWeightedAccuracy(1)).toBe(90);
    expect(sectionScaledFromWeightedAccuracy(-1)).toBe(60);
    expect(sectionScaledFromWeightedAccuracy(2)).toBe(90);
  });
  it('maps the section average onto 205-805 (snapped to the grid)', () => {
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

describe('IRT item model', () => {
  it('orders difficulty tiers and applies the type offset', () => {
    expect(itemDifficulty('easy')).toBeLessThan(itemDifficulty('medium'));
    expect(itemDifficulty('medium')).toBeLessThan(itemDifficulty('hard'));
    // Data Sufficiency carries a positive format offset → harder than plain PS.
    expect(itemDifficulty('hard', 'data_sufficiency')).toBeGreaterThan(itemDifficulty('hard', 'problem_solving'));
  });
  it('a test-taker is ~50% likely at their own level, higher below, lower above', () => {
    expect(probabilityCorrect(80, 'medium')).toBeCloseTo(0.5, 5);
    expect(probabilityCorrect(80, 'easy')).toBeGreaterThan(0.7);
    expect(probabilityCorrect(80, 'hard')).toBeLessThan(0.3);
  });
});

describe('estimateAbility', () => {
  it('with no answers returns the prior mean and a wide standard error', () => {
    const est = estimateAbility([]);
    expect(est.scaled).toBe(75);
    expect(est.total).toBe(0);
    expect(est.standardError).toBeGreaterThan(3); // ≈ the prior SD
  });

  it('a correct HARD question lifts ability more than a correct EASY one', () => {
    const hard = estimateAbility([mk('quant', 'hard', true)]).ability;
    const easy = estimateAbility([mk('quant', 'easy', true)]).ability;
    expect(hard).toBeGreaterThan(easy);
  });

  it('a wrong EASY question hurts more than a wrong HARD one', () => {
    const wrongEasy = estimateAbility([mk('quant', 'easy', false)]).ability;
    const wrongHard = estimateAbility([mk('quant', 'hard', false)]).ability;
    expect(wrongEasy).toBeLessThan(wrongHard);
  });

  it('question type moves the estimate: acing a hard DS beats acing a hard PS', () => {
    const ds = estimateAbility([mk('data_insights', 'hard', true, 'data_sufficiency')]).ability;
    const ps = estimateAbility([mk('data_insights', 'hard', true, 'problem_solving')]).ability;
    expect(ds).toBeGreaterThan(ps);
  });

  it('more correct answers monotonically raise the estimate', () => {
    const a1 = estimateAbility([mk('quant', 'medium', true)]).ability;
    const a3 = estimateAbility([mk('quant', 'medium', true), mk('quant', 'medium', true), mk('quant', 'medium', true)]).ability;
    expect(a3).toBeGreaterThan(a1);
  });

  it('the standard error shrinks as more questions are answered', () => {
    const few = estimateAbility([mk('quant', 'medium', true), mk('quant', 'medium', false)]);
    const many = estimateAbility(
      Array.from({ length: 20 }, (_, i) => mk('quant', 'medium', i % 2 === 0)),
    );
    expect(many.standardError).toBeLessThan(few.standardError);
  });
});

describe('recency weighting', () => {
  it('recencyWeight is 1 for the newest answer and halves each half-life', () => {
    expect(recencyWeight(0)).toBe(1);
    expect(recencyWeight(RECENCY_HALF_LIFE_QUESTIONS)).toBeCloseTo(0.5, 5);
    expect(recencyWeight(2 * RECENCY_HALF_LIFE_QUESTIONS)).toBeCloseTo(0.25, 5);
    expect(recencyWeight(10)).toBeGreaterThan(recencyWeight(20));
  });

  it('a zero-weight answer does not move the estimate', () => {
    const base = estimateAbility([mk('quant', 'medium', true)]).ability;
    const withGhost = estimateAbility([
      mk('quant', 'medium', true),
      { ...mk('quant', 'hard', false), weight: 0 },
    ]).ability;
    expect(withGhost).toBeCloseTo(base, 6);
  });

  it('weighting the recent answer more shifts the estimate toward it', () => {
    const recentCorrect = estimateAbility([
      { ...mk('quant', 'medium', false), weight: 0.2 },
      { ...mk('quant', 'medium', true), weight: 1 },
    ]).ability;
    const recentWrong = estimateAbility([
      { ...mk('quant', 'medium', true), weight: 0.2 },
      { ...mk('quant', 'medium', false), weight: 1 },
    ]).ability;
    expect(recentCorrect).toBeGreaterThan(recentWrong);
  });

  it('down-weighting answers widens the standard error (less effective evidence)', () => {
    const full = estimateAbility([mk('quant', 'medium', true)]);
    const faded = estimateAbility([{ ...mk('quant', 'medium', true), weight: 0.2 }]);
    expect(faded.standardError).toBeGreaterThan(full.standardError);
  });
});

describe('estimateDiagnostic', () => {
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
    expect(est.standardError).toBeGreaterThan(0);
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

  it('a longer diagnostic yields a tighter likely range', () => {
    const short = estimateDiagnostic([
      mk('quant', 'medium', true),
      mk('verbal', 'medium', true),
      mk('data_insights', 'medium', true),
    ]);
    const long = estimateDiagnostic(
      (['quant', 'verbal', 'data_insights'] as const).flatMap((s) =>
        Array.from({ length: 8 }, (_, i) => mk(s, 'medium', i % 2 === 0)),
      ),
    );
    expect(long.high - long.low).toBeLessThan(short.high - short.low);
  });

  it('reports a per-type breakdown with observed vs expected accuracy', () => {
    const est = estimateDiagnostic([
      mk('data_insights', 'medium', true, 'data_sufficiency'),
      mk('data_insights', 'medium', false, 'data_sufficiency'),
      mk('data_insights', 'easy', true, 'table_analysis'),
    ]);
    const byType = est.perSection.data_insights.byType;
    expect(byType.length).toBe(2);
    const ds = byType.find((t) => t.type === 'data_sufficiency')!;
    expect(ds.total).toBe(2);
    expect(ds.correct).toBe(1);
    expect(ds.observedAccuracy).toBeCloseTo(0.5, 5);
    expect(ds.expectedAccuracy).toBeGreaterThan(0);
    expect(ds.delta).toBeCloseTo(ds.observedAccuracy - ds.expectedAccuracy, 5);
  });
});
