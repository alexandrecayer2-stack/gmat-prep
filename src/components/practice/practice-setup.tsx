'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Difficulty, QuestionType, Section } from '@/lib/domain/types';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  DIFFICULTY_LEVEL,
  QUESTION_TYPE_LABELS,
  SECTIONS,
  SECTION_COLORS,
  SECTION_LABELS,
  SECTION_TYPES,
} from '@/lib/domain/constants';
import { cn } from '@/lib/utils';
import { SectionLabel } from '@/components/ui/section-label';
import { SECTION_ICONS } from '@/components/ui/section-icons';

export interface PracticeFilters {
  section: Section;
  types: QuestionType[];
  difficulty: 'any' | Difficulty;
  count: number;
}

export function PracticeSetup({
  counts,
  initialSection,
  onStart,
}: {
  counts: Record<Section, number>;
  initialSection?: Section;
  // When provided (offline mode) Start hands back the chosen filters instead of
  // navigating to the server-rendered session route.
  onStart?: (filters: PracticeFilters) => void;
}) {
  const router = useRouter();
  const [section, setSection] = useState<Section | null>(initialSection ?? null);
  const [types, setTypes] = useState<QuestionType[]>(
    initialSection ? SECTION_TYPES[initialSection] : [],
  );
  const [difficulty, setDifficulty] = useState<'any' | Difficulty>('any');
  const [count, setCount] = useState<number>(10);

  function pickSection(s: Section) {
    setSection(s);
    setTypes(SECTION_TYPES[s]);
  }

  function toggleType(t: QuestionType) {
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  function start() {
    if (!section || types.length === 0) return;

    // Offline mode: build the session in-place from the cached bank.
    if (onStart) {
      onStart({ section, types, difficulty, count });
      return;
    }

    const params = new URLSearchParams({
      section,
      types: types.join(','),
      difficulty,
      count: String(count),
    });

    // If the connection dropped, fall back to the self-contained offline route
    // (a hard nav the service worker can serve) instead of the server session.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      window.location.assign(`/practice/offline?${params.toString()}`);
      return;
    }

    router.push(`/practice/session?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a section, choose question types and difficulty, then start. You get immediate
          feedback and a full explanation after every question.
        </p>
      </div>

      <section>
        <SectionLabel className="mb-2">1 · Section</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-3">
          {SECTIONS.map((s) => {
            const colors = SECTION_COLORS[s];
            const Icon = SECTION_ICONS[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => pickSection(s)}
                className={cn(
                  'card-hover rounded-xl border p-4 text-left',
                  section === s
                    ? 'border-primary bg-accent'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50',
                )}
              >
                <span
                  className={cn('mb-2 flex size-8 items-center justify-center rounded-lg', colors.bg)}
                >
                  <Icon className={cn('size-4', colors.text)} />
                </span>
                <div className="font-medium">{SECTION_LABELS[s]}</div>
                <div className="mt-1 text-xs text-muted-foreground">{counts[s] ?? 0} questions</div>
              </button>
            );
          })}
        </div>
      </section>

      {section && (
        <section className="animate-fade-in-up">
          <SectionLabel className="mb-2">2 · Question types</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {SECTION_TYPES[section].map((t) => {
              const on = types.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  aria-pressed={on}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                    on
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {QUESTION_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {section && (
        <section className="animate-fade-in-up">
          <SectionLabel className="mb-2">3 · Difficulty</SectionLabel>
          <div className="flex flex-wrap gap-2">
            <DiffButton
              active={difficulty === 'any'}
              onClick={() => setDifficulty('any')}
              label="Any"
              sub="mixed"
            />
            {DIFFICULTIES.map((d) => (
              <DiffButton
                key={d}
                active={difficulty === d}
                onClick={() => setDifficulty(d)}
                label={DIFFICULTY_LABELS[d]}
                sub={DIFFICULTY_LEVEL[d]}
              />
            ))}
          </div>
        </section>
      )}

      {section && (
        <section className="animate-fade-in-up">
          <SectionLabel className="mb-2">4 · Number of questions</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 20, 40].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                aria-pressed={count === n}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  count === n
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </section>
      )}

      <div>
        <button
          type="button"
          onClick={start}
          disabled={!section || types.length === 0}
          className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start practice
        </button>
      </div>
    </div>
  );
}

function DiffButton({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-sm transition-colors',
        active ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
      )}
    >
      <span className="font-medium">{label}</span>{' '}
      <span className="text-xs text-muted-foreground">· {sub}</span>
    </button>
  );
}
