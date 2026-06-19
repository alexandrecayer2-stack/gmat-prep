'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  LayoutGrid,
  RotateCcw,
  X,
} from 'lucide-react';
import type { QuestionWithGroup, SelectedAnswer } from '@/lib/domain/types';
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  SECTION_LABELS,
  SECTION_SHORT,
} from '@/lib/domain/constants';
import { estimateDiagnostic, type DiagnosticEstimate, type GradedItem } from '@/lib/domain/scoring';
import { sectionSeconds, type MockConfig } from '@/lib/domain/mock';
import { emptySelection, gradeAnswer, isAnswerComplete } from '@/lib/domain/grade';
import { useAuth } from '@/lib/auth/auth-provider';
import { saveMockSession, type MockAttempt } from '@/lib/data/mock';
import { cn, formatTime } from '@/lib/utils';
import { Markdown } from '@/components/markdown';
import { QuestionPrompt } from '@/components/practice/question-prompt';
import { AnswerInputs } from '@/components/practice/answer-inputs';

export interface MockSectionSet {
  section: QuestionWithGroup['section'];
  questions: QuestionWithGroup[];
}

type Phase = 'exam' | 'break' | 'results';

interface GradedResult {
  question: QuestionWithGroup;
  selected: SelectedAnswer;
  isCorrect: boolean;
  answered: boolean;
}

