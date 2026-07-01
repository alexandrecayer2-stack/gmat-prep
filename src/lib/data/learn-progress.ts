'use server';

import { createClient } from '@/lib/supabase/server';
import type { LessonProgress } from '@/lib/domain/types';
import { LESSON_READ_SENTINEL, mapLessonProgress, type LessonProgressRow } from './mappers';

export async function getLessonProgressForUser(userId: string): Promise<LessonProgress[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_lesson_progress')
    .select('*')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as LessonProgressRow[]).map(mapLessonProgress);
}

export async function markExercisePassed(lessonId: string, exerciseId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from('user_lesson_progress')
    .select('passed_exercise_ids')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .single();

  const current: string[] = (existing as { passed_exercise_ids: string[] } | null)?.passed_exercise_ids ?? [];
  if (current.includes(exerciseId)) return;

  const updated = [...current, exerciseId];

  await supabase.from('user_lesson_progress').upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      passed_exercise_ids: updated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' },
  );
}

/** Mark a lesson's body as read (or unread), stored as a reserved sentinel in
 *  passed_exercise_ids — see mappers.ts. Returns the new read state. */
export async function setLessonRead(lessonId: string, read: boolean): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return read;

  const { data: existing } = await supabase
    .from('user_lesson_progress')
    .select('passed_exercise_ids')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .single();

  const current: string[] = (existing as { passed_exercise_ids: string[] } | null)?.passed_exercise_ids ?? [];
  const has = current.includes(LESSON_READ_SENTINEL);
  if (has === read) return read; // no change

  const updated = read
    ? [...current, LESSON_READ_SENTINEL]
    : current.filter((id) => id !== LESSON_READ_SENTINEL);

  await supabase.from('user_lesson_progress').upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      passed_exercise_ids: updated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' },
  );
  return read;
}
