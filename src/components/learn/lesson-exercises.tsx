'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import type { LessonProgress, QuestionWithGroup } from '@/lib/domain/types';
import { emptySelection, gradeAnswer, isAnswerComplete } from '@/lib/domain/grade';
import { useAuth } from '@/lib/auth/auth-provider';
import { getLessonProgressForUser, markExercisePassed } from '@/lib/data/learn-progress';
import { recordAttempt } from '@/lib/data/attempts';
import { Markdown } from '@/components/markdown';
import { QuestionPrompt } from '@/components/practice/question-prompt';
import { AnswerInputs } from '@/components/practice/answer-inputs';

interface Props {
  lessonId: string;
  exercises: QuestionWithGroup[];
}

export function LessonExercises({ lessonId, exercises }: Props) {
  const { user, supabase, loading } = useAuth();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [selected, setSelected] = useState(() =>
    exercises.length > 0 ? emptySelection(exercises[0].correctAnswer) : { format: 'single' as const, value: null },
  );
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (loading || !user) return;
    getLessonProgressForUser(user.id)
      .then((all) => {
        const p = all.find((x) => x.lessonId === lessonId) ?? { lessonId, passedExerciseIds: [] };
        setProgress(p);
      })
      .catch(() => {});
  }, [user, loading, lessonId]);

  const q = exercises[index];

  useEffect(() => {
    if (!q) return;
    setSelected(emptySelection(q.correctAnswer));
    setSubmitted(false);
    setIsCorrect(false);
    startRef.current = Date.now();
  }, [index, q]);

  const handleSubmit = useCallback(async () => {
    if (!q || submitted || !isAnswerComplete(q.correctAnswer, selected)) return;
    const correct = gradeAnswer(q.correctAnswer, selected);
    const timeSpent = Math.floor((Date.now() - startRef.current) / 1000);
    setIsCorrect(correct);
    setSubmitted(true);

    if (user) {
      try {
        await recordAttempt(supabase, {
          userId: user.id,
          questionId: q.id,
          selectedAnswer: selected,
          isCorrect: correct,
          timeSpentSeconds: timeSpent,
          context: 'practice',
        });
        if (correct) {
          await markExercisePassed(lessonId, q.id);
          setProgress((prev) => {
            if (!prev) return { lessonId, passedExerciseIds: [q.id] };
            if (prev.passedExerciseIds.includes(q.id)) return prev;
            return { ...prev, passedExerciseIds: [...prev.passedExerciseIds, q.id] };
          });
        }
      } catch {
        // best-effort
      }
    }
  }, [q, submitted, selected, user, supabase, lessonId]);

  if (exercises.length === 0) return null;

  const passed = progress?.passedExerciseIds ?? [];
  const allDone = exercises.every((e) => passed.includes(e.id));

  return (
    <div className="mt-8 border-t border-border pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Practice exercises
        </h2>
        <span className="text-xs text-muted-foreground">
          {passed.length}/{exercises.length} passed
        </span>
      </div>

      {/* Exercise selector dots */}
      <div className="mb-6 flex gap-2">
        {exercises.map((e, i) => {
          const isPassed = passed.includes(e.id);
          const isCurrent = i === index;
          return (
            <button
              key={e.id}
              onClick={() => { setIndex(i); setSubmitted(false); }}
              className={`flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isCurrent
                  ? 'bg-primary text-primary-foreground'
                  : isPassed
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {isPassed ? <Check className="size-3.5" /> : i + 1}
            </button>
          );
        })}
      </div>

      {allDone && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          All exercises completed! Move on to the next lesson.
        </div>
      )}

      {q && (
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <QuestionPrompt question={q} />
          </div>
          <div className="px-4 py-4">
            <AnswerInputs
              question={q}
              selected={selected}
              onChange={setSelected}
              revealed={submitted}
            />
          </div>

          {!submitted ? (
            <div className="border-t border-border px-4 py-3">
              <button
                onClick={handleSubmit}
                disabled={!isAnswerComplete(q.correctAnswer, selected)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:opacity-90"
              >
                Submit
              </button>
            </div>
          ) : (
            <div
              className={`border-t px-4 py-4 ${
                isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <Check className="size-4 text-green-600" />
                ) : (
                  <X className="size-4 text-red-600" />
                )}
                <span
                  className={`text-sm font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}
                >
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                <Markdown>{q.explanation}</Markdown>
              </div>
              {index < exercises.length - 1 && (
                <button
                  onClick={() => setIndex((i) => i + 1)}
                  className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Next exercise <ChevronRight className="size-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
