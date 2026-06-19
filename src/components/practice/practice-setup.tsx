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
  SECTION_LABELS,
  SECTION_TYPES,
} from '@/lib/domain/constants';
import { cn } from '@/lib/utils';

export function PracticeSetup({
  counts,
  initialSection,
}: {
  counts: Record<Section, number>;
  initialSection?: Section;
}) {
  const router = useRouter();
  const [section, setSection] = useState<Section | null>(initialSection ?? null);
  const [types, setTypes] = useState<QuestionType[]>(
    initialSection ? SECTION_TYPES[initialSection] : [],
  );
  const [difficulty, setDifficulty] = useState<'any' | Difficulty>('any');

  function pickSection(s: Section) {
    setSection(s);
    setTypes(SECTION_TYPES[s]);
  }

  function toggleType(t: QuestionType) {
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  function start() {
    if (!section || types.length === 0) return;
    const params = new URLSearchParams({
      section,
      types: types.join(','),
      difficulty,
    });
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
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          1 · Section
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pickSection(s)}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors',
                section === s
                  ? 'border-primary bg-accent'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50',
              )}
            >
              <div className="font-medium">{SECTION_LABELS[s]}</div>
              <div className="mt-1 text-xs text-muted-foreground">{counts[s] ?? 0} questions</div>
            </button>
          ))}
        </div>
      </section>

      {section && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            2 · Question types
          </h2>
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
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            3 · Difficulty
          </h2>
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

      <div>
        <button
          type="button"
          onClick={start}
          disabled={!section || types.length === 0}
          className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
