import type { SupabaseClient } from '@supabase/supabase-js';
import type { AttemptContext, Difficulty, QuestionType, Section, SelectedAnswer } from '@/lib/domain/types';
import {
  estimateDiagnostic,
  recencyWeight,
  type DiagnosticEstimate,
  type GradedItem,
} from '@/lib/domain/scoring';

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

export interface ReviewItem {
  questionId: string;
  section: Section;
  type: QuestionType;
  difficulty: Difficulty;
  topic: string;
  stem: string;
  isCorrect: boolean; // correctness of the most recent attempt
  attempts: number;
  lastSeen: string; // ISO timestamp of the latest attempt
}

interface AttemptReviewRow {
  question_id: string;
  is_correct: boolean;
  created_at: string;
  questions: (QuestionMeta & { stem: string }) | null;
}

/**
 * One entry per distinct question the user has attempted, carrying the most
 * recent attempt's correctness and a total attempt count. Newest first. Drives
 * the Review history (filterable, "redo missed").
 */
export async function getReviewItems(supabase: SupabaseClient, userId: string): Promise<ReviewItem[]> {
  const { data, error } = await supabase
    .from('attempts')
    .select('question_id, is_correct, created_at, questions(section, topic, difficulty, type, stem)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const byQuestion = new Map<string, ReviewItem>();
  for (const row of (data ?? []) as unknown as AttemptReviewRow[]) {
    const q = row.questions;
    if (!q) continue;
    const existing = byQuestion.get(row.question_id);
    if (existing) {
      existing.attempts += 1;
      continue; // rows are newest-first, so the first seen is the latest attempt
    }
    byQuestion.set(row.question_id, {
      questionId: row.question_id,
      section: q.section,
      type: q.type,
      difficulty: q.difficulty,
      topic: q.topic,
      stem: q.stem,
      isCorrect: row.is_correct,
      attempts: 1,
      lastSeen: row.created_at ?? '',
    });
  }
  return [...byQuestion.values()];
}

export interface UserStats {
  total: number;
  correct: number;
  bySection: Record<string, Tally>;
  byTopic: Record<string, Tally & { section: Section }>;
  byDifficulty: Record<string, Tally>;
  // IRT score estimate over the user's whole answer history (practice + diagnostic
  // + mock), or null when there isn't enough data yet to be meaningful.
  estimate: DiagnosticEstimate | null;
  estimateQuestionCount: number;
}

type QuestionMeta = { section: Section; topic: string; difficulty: Difficulty; type: QuestionType };

interface AttemptStatRow {
  question_id: string;
  is_correct: boolean;
  context: string;
  created_at: string;
  questions: QuestionMeta | null;
}

// Below this many distinct answered questions a headline score estimate is too
// noisy to show.
const MIN_ESTIMATE_ANSWERS = 3;

export async function getUserStats(supabase: SupabaseClient, userId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('attempts')
    .select('question_id, is_correct, context, created_at, questions(section, topic, difficulty, type)')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  const stats: UserStats = {
    total: 0,
    correct: 0,
    bySection: {},
    byTopic: {},
    byDifficulty: {},
    estimate: null,
    estimateQuestionCount: 0,
  };

  // Collect every answered question (any context) for the ability estimate; the
  // accuracy tallies stay practice-only so the existing "practice progress" cards
  // keep their meaning.
  const answered: { questionId: string; createdAt: string; isCorrect: boolean; q: QuestionMeta }[] = [];

  for (const row of (data ?? []) as unknown as AttemptStatRow[]) {
    const q = row.questions;
    if (!q) continue;

    answered.push({
      questionId: row.question_id,
      createdAt: row.created_at ?? '',
      isCorrect: row.is_correct,
      q,
    });

    if (row.context !== 'practice') continue;

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

  // Keep only the EARLIEST (cold) attempt per question: re-answering a question
  // you've already seen the explanation for would inflate the estimate, so each
  // item counts once. Then fade older answers so the estimate tracks recent form.
  answered.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  const earliestByQuestion = new Map<string, (typeof answered)[number]>();
  for (const a of answered) if (!earliestByQuestion.has(a.questionId)) earliestByQuestion.set(a.questionId, a);

  const distinct = [...earliestByQuestion.values()]; // ascending by time
  const n = distinct.length;
  const items: GradedItem[] = distinct.map((a, i) => ({
    section: a.q.section,
    difficulty: a.q.difficulty,
    type: a.q.type,
    topic: a.q.topic,
    isCorrect: a.isCorrect,
    weight: recencyWeight(n - 1 - i), // newest answer → weight 1, older ones fade
  }));

  stats.estimateQuestionCount = n;
  if (n >= MIN_ESTIMATE_ANSWERS) {
    stats.estimate = estimateDiagnostic(items);
  }

  return stats;
}
