'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getLessonProgressForUser } from '@/lib/data/learn-progress';
import type { LearnChapter, LearnLesson, LessonProgress } from '@/lib/domain/types';

interface Props {
  chapters: LearnChapter[];
  lessonsByChapter: Record<string, LearnLesson[]>;
}

export function ChapterProgressBars({ chapters, lessonsByChapter }: Props) {
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState<LessonProgress[]>([]);

  useEffect(() => {
    if (loading || !user) return;
    getLessonProgressForUser(user.id)
      .then(setProgress)
      .catch(() => {});
  }, [user, loading]);

  const progressByLesson = new Map(progress.map((p) => [p.lessonId, p]));

  return (
    <>
      {chapters.map((ch) => {
        const lessons = lessonsByChapter[ch.id] ?? [];
        const totalExercises = lessons.reduce((s, l) => s + l.exerciseIds.length, 0);
        const passedExercises = lessons.reduce((s, l) => {
          const p = progressByLesson.get(l.id);
          return s + (p?.passedExerciseIds.length ?? 0);
        }, 0);
        const pct = totalExercises > 0 ? Math.round((passedExercises / totalExercises) * 100) : 0;

        return (
          <div key={ch.id} className="mt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {passedExercises}/{totalExercises} exercises
              </span>
              <span>{pct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}

interface LessonDotProps {
  lessons: LearnLesson[];
}

export function LessonCompletionDots({ lessons }: LessonDotProps) {
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState<LessonProgress[]>([]);

  useEffect(() => {
    if (loading || !user) return;
    getLessonProgressForUser(user.id)
      .then(setProgress)
      .catch(() => {});
  }, [user, loading]);

  const progressByLesson = new Map(progress.map((p) => [p.lessonId, p]));

  return (
    <div className="flex gap-1.5">
      {lessons.map((l) => {
        const p = progressByLesson.get(l.id);
        const done = p && p.passedExerciseIds.length >= l.exerciseIds.length && l.exerciseIds.length > 0;
        return (
          <div
            key={l.id}
            title={l.title}
            className={`size-2 rounded-full ${done ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          />
        );
      })}
    </div>
  );
}
