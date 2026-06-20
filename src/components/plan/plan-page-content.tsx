'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getActivePlan, type SavedPlan } from '@/lib/data/plans';
import { PlanView } from './plan-view';

export function PlanPageContent() {
  const { user, loading, supabase } = useAuth();
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
          setError(false);
          setBusy(false);
        }
      })
      .catch((e) => {
        console.error('Failed to load plan:', e);
        if (active) {
          setError(true);
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, [user, loading, supabase, reloadKey]);

  if (busy) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-xl border border-danger bg-danger/10 p-6">
          <p className="text-sm">Couldn&apos;t load your study plan.</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-3 inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Sparkles className="mx-auto size-8 text-primary" />
        <h1 className="mt-3 text-2xl font-bold">No study plan yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Take the diagnostic to get a predicted score and a personalized plan toward your target.
        </p>
        <Link
          href="/diagnostic"
          className="btn-brand mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium"
        >
          Take the diagnostic
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Your study plan</h1>
        <Link href="/diagnostic" className="text-sm font-medium text-primary hover:underline">
          Retake diagnostic →
        </Link>
      </div>
      <PlanView
        plan={plan.plan}
        predicted={{ total: plan.predictedTotal, low: plan.predictedLow, high: plan.predictedHigh }}
        targetDate={plan.targetDate}
      />
    </div>
  );
}
