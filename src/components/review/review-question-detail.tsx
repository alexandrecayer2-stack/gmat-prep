'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getReviewQuestion } from '@/lib/data/attempts';
import type { QuestionWithGroup, SelectedAnswer } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/markdown';
import { QuestionPrompt } from '@/components/practice/question-prompt';
import { AnswerInputs } from '@/components/practice/answer-inputs';

/**
 * Read-only inline review of a single answered question: the full stem/passage,
 * the user's chosen answer highlighted against the correct one (with per-choice
 * "why this is wrong" notes), and the explanation. Lazily loaded on expand.
 */
export function ReviewQuestionDetail({
  questionId,
  selectedAnswer,
  isCorrect,
}: {
  questionId: string;
  selectedAnswer: SelectedAnswer;
  isCorrect: boolean;
}) {
  const { supabase } = useAuth();
  const [question, setQuestion] = useState<QuestionWithGroup | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    getReviewQuestion(supabase, questionId)
      .then((q) => {
        if (!active) return;
        setQuestion(q);
        setState(q ? 'ready' : 'error');
      })
      .catch(() => active && setState('error'));
    return () => {
      active = false;
    };
  }, [supabase, questionId]);

  if (state === 'loading') {
    return <div className="h-24 animate-pulse rounded-lg bg-muted/40" />;
  }
  if (state === 'error' || !question) {
    return <p className="text-sm text-muted-foreground">Couldn&apos;t load this question.</p>;
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold',
          isCorrect ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
        )}
      >
        {isCorrect ? <Check className="size-3.5" /> : <X className="size-3.5" />}
        {isCorrect ? 'You answered correctly' : 'You missed this'}
      </div>

      <QuestionPrompt question={question} />

      {/* Read-only: revealed shows your pick vs. correct, and why-wrong notes. */}
      <AnswerInputs question={question} selected={selectedAnswer} onChange={() => {}} revealed />

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Explanation
        </div>
        <div className="text-sm">
          <Markdown>{question.explanation}</Markdown>
        </div>
        {question.sourceNote && (
          <p className="mt-2 text-xs text-muted-foreground">Source: {question.sourceNote}</p>
        )}
      </div>
    </div>
  );
}
