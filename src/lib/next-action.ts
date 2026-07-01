import type { Section } from '@/lib/domain/types';

// Pure "what should I do next?" logic, kept out of the component so the priority
// ordering is testable and can't silently regress.

export interface WeakestTopic {
  topic: string;
  section: Section;
  pct: number;
}

export type NextAction =
  | { kind: 'review'; dueCount: number }
  | { kind: 'diagnostic' }
  | { kind: 'practice'; weakest: WeakestTopic }
  | { kind: 'mock' };

export interface NextActionInput {
  dueCount: number;
  hasEstimate: boolean;
  hasPlan: boolean;
  weakest: WeakestTopic | null;
}

/**
 * Priority, highest-leverage first:
 *   1. Due spaced-repetition reviews (locking in what you almost know).
 *   2. The diagnostic, if there's no score/plan yet (nothing to work from).
 *   3. Practice on the weakest area (biggest score movement).
 *   4. Otherwise a full mock exam.
 */
export function chooseNextAction(input: NextActionInput): NextAction {
  if (input.dueCount > 0) return { kind: 'review', dueCount: input.dueCount };
  if (!input.hasEstimate && !input.hasPlan) return { kind: 'diagnostic' };
  if (input.weakest) return { kind: 'practice', weakest: input.weakest };
  return { kind: 'mock' };
}

/** The weakest topic (≥3 attempts) from a by-topic accuracy tally, or null. */
export function weakestTopic(
  byTopic: Record<string, { total: number; correct: number; section: Section }>,
): WeakestTopic | null {
  let worst: (WeakestTopic & { total: number }) | null = null;
  for (const [key, t] of Object.entries(byTopic)) {
    if (t.total < 3) continue;
    const pct = Math.round((t.correct / t.total) * 100);
    const topic = key.split('::')[1] ?? key;
    if (!worst || pct < worst.pct || (pct === worst.pct && t.total > worst.total)) {
      worst = { topic, section: t.section, pct, total: t.total };
    }
  }
  return worst ? { topic: worst.topic, section: worst.section, pct: worst.pct } : null;
}
