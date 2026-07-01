import type { SupabaseClient } from '@supabase/supabase-js';
import type { DiagnosticEstimate } from '@/lib/domain/scoring';
import type { MockConfig } from '@/lib/domain/mock';
import type { Difficulty, QuestionType, Section, SelectedAnswer } from '@/lib/domain/types';
import { enqueueMockSession, readMockQueue, writeMockQueue } from '@/lib/offline/mock-queue';

export interface MockAttempt {
  questionId: string;
  selectedAnswer: SelectedAnswer;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

export interface MockSessionArgs {
  config: MockConfig;
  estimate: DiagnosticEstimate;
  attempts: MockAttempt[];
}

/** Persist a completed mock exam: a mock_sessions row (with config + scaled
 *  scores) plus one attempt per question (context=mock). Returns the session id.
 *  Mirrors saveDiagnostic but tags attempts as 'mock' so they stay out of the
 *  practice-only dashboard stats. Throws on error. */
async function insertMockSession(
  supabase: SupabaseClient,
  userId: string,
  args: MockSessionArgs,
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

/** Offline-aware save. Online it behaves exactly like the raw insert (throws on
 *  real errors, so the runner can surface a "couldn't save" notice). If the exam
 *  was completed offline, it's queued locally and synced on reconnect; the
 *  returned id is null in that case. */
export async function saveMockSession(
  supabase: SupabaseClient,
  userId: string,
  args: MockSessionArgs,
): Promise<string | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueueMockSession({ userId, ...args });
    return null;
  }
  return insertMockSession(supabase, userId, args);
}

// ---------------------------------------------------------------------------
// Reviewing past exams (mocks + diagnostics share the mock_sessions table).
// ---------------------------------------------------------------------------

export interface ExamSession {
  id: string;
  type: 'mock' | 'diagnostic';
  completedAt: string;
  total: number;
  low: number;
  high: number;
  perSection: DiagnosticEstimate['perSection'] | Record<string, never>;
  questionCount: number;
}

/** Completed exams for a user (mock exams and diagnostics), newest first. */
export async function getExamSessions(supabase: SupabaseClient, userId: string): Promise<ExamSession[]> {
  const { data, error } = await supabase
    .from('mock_sessions')
    .select('id, config, scores, completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as {
      id: string;
      config: { type?: string; questionCount?: number } | null;
      scores: DiagnosticEstimate | null;
      completed_at: string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    type: r.config?.type === 'diagnostic' ? 'diagnostic' : 'mock',
    completedAt: r.completed_at ?? '',
    total: r.scores?.total ?? 0,
    low: r.scores?.low ?? 0,
    high: r.scores?.high ?? 0,
    perSection: r.scores?.perSection ?? {},
    questionCount: r.config?.questionCount ?? 0,
  }));
}

export interface ExamAttemptItem {
  questionId: string;
  section: Section;
  type: QuestionType;
  difficulty: Difficulty;
  stem: string;
  selectedAnswer: SelectedAnswer;
  isCorrect: boolean;
}

/** The per-question attempts for one exam session, in the order taken. */
export async function getExamAttempts(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<ExamAttemptItem[]> {
  const { data, error } = await supabase
    .from('attempts')
    .select('question_id, is_correct, selected_answer, created_at, questions(section, type, difficulty, stem)')
    .eq('mock_session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as unknown as {
      question_id: string;
      is_correct: boolean;
      selected_answer: SelectedAnswer;
      questions: { section: Section; type: QuestionType; difficulty: Difficulty; stem: string } | null;
    }[]
  )
    .filter((r) => r.questions)
    .map((r) => ({
      questionId: r.question_id,
      section: r.questions!.section,
      type: r.questions!.type,
      difficulty: r.questions!.difficulty,
      stem: r.questions!.stem,
      selectedAnswer: r.selected_answer,
      isCorrect: r.is_correct,
    }));
}

let flushingMocks = false;

/** Replay queued offline mock exams to Supabase, oldest first. Stops at the
 *  first failure and keeps the rest for the next attempt. Returns how many
 *  synced. Safe to call repeatedly. */
export async function flushMockSessions(supabase: SupabaseClient): Promise<number> {
  if (flushingMocks) return 0;
  flushingMocks = true;
  try {
    let items = readMockQueue();
    let synced = 0;
    while (items.length > 0) {
      try {
        await insertMockSession(supabase, items[0].userId, items[0]);
      } catch {
        break;
      }
      items = items.slice(1);
      writeMockQueue(items);
      synced += 1;
    }
    return synced;
  } finally {
    flushingMocks = false;
  }
}
