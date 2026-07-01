// Pure spaced-repetition (Leitner) scheduling, shared by the review-queue data
// layer and unit-testable in isolation. A question's "box" is its trailing
// consecutive-correct streak; each box waits longer before the question is due
// again. A miss resets the box to 0 (due immediately).

export const DAY_MS = 86_400_000;

// Interval (days) before a question in each box is due for review again.
export const LEITNER_DAYS = [0, 1, 3, 7, 16, 35];

/** The Leitner box = number of consecutive correct answers counting back from
 *  the most recent attempt, capped at the last defined interval. */
export function leitnerBox(correctnessOldestFirst: boolean[]): number {
  let box = 0;
  for (let i = correctnessOldestFirst.length - 1; i >= 0 && correctnessOldestFirst[i]; i--) box += 1;
  return Math.min(box, LEITNER_DAYS.length - 1);
}

/** When a question last seen at `lastSeenMs` in the given box becomes due. */
export function dueAtMs(lastSeenMs: number, box: number): number {
  const clamped = Math.max(0, Math.min(box, LEITNER_DAYS.length - 1));
  return lastSeenMs + LEITNER_DAYS[clamped] * DAY_MS;
}
