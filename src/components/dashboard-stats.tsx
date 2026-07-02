'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getUserStats, type UserStats } from '@/lib/data/attempts';
import {
  SECTIONS,
  SECTION_COLORS,
  SECTION_LABELS,
  SECTION_SHORT,
  QUESTION_TYPE_LABELS,
} from '@/lib/domain/constants';
import type { Section } from '@/lib/domain/types';
import type { DiagnosticEstimate } from '@/lib/domain/scoring';
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
    return <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-6 text-center">
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

  const hasPractice = !!stats && stats.total > 0;

  if (!stats || (!hasPractice && !stats.estimate)) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No attempts yet — your estimated score and weak areas will appear here once you start
          practicing or take the diagnostic.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Link
            href="/diagnostic"
            className="btn-brand inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
          >
            Take the diagnostic
          </Link>
          <Link
            href="/practice"
            className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Start practicing
          </Link>
        </div>
      </div>
    );
  }

  const pct = hasPractice ? Math.round((stats.correct / stats.total) * 100) : 0;
  const weakest = hasPractice ? findWeakest(stats) : null;

  return (
    <div className="space-y-4">
      {stats.estimate && (
        <EstimateCard estimate={stats.estimate} count={stats.estimateQuestionCount} />
      )}

      {hasPractice && (
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
      )}
    </div>
  );
}

function EstimateCard({ estimate, count }: { estimate: DiagnosticEstimate; count: number }) {
  const insight = findTypeInsight(estimate);
  return (
    <Card className="p-5 animate-fade-in-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel as="div">Estimated GMAT Focus score</SectionLabel>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-heading text-4xl font-bold tabular-nums">{estimate.total}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <TrendingUp className="size-3.5" /> likely {estimate.low}–{estimate.high}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            from your {count} answered question{count === 1 ? '' : 's'} · narrows as you practice
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:min-w-[18rem]">
          {SECTIONS.map((s) => {
            const r = estimate.perSection[s];
            const pct = Math.max(0, Math.min(100, ((r.scaled - 60) / 30) * 100));
            return (
              <div key={s}>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs text-muted-foreground">{SECTION_SHORT[s]}</span>
                  <span className="text-sm font-bold tabular-nums">{r.scaled}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${SECTION_COLORS[s].progressBar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {insight && (
        <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          Relative to your level, your weakest format is{' '}
          <span className="font-medium text-foreground">{QUESTION_TYPE_LABELS[insight.type]}</span>{' '}
          ({Math.round(insight.observedAccuracy * 100)}% vs. an expected{' '}
          {Math.round(insight.expectedAccuracy * 100)}%).
        </p>
      )}
    </Card>
  );
}

/** The question type the user is furthest below their estimated level on (needs a
 *  few attempts to be meaningful), across all sections. */
function findTypeInsight(estimate: DiagnosticEstimate) {
  let worst: DiagnosticEstimate['perSection'][Section]['byType'][number] | null = null;
  for (const s of SECTIONS) {
    for (const t of estimate.perSection[s].byType) {
      if (t.total < 3) continue;
      if (t.delta >= -0.08) continue; // only flag a real shortfall vs. expectation
      if (!worst || t.delta < worst.delta) worst = t;
    }
  }
  return worst;
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
