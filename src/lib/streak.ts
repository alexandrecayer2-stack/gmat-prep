// Study-streak computation, kept pure (with an injectable `now`) so the
// today/yesterday edge cases are unit-testable independent of the clock.

export interface StreakState {
  streak: number;
  doneToday: boolean;
  last7: boolean[]; // oldest → today
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Current daily streak (in the local timezone of the given `now`) from a set of
 *  attempt timestamps. A streak from yesterday is still "alive" today. */
export function computeStreak(timestamps: string[], now: Date = new Date()): StreakState {
  const days = new Set(timestamps.map((iso) => dayKey(new Date(iso))));
  const doneToday = days.has(dayKey(now));

  let streak = 0;
  const cursor = new Date(now);
  if (!doneToday) cursor.setDate(cursor.getDate() - 1); // yesterday still counts today
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const last7: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7.push(days.has(dayKey(d)));
  }
  return { streak, doneToday, last7 };
}
