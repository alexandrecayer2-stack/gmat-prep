'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-provider';
import { getUserStats, type UserStats } from '@/lib/data/attempts';
import { SECTIONS, SECTION_LABELS } from '@/lib/domain/constants';
import type { Section } from '@/lib/domain/types';

export function DashboardStats() {
  const { user, loading, supabase } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setBusy(false);
      return;
    }
    let active = true;
    setBusy(true);
    getUserStats(supabase, user.id)
      .then((s) => {
        if (active) {
          setStats(s);
          setBusy(false);
        }
      })
      .catch((e) => {
        console.error('Failed to load stats:', e);
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [user, loading, supabase]);

  if (busy) {
    return <div className="h-32 animate-pulse rounded-xl border border-border bg-muted/40" />;
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No attempts yet — your accuracy and weak areas will appear here once you start practicing.
        </p>
        <Link
          href="/practice"
          className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Start practicing
        </Link>
      </div>
    );
  }

  const pct = Math.round((stats.correct / stats.total) * 100);
  const weakest = findWeakest(stats);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Overall accuracy
        </div>
        <div className="mt-2 text-4xl font-bold tabular-nums">{pct}%</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {stats.correct} / {stats.total} correct
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 md:col-span-2">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Accuracy by section
        </div>
        <div className="space-y-3">
          {SECTIONS.map((s) => {
            const t = stats.bySection[s];
            const p = t && t.total ? Math.round((t.correct / t.total) * 100) : null;
            return (
              <div key={s}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{SECTION_LABELS[s]}</span>
                  <span className="text-muted-foreground">
                    {p === null ? '—' : `${p}% (${t.correct}/${t.total})`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${p ?? 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {weakest && (
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">Weakest topic: </span>
            <span className="font-medium capitalize">{weakest.topic}</span>
            <span className="text-muted-foreground">
              {' '}
              · {weakest.pct}% ({weakest.correct}/{weakest.total})
            </span>
            <Link
              href={`/practice?section=${weakest.section}`}
              className="ml-2 font-medium text-primary hover:underline"
            >
              Practice →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function findWeakest(stats: UserStats) {
  let worst:
    | { topic: string; section: Section; pct: number; correct: number; total: number }
    | null = null;
  for (const [key, t] of Object.entries(stats.byTopic)) {
    const topic = key.split('::')[1] ?? key;
    const pct = Math.round((t.correct / t.total) * 100);
    if (!worst || pct < worst.pct || (pct === worst.pct && t.total > worst.total)) {
      worst = { topic, section: t.section, pct, correct: t.correct, total: t.total };
    }
  }
  return worst;
}
