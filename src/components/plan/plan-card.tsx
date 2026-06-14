'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Target } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getActivePlan, type SavedPlan } from '@/lib/data/plans';

/** Dashboard hero: either a prompt to take the diagnostic, or a summary of the
 *  active study plan. */
export function PlanCard() {
  const { user, loading, supabase } = useAuth();
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setBusy(false);
      return;
    }
    let active = true;
    getActivePlan(supabase, user.id)
      .then((p) => {
        if (active) {
          setPlan(p);
          setBusy(false);
        }
      })
      .catch(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [user, loading, supabase]);

  if (busy) {
    return <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />;
  }

  if (!plan) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-accent/40 p-5">
        <div className="flex items-center gap-3">
          <Sparkles className="size-6 shrink-0 text-primary" />
          <div>
            <div className="font-medium">Get your predicted score &amp; study plan</div>
            <div className="text-sm text-muted-foreground">
              Take a short diagnostic to see where you stand and how to reach your goal.
            </div>
          </div>
        </div>
        <Link
          href="/diagnostic"
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Take the diagnostic <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  const top = [...plan.plan.sectionFocus].sort((a, b) => b.weeklyHours - a.weeklyHours)[0];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <Target className="size-6 shrink-0 text-primary" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your plan
          </div>
          <div className="font-medium tabular-nums">
            {plan.predictedTotal} → {plan.targetTotal} · {plan.weeklyHours} h/week
            {plan.weeksToGoal ? ` · ~${plan.weeksToGoal} wks` : ''}
          </div>
          {top && (
            <div className="text-sm text-muted-foreground">Top focus: {top.label}</div>
          )}
        </div>
      </div>
      <Link
        href="/plan"
        className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        View plan <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
