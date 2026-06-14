import type { SupabaseClient } from '@supabase/supabase-js';
import type { AttemptContext, Difficulty, Section, SelectedAnswer } from '@/lib/domain/types';

export interface RecordAttemptInput {
  userId: string;
  questionId: string;
  selectedAnswer: SelectedAnswer;
  isCorrect: boolean;
  timeSpentSeconds: number;
  context?: AttemptContext;
  mockSessionId?: string | null;
}

export async function recordAttempt(supabase: SupabaseClient, input: RecordAttemptInput) {
  const { error } = await supabase.from('attempts').insert({
    user_id: input.userId,
    question_id: input.questionId,
    selected_answer: input.selectedAnswer,
    is_correct: input.isCorrect,
    time_spent_seconds: input.timeSpentSeconds,
    context: input.context ?? 'practice',
    mock_session_id: input.mockSessionId ?? null,
  });
  if (error) throw new Error(error.message);
}

interface Tally {
  total: number;
  correct: number;
}

export interface UserStats {
  total: number;
  correct: number;
  bySection: Record<string, Tally>;
  byTopic: Record<string, Tally & { section: Section }>;
  byDifficulty: Record<string, Tally>;
}

interface AttemptStatRow {
  is_correct: boolean;
  questions: { section: Section; topic: string; difficulty: Difficulty } | null;
}

export async function getUserStats(supabase: SupabaseClient, userId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('attempts')
    .select('is_correct, questions(section, topic, difficulty)')
    .eq('user_id', userId)
    .eq('context', 'practice');
  if (error) throw new Error(error.message);

  const stats: UserStats = {
    total: 0,
    correct: 0,
    bySection: {},
    byTopic: {},
    byDifficulty: {},
  };

  for (const row of (data ?? []) as unknown as AttemptStatRow[]) {
    const q = row.questions;
    if (!q) continue;
    stats.total += 1;
    if (row.is_correct) stats.correct += 1;

    (stats.bySection[q.section] ??= { total: 0, correct: 0 }).total += 1;
    if (row.is_correct) stats.bySection[q.section].correct += 1;

    const topicKey = `${q.section}::${q.topic}`;
    (stats.byTopic[topicKey] ??= { total: 0, correct: 0, section: q.section }).total += 1;
    if (row.is_correct) stats.byTopic[topicKey].correct += 1;

    (stats.byDifficulty[q.difficulty] ??= { total: 0, correct: 0 }).total += 1;
    if (row.is_correct) stats.byDifficulty[q.difficulty].correct += 1;
  }

  return stats;
}
