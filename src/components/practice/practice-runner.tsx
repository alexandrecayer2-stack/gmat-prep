'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calculator as CalcIcon, Check, ChevronDown, ChevronRight, Clock, RotateCcw, X } from 'lucide-react';
import type { QuestionWithGroup, SelectedAnswer } from '@/lib/domain/types';
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  SECTION_SHORT,
} from '@/lib/domain/constants';
import { emptySelection, gradeAnswer, isAnswerComplete } from '@/lib/domain/grade';
import { useAuth } from '@/lib/auth/auth-provider';
import { saveAttempt } from '@/lib/offline/save-attempt';
import { cn, formatTime } from '@/lib/utils';
import { Calculator } from '@/components/calculator';
import { Markdown } from '@/components/markdown';
import { QuestionPrompt } from './question-prompt';
import { AnswerInputs } from './answer-inputs';
import { Card } from '@/components/ui/card';
import { useCountUp } from '@/components/ui/accuracy-ring';
import { ReviewQuestionDetail } from '@/components/review/review-question-detail';

interface Result {
  questionId: string;
  isCorrect: boolean;
  selectedAnswer: SelectedAnswer;
  timeSpent: number;
}

export function PracticeRunner({ questions }: { questions: QuestionWithGroup[] }) {
  const { user, supabase } = useAuth();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<SelectedAnswer>(() =>
    emptySelection(questions[0].correctAnswer),
  );
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [showCalc, setShowCalc] = useState(false);
  const [done, setDone] = useState(false);
  const startRef = useRef<number>(Date.now());

  const q = questions[index];
  const isDI = q.section === 'data_insights';
  const complete = isAnswerComplete(q.correctAnswer, selected);

  // Reset per-question state whenever we advance.
  useEffect(() => {
    setSelected(emptySelection(questions[index].correctAnswer));
    setSubmitted(false);
    setIsCorrect(false);
    setElapsed(0);
    startRef.current = Date.now();
  }, [index, questions]);

  // Count-up timer; pauses once the question is submitted.
  useEffect(() => {
    if (submitted || done) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(id);
  }, [submitted, done, index]);

  const handleSubmit = useCallback(async () => {
    if (submitted || !isAnswerComplete(q.correctAnswer, selected)) return;
    const correct = gradeAnswer(q.correctAnswer, selected);
    const timeSpent = Math.floor((Date.now() - startRef.current) / 1000);
    setIsCorrect(correct);
    setSubmitted(true);
    setResults((r) => [...r, { questionId: q.id, isCorrect: correct, selectedAnswer: selected, timeSpent }]);

    if (user) {
      // Offline-aware: saves to Supabase when online, otherwise queues locally
      // and syncs on reconnect. Never throws, so it can't break the session.
      await saveAttempt(supabase, {
        userId: user.id,
        questionId: q.id,
        selectedAnswer: selected,
        isCorrect: correct,
        timeSpentSeconds: timeSpent,
        context: 'practice',
      });
    }
  }, [submitted, q, selected, user, supabase]);

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) setDone(true);
    else setIndex((i) => i + 1);
  }, [index, questions.length]);

  // Keyboard shortcuts: 1–5 to pick a single-answer choice, Enter to submit/next.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (submitted) handleNext();
        else handleSubmit();
        return;
      }
      if (!submitted && q.correctAnswer.format === 'single' && tag !== 'SELECT' && tag !== 'INPUT') {
        const keys =
          q.type === 'data_sufficiency'
            ? ['A', 'B', 'C', 'D', 'E']
            : (q.choices ?? []).map((c) => c.key);
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= keys.length) setSelected({ format: 'single', value: keys[n - 1] });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, submitted, q, handleSubmit, handleNext]);

  if (done) {
    return <Summary questions={questions} results={results} />;
  }

  const correctSoFar = results.filter((r) => r.isCorrect).length;
  const lastIndex = index + 1 >= questions.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            Question {index + 1} <span className="text-muted-foreground">of {questions.length}</span>
          </span>
          <span className="hidden gap-1 sm:flex">
            <Badge>{SECTION_SHORT[q.section]}</Badge>
            <Badge>{QUESTION_TYPE_LABELS[q.type]}</Badge>
            <Badge variant={q.difficulty}>{DIFFICULTY_LABELS[q.difficulty]}</Badge>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isDI && (
            <button
              type="button"
              onClick={() => setShowCalc((s) => !s)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-muted',
                showCalc && 'bg-accent text-accent-foreground',
              )}
            >
              <CalcIcon className="size-3.5" /> Calculator
            </button>
          )}
          <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
            <Clock className="size-3.5" /> {formatTime(elapsed)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(((index + 1) / questions.length) * 100)}
        aria-label="Session progress"
        className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <Card className="p-5">
        <QuestionPrompt question={q} />
        <div className="mt-5">
          <AnswerInputs
            question={q}
            selected={selected}
            onChange={setSelected}
            revealed={submitted}
          />
        </div>
      </Card>

      {/* Feedback */}
      {submitted && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'animate-fade-in-up mt-4 rounded-xl border p-4',
            isCorrect ? 'border-success bg-success/10' : 'border-danger bg-danger/10',
          )}
        >
          <div
            className={cn(
              'mb-2 flex items-center gap-2 font-semibold',
              isCorrect ? 'text-success' : 'text-danger',
            )}
          >
            {isCorrect ? <Check className="size-5" /> : <X className="size-5" />}
            {isCorrect ? 'Correct' : 'Incorrect'}
          </div>
          <div className="text-sm">
            <Markdown>{q.explanation}</Markdown>
          </div>
          {q.sourceNote && (
            <p className="mt-2 text-xs text-muted-foreground">Source: {q.sourceNote}</p>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-5 flex items-center justify-between">
        <Link href="/practice" className="text-sm text-muted-foreground hover:text-foreground">
          ← Exit
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {correctSoFar}/{results.length} correct
          </span>
          {!submitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!complete}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              {lastIndex ? 'Finish' : 'Next'} <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts hint — helps power users; hidden on mobile */}
      <p className="mt-3 hidden text-xs text-muted-foreground sm:block">
        Tip: press 1–5 to choose an answer · Enter to submit, then move to the next.
      </p>

      {/* Floating calculator (Data Insights) */}
      {isDI && showCalc && (
        <div className="fixed bottom-4 right-4 z-50">
          <Calculator />
        </div>
      )}
    </div>
  );
}

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: 'easy' | 'medium' | 'hard';
}) {
  return (
    <span
      className={cn(
        'rounded-md px-2 py-0.5 text-xs font-medium',
        !variant && 'bg-muted text-muted-foreground',
        variant === 'easy' && 'bg-success/15 text-success',
        variant === 'medium' && 'bg-warning/15 text-warning',
        variant === 'hard' && 'bg-danger/15 text-danger',
      )}
    >
      {children}
    </span>
  );
}

