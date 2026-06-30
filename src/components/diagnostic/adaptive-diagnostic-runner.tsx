'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import type { QuestionWithGroup, SelectedAnswer, Section } from '@/lib/domain/types';
import { SECTIONS, SECTION_LABELS } from '@/lib/domain/constants';
import { emptySelection, gradeAnswer, isAnswerComplete } from '@/lib/domain/grade';
import { pickNextUnitIndex } from '@/lib/domain/adaptive';
import type { GradedItem } from '@/lib/domain/scoring';
import { formatTime } from '@/lib/utils';
import { QuestionPrompt } from '@/components/practice/question-prompt';
import { AnswerInputs } from '@/components/practice/answer-inputs';
import { Card } from '@/components/ui/card';
import type { DiagnosticResult } from './diagnostic-runner';

type Unit = QuestionWithGroup[];

interface Machine {
  results: DiagnosticResult[];
  usedIds: Set<string>;
  secIdx: number;
  unit: Unit | null; // current unit; null only when finished
  pos: number; // index within the current unit
}

function toItem(r: DiagnosticResult): GradedItem {
  return {
    section: r.question.section,
    difficulty: r.question.difficulty,
    type: r.question.type,
    topic: r.question.topic,
    isCorrect: r.isCorrect,
  };
}

/**
 * Adaptive diagnostic: per section, administer up to `itemsPerSection` questions,
 * choosing each next unit by Fisher information at the running ability estimate.
 * Question groups (RC / Multi-Source) are administered atomically as one unit.
 */
export function AdaptiveDiagnosticRunner({
  pool,
  itemsPerSection,
  onComplete,
}: {
  pool: QuestionWithGroup[];
  itemsPerSection: number;
  onComplete: (results: DiagnosticResult[]) => void;
}) {
  // Build units (a standalone question, or a whole group) bucketed by section.
  const unitsBySection = useMemo(() => {
    const groups = new Map<string, Unit>();
    const bySection: Record<Section, Unit[]> = { quant: [], verbal: [], data_insights: [] };
    for (const q of pool) {
      if (q.groupId) {
        let u = groups.get(q.groupId);
        if (!u) {
          u = [];
          groups.set(q.groupId, u);
          bySection[q.section].push(u);
        }
        u.push(q);
      } else {
        bySection[q.section].push([q]);
      }
    }
    for (const u of groups.values()) u.sort((a, b) => a.orderIndex - b.orderIndex);
    return bySection;
  }, [pool]);

  const targetTotal = itemsPerSection * SECTIONS.length;

  // Pick the next unit for a section given what's been used; null if the section
  // is complete (budget reached or no units left).
  const pickForSection = useCallback(
    (results: DiagnosticResult[], usedIds: Set<string>, secIdx: number): Unit | null => {
      const section = SECTIONS[secIdx];
      const sectionResults = results.filter((r) => r.question.section === section);
      if (sectionResults.length >= itemsPerSection) return null;
      const remaining = unitsBySection[section].filter((u) => !u.some((q) => usedIds.has(q.id)));
      if (remaining.length === 0) return null;
      const idx = pickNextUnitIndex(
        remaining.map((u) => ({ difficulty: u[0].difficulty, type: u[0].type })),
        sectionResults.map(toItem),
      );
      return remaining[idx] ?? null;
    },
    [unitsBySection, itemsPerSection],
  );

  // Advance from `secIdx` to the next section that still has a unit to serve.
  const advance = useCallback(
    (results: DiagnosticResult[], usedIds: Set<string>, secIdx: number): Machine => {
      for (let s = secIdx; s < SECTIONS.length; s++) {
        const unit = pickForSection(results, usedIds, s);
        if (unit) return { results, usedIds, secIdx: s, unit, pos: 0 };
      }
      return { results, usedIds, secIdx: SECTIONS.length, unit: null, pos: 0 };
    },
    [pickForSection],
  );

  const [machine, setMachine] = useState<Machine>(() => advance([], new Set(), 0));
  const q = machine.unit ? machine.unit[machine.pos] : null;

  // Selections keyed by question id, so a group's questions never lose an answer
  // and nothing has to be reset in an effect.
  const [answers, setAnswers] = useState<Record<string, SelectedAnswer>>({});
  const selected: SelectedAnswer = q
    ? (answers[q.id] ?? emptySelection(q.correctAnswer))
    : { format: 'single', value: null };
  const setSelected = useCallback(
    (sel: SelectedAnswer) => {
      if (q) setAnswers((a) => ({ ...a, [q.id]: sel }));
    },
    [q],
  );

  // Total elapsed time (whole diagnostic). Per-question time is measured from a
  // ref updated in the submit handler, so render stays pure.
  const [elapsed, setElapsed] = useState(0);
  const enteredAt = useRef(0);
  useEffect(() => {
    enteredAt.current = Date.now();
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const complete = q ? isAnswerComplete(q.correctAnswer, selected) : false;

  const submit = useCallback(() => {
    if (!q || !machine.unit) return;
    const sel = answers[q.id] ?? emptySelection(q.correctAnswer);
    if (!isAnswerComplete(q.correctAnswer, sel)) return;
    const now = Date.now();
    const result: DiagnosticResult = {
      question: q,
      selected: sel,
      isCorrect: gradeAnswer(q.correctAnswer, sel),
      timeSpent: Math.max(0, Math.round((now - enteredAt.current) / 1000)),
    };
    enteredAt.current = now;
    const results = [...machine.results, result];
    const usedIds = new Set(machine.usedIds).add(q.id);

    const next: Machine =
      machine.pos < machine.unit.length - 1
        ? { ...machine, results, usedIds, pos: machine.pos + 1 }
        : advance(results, usedIds, machine.secIdx);

    if (!next.unit) {
      onComplete(results);
      return;
    }
    setMachine(next);
  }, [q, machine, answers, advance, onComplete]);

  if (!q) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        Scoring your diagnostic…
      </div>
    );
  }

  const answeredCount = machine.results.length;
  const questionNumber = answeredCount + 1;
  const pct = Math.min(100, Math.round((answeredCount / targetTotal) * 100));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            Question {questionNumber}{' '}
            <span className="text-muted-foreground">of ~{targetTotal}</span>
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {SECTION_LABELS[q.section]}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
          <Clock className="size-3.5" /> {formatTime(elapsed)}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Diagnostic progress"
        className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <Card className="p-5">
        <QuestionPrompt question={q} />
        <div className="mt-5">
          <AnswerInputs question={q} selected={selected} onChange={setSelected} revealed={false} />
        </div>
      </Card>

      <div className="mt-5 flex items-center justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={!complete}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        The next question adapts to your answers · no feedback until your results.
      </p>
    </div>
  );
}
