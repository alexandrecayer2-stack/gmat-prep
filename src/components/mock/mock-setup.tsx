'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock } from 'lucide-react';
import type { Section } from '@/lib/domain/types';
import { SECTIONS, SECTION_LABELS, SECTION_MINUTES } from '@/lib/domain/constants';
import {
  MOCK_DIFFICULTY_LABELS,
  plannedQuestionCount,
  serializeMockConfig,
  targetCount,
  type MockConfig,
  type MockDifficulty,
  type MockLength,
} from '@/lib/domain/mock';
import { cn } from '@/lib/utils';

const LENGTHS: { value: MockLength; label: string; sub: string }[] = [
  { value: 'full', label: 'Full length', sub: 'real GMAT counts' },
  { value: 'short', label: 'Short', sub: '10 per section' },
];

const DIFFICULTIES: MockDifficulty[] = ['balanced', 'easy', 'medium', 'hard'];

export function MockSetup({ counts }: { counts: Record<Section, number> }) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([...SECTIONS]);
  const [length, setLength] = useState<MockLength>('full');
  const [difficulty, setDifficulty] = useState<MockDifficulty>('balanced');
  const [timed, setTimed] = useState(true);

  const config: MockConfig = useMemo(
    () => ({ sections: SECTIONS.filter((s) => sections.includes(s)), length, difficulty, timed }),
    [sections, length, difficulty, timed],
  );

  const planned = plannedQuestionCount(config);
  const totalMinutes = timed ? config.sections.length * 45 : 0;

  function toggleSection(s: Section) {
    setSections((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function start() {
    if (config.sections.length === 0) return;
    const params = new URLSearchParams(serializeMockConfig(config));
    router.push(`/mock/session?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mock Exam</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A timed, exam-style run with no feedback until the end — then a predicted GMAT Focus score
          (60–90 per section, 205–805 total) and a full per-question review. Build it below.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          1 · Sections
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {SECTIONS.map((s) => {
            const on = sections.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSection(s)}
                aria-pressed={on}
                className={cn(
                  'rounded-xl border p-4 text-left transition-colors',
                  on
                    ? 'border-primary bg-accent'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50',
                )}
              >
                <div className="font-medium">{SECTION_LABELS[s]}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {on ? `${Math.min(targetCount(s, length), counts[s] ?? 0)} questions` : 'Off'}
                  {timed && on ? ` · ${SECTION_MINUTES[s]} min` : ''}
                </div>
              </button>
            );
          })}
        </div>
        {config.sections.length === 0 && (
          <p className="mt-2 text-xs text-danger">Select at least one section.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          2 · Length
        </h2>
        <div className="flex flex-wrap gap-2">
          {LENGTHS.map((l) => (
            <Pill key={l.value} active={length === l.value} onClick={() => setLength(l.value)}>
              <span className="font-medium">{l.label}</span>{' '}
              <span className="text-xs text-muted-foreground">· {l.sub}</span>
            </Pill>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          3 · Difficulty mix
        </h2>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <Pill key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              <span className="font-medium">{MOCK_DIFFICULTY_LABELS[d]}</span>
            </Pill>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          4 · Timing
        </h2>
        <div className="flex flex-wrap gap-2">
          <Pill active={timed} onClick={() => setTimed(true)}>
            <Clock className="mr-1 inline size-3.5" />
            <span className="font-medium">Timed</span>{' '}
            <span className="text-xs text-muted-foreground">· 45 min / section</span>
          </Pill>
          <Pill active={!timed} onClick={() => setTimed(false)}>
            <span className="font-medium">Untimed</span>{' '}
            <span className="text-xs text-muted-foreground">· no clock</span>
          </Pill>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={start}
          disabled={config.sections.length === 0}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start exam <ArrowRight className="size-4" />
        </button>
        <span className="text-sm text-muted-foreground">
          {config.sections.length} section{config.sections.length === 1 ? '' : 's'} · up to {planned}{' '}
          questions{totalMinutes ? ` · ${totalMinutes} min` : ' · untimed'}
        </span>
      </div>
    </div>
  );
}

function Pill({
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
        'rounded-lg border px-3 py-1.5 text-sm transition-colors',
        active ? 'border-primary bg-accent' : 'border-border hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}
