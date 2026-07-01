'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getLessonProgressForUser } from '@/lib/data/learn-progress';
import { SECTION_COLORS } from '@/lib/domain/constants';
import type { LearnLesson, Section } from '@/lib/domain/types';

const readingMinutes = (body: string) =>
  Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));

export function ChapterLessonList({
  chapterId,
  lessons,
  section,
}: {
  chapterId: string;
  lessons: LearnLesson[];
  section: Section;
}) {
  const { user, loading } = useAuth();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const colors = SECTION_COLORS[section];

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    getLessonProgressForUser(user.id)
      .then((list) => {
        if (active) setReadIds(new Set(list.filter((p) => p.read).map((p) => p.lessonId)));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, loading]);

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-border divide-y divide-border">
      {lessons.length === 0 && (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          No lessons in this chapter yet.
        </p>
      )}
      {lessons.map((lesson, i) => {
        const isRead = readIds.has(lesson.id);
        return (
          <Link
            key={lesson.id}
            href={`/learn/${chapterId}/${lesson.id}`}
            className="group flex items-center gap-5 bg-card px-6 py-5 transition-colors hover:bg-accent/20"
          >
            {isRead ? (
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
                aria-label="Read"
              >
                <Check className="size-4" />
              </span>
            ) : (
              <span
                className={`w-7 shrink-0 text-center text-2xl font-black leading-none tabular-nums transition-opacity ${colors.text} opacity-30 group-hover:opacity-60`}
              >
                {i + 1}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{lesson.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> {readingMinutes(lesson.body)} min
                </span>
                {lesson.exerciseIds.length > 0 && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span>
                      {lesson.exerciseIds.length} exercise{lesson.exerciseIds.length !== 1 ? 's' : ''}
                    </span>
                  </>
                )}
                {isRead && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-success">Read</span>
                  </>
                )}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
          </Link>
        );
      })}
    </div>
  );
}
