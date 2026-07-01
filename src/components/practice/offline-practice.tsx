'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudOff, Loader2, WifiOff } from 'lucide-react';
import type { Difficulty, QuestionType, QuestionWithGroup, Section } from '@/lib/domain/types';
import { SECTIONS, SECTION_TYPES } from '@/lib/domain/constants';
import { loadBank } from '@/lib/offline/bank';
import { selectPracticeQuestions, type QuestionBank } from '@/lib/domain/selection';
import { PracticeSetup, type PracticeFilters } from './practice-setup';
import { PracticeRunner } from './practice-runner';

type Status = 'loading' | 'ready' | 'running' | 'unavailable';

function sectionCounts(bank: QuestionBank): Record<Section, number> {
  const counts = { quant: 0, verbal: 0, data_insights: 0 } as Record<Section, number>;
  for (const q of bank.questions) counts[q.section] += 1;
  return counts;
}

// Parse a preselected filter from the URL (?section=&types=&difficulty=&count=),
// used when the online setup page hands off to offline mode mid-session.
function filtersFromSearch(search: string): PracticeFilters | null {
  const p = new URLSearchParams(search);
  const section = p.get('section') as Section | null;
  if (!section || !SECTIONS.includes(section)) return null;
  const allowed = SECTION_TYPES[section];
  const types = (p.get('types') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is QuestionType => (allowed as string[]).includes(t));
  if (types.length === 0) return null;
  const difficulty = p.get('difficulty');
  const count = Number(p.get('count'));
  return {
    section,
    types,
    difficulty:
      difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
        ? (difficulty as Difficulty)
        : 'any',
    count: Number.isFinite(count) && count > 0 ? Math.min(count, 100) : 10,
  };
}

export function OfflinePractice() {
  const [status, setStatus] = useState<Status>('loading');
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [questions, setQuestions] = useState<QuestionWithGroup[]>([]);

  function run(bankData: QuestionBank, filters: PracticeFilters) {
    const selected = selectPracticeQuestions(bankData, {
      section: filters.section,
      types: filters.types,
      difficulty: filters.difficulty === 'any' ? undefined : filters.difficulty,
      count: filters.count,
    });
    if (selected.length === 0) return;
    setQuestions(selected);
    setStatus('running');
  }

  useEffect(() => {
    let cancelled = false;
    loadBank()
      .then((b) => {
        if (cancelled) return;
        setBank(b);
        // Seamless hand-off: if the URL carries a filter, start immediately.
        const preset = filtersFromSearch(window.location.search);
        if (preset) run(b, preset);
        else setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">Loading your offline question bank…</p>
      </Centered>
    );
  }

  if (status === 'unavailable') {
    return (
      <Centered>
        <div className="rounded-full bg-muted p-4">
          <CloudOff className="h-8 w-8 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="mt-6 text-lg font-semibold">Questions aren&apos;t downloaded yet</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Open the app once while you have a connection and the whole question bank
          (about 2 MB) is saved to your device. After that, practice works fully
          offline — including answers and explanations.
        </p>
        <Link
          href="/practice"
          className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to practice
        </Link>
      </Centered>
    );
  }

  if (status === 'running') {
    return <PracticeRunner questions={questions} />;
  }

  // ready — show the setup, sourced from the cached bank
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <WifiOff className="h-4 w-4" aria-hidden />
        Offline mode — your progress will sync when you&apos;re back online.
      </div>
      <PracticeSetup counts={sectionCounts(bank!)} onStart={(f) => run(bank!, f)} />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      {children}
    </div>
  );
}
