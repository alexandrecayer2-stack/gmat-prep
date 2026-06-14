import type { SupabaseClient } from '@supabase/supabase-js';
import type { DiagnosticEstimate } from '@/lib/domain/scoring';
import type { SelectedAnswer } from '@/lib/domain/types';

export interface DiagnosticAttempt {
  questionId: string;
  selectedAnswer: SelectedAnswer;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

/** Persist a completed diagnostic: a mock_sessions row (type=diagnostic) plus
 *  one attempt per question (context=diagnostic). Returns the session id. */
export async function saveDiagnostic(
  supabase: SupabaseClient,
  userId: string,
  attempts: DiagnosticAttempt[],
  estimate: DiagnosticEstimate,
): Promise<string> {
  const { data: session, error: sessionError } = await supabase
    .from('mock_sessions')
    .insert({
      user_id: userId,
      config: { type: 'diagnostic', questionCount: attempts.length },
      completed_at: new Date().toISOString(),
      scores: estimate,
    })
    .select('id')
    .single();
  if (sessionError) throw new Error(sessionError.message);

  const sessionId = (session as { id: string }).id;

  const rows = attempts.map((a) => ({
    user_id: userId,
    question_id: a.questionId,
    mock_session_id: sessionId,
    selected_answer: a.selectedAnswer,
    is_correct: a.isCorrect,
    time_spent_seconds: a.timeSpentSeconds,
    context: 'diagnostic' as const,
  }));

  const { error: attemptsError } = await supabase.from('attempts').insert(rows);
  if (attemptsError) throw new Error(attemptsError.message);

  return sessionId;
}
