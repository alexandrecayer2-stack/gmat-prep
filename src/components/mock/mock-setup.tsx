'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronDown, Clock } from 'lucide-react';
import type { Section } from '@/lib/domain/types';
import { SECTIONS, SECTION_LABELS, SECTION_MINUTES, SECTION_QUESTION_COUNT } from '@/lib/domain/constants';
import {
  MOCK_DIFFICULTY_LABELS,
  serializeMockConfig,
  targetCount,
  type MockConfig,
  type MockDifficulty,
  type MockLength,
} from '@/lib/domain/mock';
import { cn } from '@/lib/utils';

const DIFFICULTIES: MockDifficulty[] = ['balanced', 'easy', 'medium', 'hard'];
const LENGTHS: { value: MockLength; label: string }[] = [
  { value: 'full', label: 'Full length (real GMAT counts)' },
  { value: 'short', label: 'Short (10 per section)' },
];

const SECTION_ORDER: Section[] = ['quant', 'verbal', 'data_insights'];

export function MockSetup({ counts }: { counts: Record<Section, number> }) {
  const router = useRouter();

  // Default = full GMAT exam, all sections, timed, balanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sections, setSections] = useState<Section[]>([...SECTION_ORDER]);
  const [length, setLength] = useState<MockLength>('full');
  const [difficulty, setDifficulty] = useState<MockDifficulty>('balanced');
  const [timed, setTimed] = useState(true);

  const config: MockConfig = {
    sections: SECTION_ORDER.filter((s) => sections.includes(s)),
    length,
    difficulty,
    timed,
  };

  const totalMinutes = config.sections.reduce(
    (n, s) => n + (timed ? SECTION_MINUTES[s] : 0),
    0,
  );
  const totalQuestions = config.sections.reduce(
    (n, s) => n + Math.min(targetCount(s, length), counts[s] ?? 0),
    0,
  );

  function start() {
    if (config.sections.length === 0) return;
    router.push(`/mock/session?${new URLSearchParams(serializeMockConfig(config)).toString()}`);
  }

  const noneSelected = config.sections.length === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mock Exam</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A full simulated GMAT Focus exam — no feedback until the end, then a predicted score (205–805)
          and a per-question review.
        </p>
      </div>

      {/* GMAT structure summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {SECTION_ORDER.map((s) => {
          const available = counts[s] ?? 0;
          const needed = targetCount(s, length);
          const enough = available >= needed;
          return (
            <div
              key={s}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="text-sm font-medium">{SECTION_LABELS[s]}</div>
              <div className="mt-1 tabular-nums text-2xl font-bold">
                {Math.min(needed, available)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">questions</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {SECTION_MINUTES[s]} min
                {!enough && available > 0 && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">({available} available)</span>
                )}
                {available === 0 && (
                  <span className="ml-1 text-danger">no questions</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary CTA */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={start}
          disabled={noneSelected || totalQuestions === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start exam
          <ArrowRight className="size-4" />
        </button>
        {totalQuestions > 0 && (
          <span className="text-sm text-muted-foreground">
            {totalQuestions} questions
            {timed && totalMinutes > 0
              ? ` · ${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 > 0 ? `${totalMinutes % 60}min` : ''}`
              : ' · untimed'}
          </span>
        )}
        {totalQuestions === 0 && (
          <span className="text-sm text-danger">No questions available in the database.</span>
        )}
      </div>

      {/* Advanced options (collapsed by default) */}
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn('size-4 transition-transform', showAdvanced && 'rotate-180')}
          />
          Customize
        </button>

        {showAdvanced && (
          <div className="mt-5 space-y-6">
            {/* Sections */}
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sections
              </h2>
              <div className="flex flex-wrap gap-2">
                {SECTION_ORDER.map((s) => {
                  const on = sections.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setSections((cur) =>
                          cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
                        )
                      }
                      aria-pressed={on}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                        on ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                      )}
                    >
                      {SECTION_LABELS[s]}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({SECTION_QUESTION_COUNT[s]}q)
                      </span>
                    </button>
                  );
                })}
              </div>
              {noneSelected && (
                <p className="mt-2 text-xs text-danger">Select at least one section.</p>
              )}
            </section>

            {/* Length */}
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Length
              </h2>
              <div className="flex flex-wrap gap-2">
                {LENGTHS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLength(l.value)}
                    aria-pressed={length === l.value}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                      length === l.value
                        ? 'border-primary bg-accent'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Difficulty */}
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Difficulty mix
              </h2>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    aria-pressed={difficulty === d}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                      difficulty === d
                        ? 'border-primary bg-accent'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    {MOCK_DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
            </section>

            {/* Timing */}
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Timing
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTimed(true)}
                  aria-pressed={timed}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                    timed ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                  )}
                >
                  <Clock className="mr-1 inline size-3.5" />
                  Timed · 45 min / section
                </button>
                <button
                  type="button"
                  onClick={() => setTimed(false)}
                  aria-pressed={!timed}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                    !timed ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
                  )}
                >
                  Untimed
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
