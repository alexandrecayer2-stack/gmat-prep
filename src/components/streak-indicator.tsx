'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getAttemptTimestamps } from '@/lib/data/attempts';
import { computeStreak, type StreakState } from '@/lib/streak';
import { cn } from '@/lib/utils';

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
    <div className="animate-fade-in-up flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
      <Flame className="size-5 shrink-0 text-gold" />
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
            className={cn('size-2 rounded-full', on ? 'bg-gold' : 'bg-muted')}
          />
        ))}
      </div>
    </div>
  );
}
