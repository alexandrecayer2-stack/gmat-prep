import { describe, expect, it } from 'vitest';
import { computeStreak } from './streak';

// Fixed "now" so the tests are clock-independent (noon avoids DST/midnight edges).
const NOW = new Date(2026, 5, 15, 12, 0, 0); // 15 Jun 2026, local
const dayAt = (offset: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

describe('computeStreak', () => {
  it('is 0 with no history', () => {
    const s = computeStreak([], NOW);
    expect(s.streak).toBe(0);
    expect(s.doneToday).toBe(false);
    expect(s.last7).toEqual([false, false, false, false, false, false, false]);
  });

  it('counts today + consecutive prior days', () => {
    const s = computeStreak([dayAt(0), dayAt(-1), dayAt(-2)], NOW);
    expect(s.streak).toBe(3);
    expect(s.doneToday).toBe(true);
    expect(s.last7[6]).toBe(true); // today active
  });

  it('keeps the streak alive from yesterday even if nothing done today yet', () => {
    const s = computeStreak([dayAt(-1), dayAt(-2)], NOW);
    expect(s.streak).toBe(2);
    expect(s.doneToday).toBe(false);
  });

  it('breaks the streak on a gap', () => {
    // Practiced today and 2 days ago, but not yesterday → only today counts.
    const s = computeStreak([dayAt(0), dayAt(-2), dayAt(-3)], NOW);
    expect(s.streak).toBe(1);
  });

  it('is 0 when the last activity was 2+ days ago (lapsed)', () => {
    const s = computeStreak([dayAt(-2), dayAt(-3)], NOW);
    expect(s.streak).toBe(0);
  });

  it('dedupes multiple attempts on the same day', () => {
    const s = computeStreak([dayAt(0), dayAt(0), dayAt(0), dayAt(-1)], NOW);
    expect(s.streak).toBe(2);
  });
});