function Summary({
  questions,
  results,
}: {
  questions: QuestionWithGroup[];
  results: Result[];
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const correct = results.filter((r) => r.isCorrect).length;
  const pct = results.length ? Math.round((correct / results.length) * 100) : 0;
  const animatedPct = useCountUp(pct);
  const totalTime = results.reduce((s, r) => s + r.timeSpent, 0);
  const avgTime = results.length ? Math.round(totalTime / results.length) : 0;
  const missedIds = results.filter((r) => !r.isCorrect).map((r) => r.questionId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card className="animate-fade-in-up p-6">
        <div className="text-center">
          <h1 className="font-heading text-lg font-semibold">Session complete</h1>
          <div className="my-5" role="status" aria-live="polite">
            <div className="font-heading text-5xl font-bold tabular-nums">{animatedPct}%</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {correct} of {results.length} correct
            </div>
          </div>
          {/* Time stats */}
          <div className="mx-auto mb-6 flex max-w-xs justify-center gap-6 text-sm">
            <div>
              <div className="font-semibold tabular-nums">{formatTime(totalTime)}</div>
              <div className="text-xs text-muted-foreground">total time</div>
            </div>
            <div>
              <div className="font-semibold tabular-nums">{formatTime(avgTime)}</div>
              <div className="text-xs text-muted-foreground">avg / question</div>
            </div>
          </div>
        </div>

        {/* Per-question results — expand to review, no need to leave */}
        <ul className="mb-6 space-y-1.5 text-sm">
          {results.map((r, i) => {
            const q = questions.find((x) => x.id === r.questionId);
            const open = expandedId === r.questionId;
            return (
              <li key={r.questionId} className="overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : r.questionId)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                >
                  {r.isCorrect ? (
                    <Check className="size-4 shrink-0 text-success" />
                  ) : (
                    <X className="size-4 shrink-0 text-danger" />
                  )}
                  <span className="text-muted-foreground">Q{i + 1}</span>
                  <span className="truncate">{q ? QUESTION_TYPE_LABELS[q.type] : ''}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {formatTime(r.timeSpent)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {q ? DIFFICULTY_LABELS[q.difficulty] : ''}
                  </span>
                  <ChevronDown
                    className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
                  />
                </button>
                {open && (
                  <div className="border-t border-border p-3">
                    <ReviewQuestionDetail
                      questionId={r.questionId}
                      selectedAnswer={r.selectedAnswer}
                      isCorrect={r.isCorrect}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap justify-center gap-3">
          {missedIds.length > 0 && (
            <button
              type="button"
              onClick={() => router.push(`/practice/session?ids=${missedIds.slice(0, 100).join(',')}`)}
              className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <RotateCcw className="size-4" /> Redo {missedIds.length} missed
            </button>
          )}
          <Link
            href="/practice"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            New session
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
}
