'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import type { QuestionWithGroup, SelectedAnswer } from '@/lib/domain/types';
import { SECTION_LABELS } from '@/lib/domain/constants';
import { emptySelection, gradeAnswer, isAnswerComplete } from '@/lib/domain/grade';
import { cn, formatTime } from '@/lib/utils';
import { QuestionPrompt } from '@/components/practice/question-prompt';
import { AnswerInputs } from '@/components/practice/answer-inputs';

export interface DiagnosticResult {
  question: QuestionWithGroup;
  selected: SelectedAnswer;
  isCorrect: boolean;
  timeSpent: number;
}

export function DiagnosticRunner({
  questions,
  onComplete,
}: {
  questions: QuestionWithGroup[];
  onComplete: (results: DiagnosticResult[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SelectedAnswer>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, emptySelection(q.correctAnswer)])),
  );
  const [elapsed, setElapsed] = useState(0);
  const timeRef = useRef<Record<string, number>>({});
  const enteredAt = useRef<number>(Date.now());

  const q = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = questions.filter((qq) =>
    isAnswerComplete(qq.correctAnswer, answers[qq.id]),
  ).length;

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const commitTime = useCallback(() => {
    const id = questions[index].id;
    timeRef.current[id] = (timeRef.current[id] ?? 0) + (Date.now() - enteredAt.current) / 1000;
    enteredAt.current = Date.now();
  }, [index, questions]);

  const go = useCallback(
    (to: number) => {
      commitTime();
      setIndex(to);
    },
    [commitTime],
  );

  const finish = useCallback(() => {
    commitTime();
    onComplete(
      questions.map((qq) => ({
        question: qq,
        selected: answers[qq.id],
        isCorrect: gradeAnswer(qq.correctAnswer, answers[qq.id]),
        timeSpent: Math.round(timeRef.current[qq.id] ?? 0),
      })),
    );
  }, [answers, questions, onComplete, commitTime]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isLast) finish();
        else go(index + 1);
        return;
      }
      if (q.correctAnswer.format === 'single' && tag !== 'SELECT' && tag !== 'INPUT') {
        const keys =
          q.type === 'data_sufficiency'
            ? ['A', 'B', 'C', 'D', 'E']
            : (q.choices ?? []).map((c) => c.key);
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= keys.length) {
          setAnswers((a) => ({ ...a, [q.id]: { format: 'single', value: keys[n - 1] } }));
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, index, isLast, finish, go]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            Question {index + 1} <span className="text-muted-foreground">of {questions.length}</span>
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {SECTION_LABELS[q.section]}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
          <Clock className="size-3.5" /> {formatTime(elapsed)}
        </span>
      </div>

      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <QuestionPrompt question={q} />
        <div className="mt-5">
          <AnswerInputs
            question={q}
            selected={answers[q.id]}
            onChange={(sel) => setAnswers((a) => ({ ...a, [q.id]: sel }))}
            revealed={false}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => go(index - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
        >
          <ChevronLeft className="size-4" /> Back
        </button>
        <span className="text-xs text-muted-foreground">
          {answeredCount}/{questions.length} answered
        </span>
        {isLast ? (
          <button
            type="button"
            onClick={finish}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Finish &amp; see results
          </button>
        ) : (
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Next <ChevronRight className="size-4" />
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        No feedback during the diagnostic — you&apos;ll get your predicted score and a study plan at the end.
      </p>
    </div>
  );
}
