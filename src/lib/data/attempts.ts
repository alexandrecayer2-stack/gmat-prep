import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AttemptContext,
  Difficulty,
  QuestionGroup,
  QuestionType,
  QuestionWithGroup,
  Section,
  SelectedAnswer,
} from '@/lib/domain/types';
import {
  estimateDiagnostic,
  recencyWeight,
  type DiagnosticEstimate,
  type GradedItem,
} from '@/lib/domain/scoring';
import { dueAtMs, leitnerBox } from '@/lib/domain/spaced-repetition';
import { mapGroup, mapQuestion, type GroupRow, type QuestionRow } from './mappers';

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

/** Recent attempt timestamps (newest first, capped) for computing a study
 *  streak client-side in the user's local timezone. */
export async function getAttemptTimestamps(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('attempts')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { created_at: string | null }[])
    .map((r) => r.created_at)
    .filter((x): x is string => !!x);
}

export interface ReviewItem {
  questionId: string;
  section: Section;
  type: QuestionType;
  difficulty: Difficulty;
  topic: string;
  stem: string;
  isCorrect: boolean; // correctness of the most recent attempt
  selectedAnswer: SelectedAnswer; // the answer chosen on the most recent attempt
  attempts: number;
  wrongCount: number; // how many attempts were incorrect (for "most missed" sort)
  context: string; // context of the most recent attempt (practice / mock / diagnostic)
  lastSeen: string; // ISO timestamp of the latest attempt
}

