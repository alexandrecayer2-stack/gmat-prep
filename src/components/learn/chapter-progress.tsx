'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getLessonProgressForUser } from '@/lib/data/learn-progress';
import type { LearnChapter, LearnLesson, LessonProgress } from '@/lib/domain/types';
import { SECTION_COLORS } from '@/lib/domain/constants';

interface BarProps {
  chapter: LearnChapter;
  lessons: LearnLesson[];
  className?: string;
}

export function ChapterProgressBar({ chapter, lessons, className = '' }: BarProps) {
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState<LessonProgress[]>([]);

  useEffect(() => {
    if (loading || !user) return;
    getLessonProgressForUser(user.id)
      .then(setProgress)
      .catch(() => {});
  }, [user, loading]);

  const colors = SECTION_COLORS[chapter.section];
  const totalExercises = lessons.reduce((s, l) => s + l.exerciseIds.length, 0);
  const progressByLesson = new Map(progress.map((p) => [p.lessonId, p]));
  const passedExercises = lessons.reduce((s, l) => {
    const p = progressByLesson.get(l.id);
    return s + (p?.passedExerciseIds.length ?? 0);
  }, 0);
  const pct = totalExercises > 0 ? Math.round((passedExercises / totalExercises) * 100) : 0;

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {passedExercises}/{totalExercises} exercises
        </span>
        <span className={pct > 0 ? colors.text : ''}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.progressBar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface DotsProps {
  lessons: LearnLesson[];
  section: LearnChapter['section'];
}

export function LessonCompletionDots({ lessons, section }: DotsProps) {
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const colors = SECTION_COLORS[section];

  useEffect(() => {
    if (loading || !user) return;
    getLessonProgressForUser(user.id)
      .then(setProgress)
      .catch(() => {});
  }, [user, loading]);

  const progressByLesson = new Map(progress.map((p) => [p.lessonId, p]));

  return (
    <div className="flex gap-1">
      {lessons.map((l) => {
        const p = progressByLesson.get(l.id);
        const done =
          p &&
          p.passedExerciseIds.length >= l.exerciseIds.length &&
          l.exerciseIds.length > 0;
        return (
          <div
            key={l.id}
            title={l.title}
            className={`size-1.5 rounded-full ${done ? colors.progressBar : 'bg-muted-foreground/25'}`}
          />
        );
      })}
    </div>
  );
}