export function MockRunner({ sections, config }: { sections: MockSectionSet[]; config: MockConfig }) {
  const { user, supabase } = useAuth();

  const [phase, setPhase] = useState<Phase>('exam');
  const [sectionIdx, setSectionIdx] = useState(0);
  const [index, setIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [answers, setAnswers] = useState<Record<string, SelectedAnswer>>(() =>
    Object.fromEntries(
      sections.flatMap((s) => s.questions).map((q) => [q.id, emptySelection(q.correctAnswer)]),
    ),
  );
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [remaining, setRemaining] = useState(0);
  const [estimate, setEstimate] = useState<DiagnosticEstimate | null>(null);
  const [results, setResults] = useState<GradedResult[] | null>(null);

  // Refs so the timer's stale closure still grades the *current* state.
  const answersRef = useRef(answers);
  const sectionIdxRef = useRef(sectionIdx);
  const indexRef = useRef(index);
  const lockedRef = useRef(false);
  const deadlineRef = useRef(0);
  const enteredAt = useRef(0);
  const timeRef = useRef<Record<string, number>>({});
  useEffect(() => void (answersRef.current = answers), [answers]);
  useEffect(() => void (sectionIdxRef.current = sectionIdx), [sectionIdx]);
  useEffect(() => void (indexRef.current = index), [index]);

  const current = sections[sectionIdx];
  const questions = current.questions;
  const q = questions[index];
  const isLastSection = sectionIdx === sections.length - 1;

  const commitTime = useCallback(() => {
    const id = sections[sectionIdxRef.current]?.questions[indexRef.current]?.id;
    if (id && enteredAt.current) {
      timeRef.current[id] = (timeRef.current[id] ?? 0) + (Date.now() - enteredAt.current) / 1000;
    }
    enteredAt.current = Date.now();
  }, [sections]);

  const finishExam = useCallback(() => {
    const all = sections.flatMap((s) => s.questions);
    const graded: GradedResult[] = all.map((qq) => {
      const selected = answersRef.current[qq.id];
      return {
        question: qq,
        selected,
        isCorrect: gradeAnswer(qq.correctAnswer, selected),
        answered: isAnswerComplete(qq.correctAnswer, selected),
      };
    });
    const items: GradedItem[] = graded.map((g) => ({
      section: g.question.section,
      difficulty: g.question.difficulty,
      isCorrect: g.isCorrect,
      topic: g.question.topic,
    }));
    const est = estimateDiagnostic(items);
    setResults(graded);
    setEstimate(est);
    setPhase('results');
    window.scrollTo(0, 0);

    if (user) {
      const attempts: MockAttempt[] = graded.map((g) => ({
        questionId: g.question.id,
        selectedAnswer: g.selected,
        isCorrect: g.isCorrect,
        timeSpentSeconds: Math.round(timeRef.current[g.question.id] ?? 0),
      }));
      saveMockSession(supabase, user.id, { config, estimate: est, attempts }).catch((e) =>
        console.error('Failed to save mock session:', e),
      );
    }
  }, [sections, user, supabase, config]);

  // End the current section: either move to a break before the next one, or
  // (on the last section) score the whole exam.
  const finishSection = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    commitTime();
    setShowReview(false);
    if (sectionIdxRef.current + 1 < sections.length) {
      setSectionIdx((i) => i + 1);
      setIndex(0);
      setPhase('break');
      window.scrollTo(0, 0);
    } else {
      finishExam();
    }
  }, [commitTime, sections.length, finishExam]);

  const beginSection = useCallback(() => {
    lockedRef.current = false;
    setIndex(0);
    setShowReview(false);
    enteredAt.current = Date.now();
    if (config.timed) {
      deadlineRef.current = Date.now() + sectionSeconds(sections[sectionIdxRef.current].section, true) * 1000;
    }
    setPhase('exam');
    window.scrollTo(0, 0);
  }, [config.timed, sections]);

  // Arm the first section on mount.
  useEffect(() => {
    enteredAt.current = Date.now();
    if (config.timed) {
      deadlineRef.current = Date.now() + sectionSeconds(sections[0].section, true) * 1000;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown (timed mode): auto-submit the section when it hits zero.
  useEffect(() => {
    if (phase !== 'exam' || !config.timed) return;
    const tick = () => {
      const rem = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) finishSection();
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phase, sectionIdx, config.timed, finishSection]);

  const go = useCallback(
    (to: number) => {
      commitTime();
      setIndex(to);
    },
    [commitTime],
  );

  const toggleFlag = useCallback((id: string) => {
    setFlags((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Keyboard: number keys pick a single-answer choice; arrows navigate.
  useEffect(() => {
    if (phase !== 'exam' || showReview) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === 'ArrowRight' && index < questions.length - 1) go(index + 1);
      else if (e.key === 'ArrowLeft' && index > 0) go(index - 1);
      else if (
        q.correctAnswer.format === 'single' &&
        tag !== 'SELECT' &&
        tag !== 'INPUT' &&
        tag !== 'BUTTON'
      ) {
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
  }, [phase, showReview, index, questions.length, q, go]);

  if (phase === 'results' && estimate && results) {
    return <MockResults estimate={estimate} results={results} />;
  }

  if (phase === 'break') {
    const answeredInExam = sections
      .slice(0, sectionIdx)
      .flatMap((s) => s.questions)
      .filter((qq) => isAnswerComplete(qq.correctAnswer, answers[qq.id])).length;
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-xl font-bold tracking-tight">Section complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Next up: <span className="font-medium text-foreground">{SECTION_LABELS[current.section]}</span> —{' '}
            {questions.length} questions{config.timed ? `, ${Math.round(sectionSeconds(current.section, true) / 60)} minutes` : ''}.
            Take a breath; the clock starts when you begin.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{answeredInExam} answered so far.</p>
          <button
            type="button"
            onClick={beginSection}
            className="mt-6 inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90"
          >
            Begin section <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  // ---- Exam phase ----
  const answeredCount = questions.filter((qq) =>
    isAnswerComplete(qq.correctAnswer, answers[qq.id]),
  ).length;
  const lowTime = config.timed && remaining > 0 && remaining <= 5 * 60;
  const isLastQuestion = index === questions.length - 1;

  if (showReview) {
    return (
      <ReviewGrid
        section={current.section}
        questions={questions}
        answers={answers}
        flags={flags}
        sectionIndex={sectionIdx}
        sectionTotal={sections.length}
        onJump={(i) => {
          setShowReview(false);
          go(i);
        }}
        onSubmit={finishSection}
        isLastSection={isLastSection}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
            {SECTION_SHORT[current.section]} · Section {sectionIdx + 1}/{sections.length}
          </span>
          <span className="font-medium">
            Question {index + 1} <span className="text-muted-foreground">of {questions.length}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleFlag(q.id)}
            aria-pressed={flags.has(q.id)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
              flags.has(q.id)
                ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            <Flag className="size-3.5" /> {flags.has(q.id) ? 'Flagged' : 'Flag'}
          </button>
          <button
            type="button"
            onClick={() => {
              commitTime();
              setShowReview(true);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            <LayoutGrid className="size-3.5" /> Review
          </button>
          <span
            className={cn(
              'inline-flex items-center gap-1 tabular-nums',
              lowTime ? 'font-semibold text-danger' : 'text-muted-foreground',
            )}
          >
            <Clock className="size-3.5" /> {config.timed ? formatTime(remaining) : '—'}
          </span>
        </div>
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
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="size-4" /> Back
        </button>
        <span className="text-xs text-muted-foreground">
          {answeredCount}/{questions.length} answered
        </span>
        {isLastQuestion ? (
          <button
            type="button"
            onClick={() => {
              commitTime();
              setShowReview(true);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Review &amp; submit <ChevronRight className="size-4" />
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

      <div className="mt-4 flex items-center justify-between">
        <Link href="/mock" className="text-xs text-muted-foreground hover:text-foreground">
          ← Exit exam
        </Link>
        <p className="text-center text-xs text-muted-foreground">
          No feedback until you finish — your score and full review come at the end.
        </p>
      </div>
    </div>
  );
}

function ReviewGrid({
  section,
  questions,
  answers,
  flags,
  sectionIndex,
  sectionTotal,
  onJump,
  onSubmit,
  isLastSection,
}: {
  section: QuestionWithGroup['section'];
  questions: QuestionWithGroup[];
  answers: Record<string, SelectedAnswer>;
  flags: Set<string>;
  sectionIndex: number;
  sectionTotal: number;
  onJump: (i: number) => void;
  onSubmit: () => void;
  isLastSection: boolean;
}) {
  const answered = questions.filter((q) => isAnswerComplete(q.correctAnswer, answers[q.id])).length;
  const unanswered = questions.length - answered;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-lg font-semibold">
        Review — {SECTION_LABELS[section]} (Section {sectionIndex + 1}/{sectionTotal})
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {answered} answered · {unanswered} unanswered · {flags.size} flagged. Tap a question to jump
        back, or submit this section.
      </p>

      <div className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-8">
        {questions.map((q, i) => {
          const done = isAnswerComplete(q.correctAnswer, answers[q.id]);
          const flagged = flags.has(q.id);
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJump(i)}
              className={cn(
                'relative aspect-square rounded-lg border text-sm font-medium tabular-nums transition-colors',
                done
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {i + 1}
              {flagged && (
                <Flag className="absolute right-0.5 top-0.5 size-3 text-amber-500" fill="currentColor" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-3 rounded border border-primary bg-accent" /> Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded border border-border" /> Unanswered
        </span>
        <span className="flex items-center gap-1">
          <Flag className="size-3 text-amber-500" fill="currentColor" /> Flagged
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onJump(0)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to questions
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {isLastSection ? 'Submit exam & see score' : 'Submit section'}
        </button>
        {unanswered > 0 && (
          <span className="text-xs text-danger">
            {unanswered} question{unanswered === 1 ? '' : 's'} still unanswered.
          </span>
        )}
      </div>
    </div>
  );
}

function MockResults({
  estimate,
  results,
}: {
  estimate: DiagnosticEstimate;
  results: GradedResult[];
}) {
  const [filter, setFilter] = useState<'all' | 'incorrect'>('all');
  const sections = [...new Set(results.map((r) => r.question.section))];
  const shown = results.filter((r) => (filter === 'incorrect' ? !r.isCorrect : true));
  const correct = results.filter((r) => r.isCorrect).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Predicted GMAT Focus score
        </div>
        <div className="mt-1 text-5xl font-bold tabular-nums">{estimate.total}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          likely range {estimate.low}–{estimate.high} · {correct}/{results.length} correct
        </div>
        {sections.length < 3 && (
          <p className="mx-auto mt-3 max-w-md rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
            You took {sections.length} of 3 sections. Section scores below are accurate; the total
            holds the sections you skipped at the midpoint, so run a full exam for a true 205–805.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {sections.map((s) => {
          const r = estimate.perSection[s];
          const pct = Math.max(0, Math.min(100, ((r.scaled - 60) / 30) * 100));
          return (
            <div key={s} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-medium">{SECTION_LABELS[s]}</h3>
                <span className="text-sm font-bold tabular-nums">{r.scaled}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {r.correct}/{r.total} correct · scaled 60–90
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Question review</h2>
        <div className="flex gap-1 text-sm">
          {(['all', 'incorrect'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1 transition-colors',
                filter === f ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50',
              )}
            >
              {f === 'all' ? 'All' : 'Incorrect only'}
            </button>
          ))}
        </div>
      </div>

      <ol className="space-y-3">
        {shown.map((r) => (
          <ReviewItem key={r.question.id} result={r} number={results.indexOf(r) + 1} />
        ))}
      </ol>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link
          href="/mock"
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <RotateCcw className="size-4" /> New exam
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

function ReviewItem({ result, number }: { result: GradedResult; number: number }) {
  const [open, setOpen] = useState(false);
  const { question: q, isCorrect, answered } = result;

  return (
    <li className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {isCorrect ? (
          <Check className="size-5 shrink-0 text-success" />
        ) : (
          <X className="size-5 shrink-0 text-danger" />
        )}
        <span className="text-sm text-muted-foreground">Q{number}</span>
        <span className="flex-1 truncate text-sm">
          {SECTION_SHORT[q.section]} · {QUESTION_TYPE_LABELS[q.type]}
        </span>
        {!answered && <span className="text-xs text-amber-600 dark:text-amber-400">skipped</span>}
        <span className="text-xs text-muted-foreground">{DIFFICULTY_LABELS[q.difficulty]}</span>
        <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="border-t border-border p-4">
          <QuestionPrompt question={q} />
          <div className="mt-4">
            <AnswerInputs question={q} selected={result.selected} onChange={() => {}} revealed />
          </div>
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="mb-1 font-semibold">Explanation</div>
            <Markdown>{q.explanation}</Markdown>
            {q.sourceNote && (
              <p className="mt-2 text-xs text-muted-foreground">Source: {q.sourceNote}</p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