interface AttemptReviewRow {
  question_id: string;
  is_correct: boolean;
  selected_answer: SelectedAnswer;
  context: string;
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
    .select('question_id, is_correct, selected_answer, context, created_at, questions(section, topic, difficulty, type, stem)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const byQuestion = new Map<string, ReviewItem>();
  for (const row of (data ?? []) as unknown as AttemptReviewRow[]) {
    const q = row.questions;
    if (!q) continue;
    const existing = byQuestion.get(row.question_id);
    if (existing) {
      // Rows are newest-first, so the first seen is the latest attempt; later
      // rows only add to the aggregate counters.
      existing.attempts += 1;
      if (!row.is_correct) existing.wrongCount += 1;
      continue;
    }
    byQuestion.set(row.question_id, {
      questionId: row.question_id,
      section: q.section,
      type: q.type,
      difficulty: q.difficulty,
      topic: q.topic,
      stem: q.stem,
      isCorrect: row.is_correct,
      selectedAnswer: row.selected_answer,
      attempts: 1,
      wrongCount: row.is_correct ? 0 : 1,
      context: row.context ?? 'practice',
      lastSeen: row.created_at ?? '',
    });
  }
  return [...byQuestion.values()];
}

/**
 * Fetch one question (with its group/passage, if any) for inline review, using
 * the client Supabase. Kept here — not in content.ts — so it can be called from
 * the client Review component. Returns null if the question is gone.
 */
export async function getReviewQuestion(
  supabase: SupabaseClient,
  questionId: string,
): Promise<QuestionWithGroup | null> {
  const { data, error } = await supabase.from('questions').select('*').eq('id', questionId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const question = mapQuestion(data as unknown as QuestionRow);
  let group: QuestionGroup | null = null;
  if (question.groupId) {
    const { data: g } = await supabase
      .from('question_groups')
      .select('*')
      .eq('id', question.groupId)
      .maybeSingle();
    if (g) group = mapGroup(g as unknown as GroupRow);
  }
  return { ...question, group };
}

export interface ReviewQueueItem {
  questionId: string;
  section: Section;
  type: QuestionType;
  difficulty: Difficulty;
  topic: string;
  stem: string;
  box: number; // Leitner box = trailing consecutive-correct streak (0 = last missed)
  lastSeen: string; // ISO of the most recent attempt
  dueAt: string; // ISO when it next becomes due for review
}

/**
 * A spaced-repetition queue derived purely from attempt history: for each
 * question, the trailing consecutive-correct streak sets its Leitner box, and
 * `dueAt = lastSeen + interval(box)` (see spaced-repetition.ts). The caller
 * decides what's "due now" by comparing `dueAt` to the current time.
 */
export async function getReviewQueue(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReviewQueueItem[]> {
  const { data, error } = await supabase
    .from('attempts')
    .select('question_id, is_correct, created_at, questions(section, topic, difficulty, type, stem)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  const attemptsByQ = new Map<string, { correct: boolean; at: string }[]>();
  const metaByQ = new Map<string, QuestionMeta & { stem: string }>();
  for (const row of (data ?? []) as unknown as AttemptReviewRow[]) {
    if (!row.questions) continue;
    let list = attemptsByQ.get(row.question_id);
    if (!list) attemptsByQ.set(row.question_id, (list = []));
    list.push({ correct: row.is_correct, at: row.created_at ?? '' });
    metaByQ.set(row.question_id, row.questions);
  }

  const out: ReviewQueueItem[] = [];
  for (const [questionId, attempts] of attemptsByQ) {
    const m = metaByQ.get(questionId)!;
    const box = leitnerBox(attempts.map((a) => a.correct));
    const lastSeen = attempts[attempts.length - 1].at;
    const dueAt = new Date(dueAtMs(new Date(lastSeen).getTime(), box)).toISOString();
    out.push({ questionId, section: m.section, type: m.type, difficulty: m.difficulty, topic: m.topic, stem: m.stem, box, lastSeen, dueAt });
  }
  return out;
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
  // Total time spent across every recorded attempt, in seconds.
  timeSpentSeconds: number;
}

type QuestionMeta = { section: Section; topic: string; difficulty: Difficulty; type: QuestionType };

interface AnsweredRow {
  questionId: string;
  createdAt: string;
  isCorrect: boolean;
  q: QuestionMeta;
}

// Turn a set of answered questions into an IRT estimate the same way everywhere:
// keep the EARLIEST (cold) attempt per question so re-answers can't inflate the
// score, fade older answers by recency, then run the diagnostic estimator.
// Returns the estimate (null below the meaningful minimum) and the distinct count.
function estimateFromAnswered(answered: AnsweredRow[]): {
  estimate: DiagnosticEstimate | null;
  count: number;
} {
  const sorted = [...answered].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
  const earliestByQuestion = new Map<string, AnsweredRow>();
  for (const a of sorted) if (!earliestByQuestion.has(a.questionId)) earliestByQuestion.set(a.questionId, a);

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
  return { estimate: n >= MIN_ESTIMATE_ANSWERS ? estimateDiagnostic(items) : null, count: n };
}

export interface ScoreTrendPoint {
  n: number; // distinct questions answered up to this point
  total: number; // estimated GMAT Focus total at that point
  date: string; // ISO timestamp of the attempt that produced this point
}

/**
 * The predicted total as it evolved over the user's history — one point per
 * distinct question answered (down-sampled to at most `maxPoints`). Powers the
 * dashboard "score over time" trend. Empty until the estimate is meaningful.
 */
export async function getScoreTrend(
  supabase: SupabaseClient,
  userId: string,
  maxPoints = 24,
): Promise<ScoreTrendPoint[]> {
  const { data, error } = await supabase
    .from('attempts')
    .select('question_id, is_correct, created_at, questions(section, topic, difficulty, type)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  const answered: AnsweredRow[] = [];
  const seen = new Set<string>();
  for (const row of (data ?? []) as unknown as AttemptStatRow[]) {
    if (!row.questions) continue;
    // First (earliest) attempt per question defines its position on the timeline.
    if (seen.has(row.question_id)) continue;
    seen.add(row.question_id);
    answered.push({
      questionId: row.question_id,
      createdAt: row.created_at ?? '',
      isCorrect: row.is_correct,
      q: row.questions,
    });
  }

  const n = answered.length;
  if (n < MIN_ESTIMATE_ANSWERS) return [];

  // Cut points: every distinct question when small, else evenly spaced.
  const cuts: number[] = [];
  if (n <= maxPoints) {
    for (let k = MIN_ESTIMATE_ANSWERS; k <= n; k++) cuts.push(k);
  } else {
    for (let i = 0; i < maxPoints; i++) {
      cuts.push(Math.round(MIN_ESTIMATE_ANSWERS + ((n - MIN_ESTIMATE_ANSWERS) * i) / (maxPoints - 1)));
    }
  }

  const points: ScoreTrendPoint[] = [];
  let lastN = -1;
  for (const k of cuts) {
    if (k === lastN) continue;
    lastN = k;
    const { estimate } = estimateFromAnswered(answered.slice(0, k));
    if (estimate) points.push({ n: k, total: estimate.total, date: answered[k - 1].createdAt });
  }
  return points;
}

interface AttemptStatRow {
  question_id: string;
  is_correct: boolean;
  context: string;
  created_at: string;
  time_spent_seconds?: number;
  questions: QuestionMeta | null;
}

// Below this many distinct answered questions a headline score estimate is too
// noisy to show.
const MIN_ESTIMATE_ANSWERS = 3;

export async function getUserStats(supabase: SupabaseClient, userId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('attempts')
    .select('question_id, is_correct, context, created_at, time_spent_seconds, questions(section, topic, difficulty, type)')
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
    timeSpentSeconds: 0,
  };

  // Collect every answered question (any context) for the ability estimate; the
  // accuracy tallies stay practice-only so the existing "practice progress" cards
  // keep their meaning.
  const answered: AnsweredRow[] = [];

  for (const row of (data ?? []) as unknown as AttemptStatRow[]) {
    const q = row.questions;
    if (!q) continue;

    stats.timeSpentSeconds += row.time_spent_seconds ?? 0;
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

  const { estimate, count } = estimateFromAnswered(answered);
  stats.estimate = estimate;
  stats.estimateQuestionCount = count;

  return stats;
}
