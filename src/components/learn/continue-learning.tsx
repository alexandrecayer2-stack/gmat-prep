'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { getLastLesson, recordLastLesson, subscribeLastLesson } from '@/lib/last-lesson';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';

/** Records the currently-open lesson as the "last lesson" (client-side). Renders
 *  nothing; drop it on the lesson page. */
export function TrackLastLesson({
  chapterId,
  lessonId,
  title,
}: {
  chapterId: string;
  lessonId: string;
  title: string;
}) {
  useEffect(() => {
    recordLastLesson({ chapterId, lessonId, title });
  }, [chapterId, lessonId, title]);
  return null;
}

/** A "Continue where you left off" card. Hidden until a lesson has been opened. */
export function ContinueLearningCard() {
  const last = useSyncExternalStore(subscribeLastLesson, getLastLesson, () => null);
  if (!last) return null;

  return (
    <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-accent/30 p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpen className="size-4" />
        </span>
        <div className="min-w-0">
          <SectionLabel as="div">Continue where you left off</SectionLabel>
          <div className="truncate font-medium">{last.title}</div>
        </div>
      </div>
      <Link
        href={`/learn/${last.chapterId}/${last.lessonId}`}
        className="btn-brand inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        Resume <ArrowRight className="size-4" />
      </Link>
    </Card>
  );
}
