'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getAttemptTimestamps } from '@/lib/data/attempts';
import { cn } from '@/lib/utils';

interface StreakState {
  streak: number;
  doneToday: boolean;
  last7: boolean[]; // oldest → today
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function computeStreak(timestamps: string[]): StreakState {
  const days = new Set(timestamps.map((iso) => dayKey(new Date(iso))));
  const today = new Date();
  const doneToday = days.has(dayKey(today));

  let streak = 0;
  const cursor = new Date(today);
  if (!doneToday) cursor.setDate(cursor.getDate() - 1); // a streak from yesterday is still alive today
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const last7: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7.push(days.has(dayKey(d)));
  }
  return { streak, doneToday, last7 };
}

/** A compact study-streak chip. Hidden until there's an active (≥1 day) streak. */
export function StreakIndicator() {
  const { user, loading, supabase } = useAuth();
  const [state, setState] = useState<StreakState | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    getAttemptTimestamps(supabase, user.id)
      .then((ts) => active && setState(computeStreak(ts)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, loading, supabase]);

  if (!state || state.streak < 1) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
      <Flame className="size-5 shrink-0 text-orange-500" />
      <div className="min-w-0 flex-1">
        <span className="font-semibold tabular-nums">{state.streak}-day streak</span>
        <span className="ml-2 text-sm text-muted-foreground">
          {state.doneToday ? 'practiced today ✓' : 'practice today to keep it going'}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1" aria-hidden="true">
        {state.last7.map((on, i) => (
          <span
            key={i}
            className={cn('size-2 rounded-full', on ? 'bg-orange-500' : 'bg-muted')}
          />
        ))}
      </div>
    </div>
  );
}
