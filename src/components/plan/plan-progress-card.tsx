'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getUserStats, type UserStats } from '@/lib/data/attempts';
import type { SavedPlan } from '@/lib/data/plans';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { cn } from '@/lib/utils';

/**
 * "Progress since your diagnostic": re-estimates the score from recent practice
 * (via the IRT model in getUserStats) and shows diagnostic → now → target, how
 * far you've closed the gap, and hours logged vs. the plan's weekly budget.
 */
export function PlanProgressCard({ plan }: { plan: SavedPlan }) {
  const { user, loading, supabase } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    getUserStats(supabase, user.id)
      .then((s) => {
        if (active) {
          setStats(s);
          setReady(true);
        }
      })
      .catch((e) => {
        console.error('Failed to load progress:', e);
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [user, loading, supabase]);

  if (!ready) {
    return <div className="h-28 animate-pulse rounded-xl border border-border bg-muted/40" />;
  }

  const diagnostic = plan.predictedTotal;
  const target = plan.targetTotal;
  const current = stats?.estimate?.total ?? null;
  const practiceCount = stats?.estimateQuestionCount ?? 0;
  const hoursLogged = (stats?.timeSpentSeconds ?? 0) / 3600;

  // Fraction of the diagnostic→target gap now closed (only meaningful when the
  // target is above the diagnostic and we have a current estimate).
  const gap = target - diagnostic;
  const closed =
    current !== null && gap > 0 ? Math.max(0, Math.min(1, (current - diagnostic) / gap)) : null;
  const delta = current !== null ? current - diagnostic : null;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel as="div">Progress since your diagnostic</SectionLabel>
        {delta !== null && delta !== 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-sm font-medium',
              delta > 0 ? 'text-success' : 'text-danger',
            )}
          >
            {delta > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            {delta > 0 ? '+' : ''}
            {delta} pts
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Milestone label="At diagnostic" value={diagnostic} />
        <Milestone
          label={current !== null ? `Now · ${practiceCount} practiced` : 'Now'}
          value={current}
          highlight
        />
        <Milestone label="Target" value={target} accent />
      </div>

      {closed !== null ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Gap to target</span>
            <span>{Math.round(closed * 100)}% closed</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(closed * 100)}%` }}
            />
          </div>
        </div>
      ) : current === null ? (
        <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          Answer a few practice questions and your estimate here will update from your recent form.{' '}
          <Link href="/practice" className="font-medium text-primary hover:underline">
            Practice now
          </Link>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-4" />
          <span className="font-medium tabular-nums text-foreground">{hoursLogged.toFixed(1)} h</span>{' '}
          logged · plan is {plan.weeklyHours} h/week
        </span>
        <Link
          href="/practice"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          Keep practicing <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

function Milestone({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: number | null;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg p-3 text-center',
        highlight ? 'bg-primary/10' : 'bg-muted/50',
      )}
    >
      <div
        className={cn(
          'font-heading text-xl font-bold tabular-nums',
          accent && 'text-primary',
          value === null && 'text-muted-foreground',
        )}
      >
        {value ?? '—'}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
