import { describe, expect, it } from 'vitest';
import { DAY_MS, LEITNER_DAYS, dueAtMs, leitnerBox } from './spaced-repetition';

describe('leitnerBox', () => {
  it('is 0 when the most recent attempt was wrong (due immediately)', () => {
    expect(leitnerBox([true, true, false])).toBe(0);
  });

  it('counts the trailing consecutive-correct streak', () => {
    expect(leitnerBox([false, true, true])).toBe(2);
    expect(leitnerBox([true])).toBe(1);
  });

  it('resets on the last miss, ignoring earlier correct answers', () => {
    expect(leitnerBox([true, true, true, false, true])).toBe(1);
  });

  it('caps at the last defined interval', () => {
    const many = Array.from({ length: 20 }, () => true);
    expect(leitnerBox(many)).toBe(LEITNER_DAYS.length - 1);
  });

  it('is 0 for an empty history', () => {
    expect(leitnerBox([])).toBe(0);
  });
});

describe('dueAtMs', () => {
  const t0 = 1_000_000_000_000;

  it('box 0 is due at once (interval 0)', () => {
    expect(dueAtMs(t0, 0)).toBe(t0);
  });

  it('later boxes push the due date out by their interval', () => {
    expect(dueAtMs(t0, 1)).toBe(t0 + 1 * DAY_MS);
    expect(dueAtMs(t0, 3)).toBe(t0 + 7 * DAY_MS);
  });

  it('clamps an out-of-range box to the last interval', () => {
    expect(dueAtMs(t0, 99)).toBe(t0 + LEITNER_DAYS[LEITNER_DAYS.length - 1] * DAY_MS);
  });
});
