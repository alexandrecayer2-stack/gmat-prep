import type { SupabaseClient } from '@supabase/supabase-js';
import type { DiagnosticEstimate } from '@/lib/domain/scoring';
import type { MockConfig } from '@/lib/domain/mock';
import type { SelectedAnswer } from '@/lib/domain/types';

export interface MockAttempt {
  questionId: string;
  selectedAnswer: SelectedAnswer;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

/** Persist a completed mock exam: a mock_sessions row (with config + scaled
 *  scores) plus one attempt per question (context=mock). Returns the session id.
 *  Mirrors saveDiagnostic but tags attempts as 'mock' so they stay out of the
 *  practice-only dashboard stats. */
export async function saveMockSession(
  supabase: SupabaseClient,
  userId: string,
  args: { config: MockConfig; estimate: DiagnosticEstimate; attempts: MockAttempt[] },
): Promise<string> {
  const { data: session, error: sessionError } = await supabase
    .from('mock_sessions')
    .insert({
      user_id: userId,
      config: { type: 'mock', ...args.config, questionCount: args.attempts.length },
      completed_at: new Date().toISOString(),
      scores: args.estimate,
    })
    .select('id')
    .single();
  if (sessionError) throw new Error(sessionError.message);

  const sessionId = (session as { id: string }).id;

  const rows = args.attempts.map((a) => ({
    user_id: userId,
    question_id: a.questionId,
    mock_session_id: sessionId,
    selected_answer: a.selectedAnswer,
    is_correct: a.isCorrect,
    time_spent_seconds: a.timeSpentSeconds,
    context: 'mock' as const,
  }));

  const { error: attemptsError } = await supabase.from('attempts').insert(rows);
  if (attemptsError) throw new Error(attemptsError.message);

  return sessionId;
}
