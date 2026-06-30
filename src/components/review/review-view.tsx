'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, RotateCcw, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getReviewItems, type ReviewItem } from '@/lib/data/attempts';
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  SECTIONS,
  SECTION_SHORT,
} from '@/lib/domain/constants';
import type { Difficulty, Section } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

type Correctness = 'all' | 'correct' | 'missed';
type SectionFilter = 'all' | Section;
type DifficultyFilter = 'all' | Difficulty;

export function ReviewView() {
  const { user, loading, supabase } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [section, setSection] = useState<SectionFilter>('all');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [correctness, setCorrectness] = useState<Correctness>('all');

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    getReviewItems(supabase, user.id)
      .then((r) => active && setItems(r))
      .catch((e) => {
        console.error('Failed to load review history:', e);
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [user, loading, supabase, reloadKey]);

  // Derived so the effect never calls setState synchronously.
  const busy = loading || (!!user && items === null && !error);

  function retry() {
    setItems(null);
    setError(false);
    setReloadKey((k) => k + 1);
  }

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter(
      (it) =>
        (section === 'all' || it.section === section) &&
        (difficulty === 'all' || it.difficulty === difficulty) &&
        (correctness === 'all' ||
          (correctness === 'correct' ? it.isCorrect : !it.isCorrect)),
    );
  }, [items, section, difficulty, correctness]);

  const missedIds = useMemo(() => filtered.filter((it) => !it.isCorrect).map((it) => it.questionId), [filtered]);

  function redo(ids: string[]) {
    if (ids.length === 0) return;
    router.push(`/practice/session?ids=${ids.slice(0, 100).join(',')}`);
  }

  if (busy) {
    return <div className="mx-auto max-w-4xl px-4 py-10"><div className="h-40 animate-pulse rounded-xl border border-border bg-muted/40" /></div>;
  }

  if (!user) {
    return (
      <Empty
        title="Sign in to see your review history"
        body="Your practice and mock attempts are recorded once you're signed in. Then this page lets you filter them and redo the ones you missed."
      />
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm">Couldn&apos;t load your review history.</p>
        <button
          type="button"
          onClick={retry}
          className="mt-3 inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Empty
        title="No attempts yet"
        body="Once you answer questions in Practice or a Mock Exam, they'll appear here to review and redo."
        cta
      />
    );
  }

  const totalMissed = items.filter((it) => !it.isCorrect).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length} question{items.length === 1 ? '' : 's'} attempted · {totalMissed} missed.
            Filter your history and redo what you got wrong.
          </p>
        </div>
        {missedIds.length > 0 && (
          <button
            type="button"
            onClick={() => redo(missedIds)}
            className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <RotateCcw className="size-4" /> Redo {missedIds.length} missed
          </button>
        )}
      </header>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-4">
        <FilterGroup label="Section">
          <Chip active={section === 'all'} onClick={() => setSection('all')}>All</Chip>
          {SECTIONS.map((s) => (
            <Chip key={s} active={section === s} onClick={() => setSection(s)}>
              {SECTION_SHORT[s]}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="Difficulty">
          <Chip active={difficulty === 'all'} onClick={() => setDifficulty('all')}>All</Chip>
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {DIFFICULTY_LABELS[d]}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label="Result">
          <Chip active={correctness === 'all'} onClick={() => setCorrectness('all')}>All</Chip>
          <Chip active={correctness === 'correct'} onClick={() => setCorrectness('correct')}>Correct</Chip>
          <Chip active={correctness === 'missed'} onClick={() => setCorrectness('missed')}>Missed</Chip>
        </FilterGroup>
      </div>

      {/* List */}
      <p className="mb-2 text-xs text-muted-foreground">
        {filtered.length} shown
      </p>
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No questions match these filters.
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((it) => (
            <li key={it.questionId}>
              <Card className="flex items-center gap-3 p-3">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full',
                    it.isCorrect ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                  )}
                  aria-label={it.isCorrect ? 'Correct' : 'Missed'}
                >
                  {it.isCorrect ? <Check className="size-4" /> : <X className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{plain(it.stem)}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{SECTION_SHORT[it.section]}</span>
                    <span>·</span>
                    <span>{QUESTION_TYPE_LABELS[it.type]}</span>
                    <span>·</span>
                    <span>{DIFFICULTY_LABELS[it.difficulty]}</span>
                    {it.attempts > 1 && (
                      <>
                        <span>·</span>
                        <span>{it.attempts} attempts</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => redo([it.questionId])}
                  className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Redo
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-lg border px-3 py-1 text-sm transition-colors',
        active
          ? 'border-primary bg-accent text-accent-foreground'
          : 'border-border text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function Empty({ title, body, cta }: { title: string; body: string; cta?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{body}</p>
      {cta && (
        <Link
          href="/practice"
          className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go to Practice
        </Link>
      )}
    </div>
  );
}

// Strip Markdown/KaTeX noise for a readable one-line preview.
function plain(stem: string): string {
  return stem
    .replace(/\$([^$]*)\$/g, '$1') // unwrap inline math
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\ge(?:q)?/g, '≥')
    .replace(/\\le(?:q)?/g, '≤')
    .replace(/\\ne(?:q)?/g, '≠')
    .replace(/[\^_]\{([^{}]*)\}/g, '^$1') // a^{x} -> a^x
    .replace(/\\[a-zA-Z]+/g, '') // drop remaining LaTeX commands
    .replace(/[{}\\]/g, '')
    .replace(/[*`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
