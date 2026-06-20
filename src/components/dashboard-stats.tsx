'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getUserStats, type UserStats } from '@/lib/data/attempts';
import { SECTIONS, SECTION_COLORS, SECTION_LABELS } from '@/lib/domain/constants';
import type { Section } from '@/lib/domain/types';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { AccuracyRing } from '@/components/ui/accuracy-ring';

export function DashboardStats() {
  const { user, loading, supabase } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
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
    setBusy(true);
    getUserStats(supabase, user.id)
      .then((s) => {
        if (active) {
          setStats(s);
          setError(false);
          setBusy(false);
        }
      })
      .catch((e) => {
        console.error('Failed to load stats:', e);
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
    return <div className="h-32 animate-pulse rounded-xl border border-border bg-muted/40" />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger bg-danger/10 p-6 text-center">
        <p className="text-sm">Couldn&apos;t load your stats.</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="mt-3 inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Try again
        </button>
      </div>
    );
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
      <Card className="flex flex-col p-5 animate-fade-in-up">
        <SectionLabel as="div">Overall accuracy</SectionLabel>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-3 text-center">
          <AccuracyRing value={pct} />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {stats.correct} / {stats.total} correct
            </p>
            <span className="chip-gold inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
              <Flame className="size-3.5" />
              {stats.total} answered
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-5 md:col-span-2 animate-fade-in-up stagger-1">
        <SectionLabel as="div" className="mb-3">
          Accuracy by section
        </SectionLabel>
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
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={p ?? 0}
                  aria-label={`${SECTION_LABELS[s]} accuracy`}
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className={`h-full rounded-full transition-all ${SECTION_COLORS[s].progressBar}`}
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
      </Card>
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
