import { describe, expect, it } from 'vitest';
import { chooseNextAction, weakestTopic } from './next-action';

const weak = { topic: 'geometry', section: 'quant' as const, pct: 30 };

describe('chooseNextAction (priority order)', () => {
  it('prioritizes due reviews above everything else', () => {
    const a = chooseNextAction({ dueCount: 5, hasEstimate: true, hasPlan: true, weakest: weak });
    expect(a).toEqual({ kind: 'review', dueCount: 5 });
  });

  it('recommends the diagnostic when there is no score or plan and nothing due', () => {
    expect(chooseNextAction({ dueCount: 0, hasEstimate: false, hasPlan: false, weakest: null }).kind).toBe(
      'diagnostic',
    );
  });

  it('does NOT push the diagnostic once a score or plan exists', () => {
    expect(chooseNextAction({ dueCount: 0, hasEstimate: true, hasPlan: false, weakest: weak }).kind).toBe(
      'practice',
    );
    expect(chooseNextAction({ dueCount: 0, hasEstimate: false, hasPlan: true, weakest: null }).kind).toBe(
      'mock',
    );
  });

  it('recommends weakest-area practice when a weak topic is known', () => {
    const a = chooseNextAction({ dueCount: 0, hasEstimate: true, hasPlan: true, weakest: weak });
    expect(a).toEqual({ kind: 'practice', weakest: weak });
  });

  it('falls back to a mock when there is data but no weak topic yet', () => {
    expect(chooseNextAction({ dueCount: 0, hasEstimate: true, hasPlan: true, weakest: null }).kind).toBe(
      'mock',
    );
  });
});

describe('weakestTopic', () => {
  it('ignores topics with fewer than 3 attempts', () => {
    expect(
      weakestTopic({ 'quant::ratios': { total: 2, correct: 0, section: 'quant' } }),
    ).toBeNull();
  });

  it('picks the lowest-accuracy topic, tie-broken by larger sample', () => {
    const w = weakestTopic({
      'quant::ratios': { total: 4, correct: 3, section: 'quant' }, // 75%
      'quant::geometry': { total: 5, correct: 1, section: 'quant' }, // 20%
      'verbal::cr': { total: 10, correct: 2, section: 'verbal' }, // 20%, bigger sample
    });
    expect(w).toEqual({ topic: 'cr', section: 'verbal', pct: 20 });
  });
});
