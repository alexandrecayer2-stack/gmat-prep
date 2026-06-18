import type { CSSProperties } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import {
  getLearnChapters,
  getLessonsByChapter,
  getLesson,
  getLessonExercises,
} from '@/lib/data/content';
import { SECTION_LABELS, SECTION_COLORS } from '@/lib/domain/constants';
import type { Section } from '@/lib/domain/types';
import { Markdown } from '@/components/markdown';
import { LessonExercises } from '@/components/learn/lesson-exercises';

interface Props {
  params: Promise<{ chapterId: string; lessonId: string }>;
}

// Hex accents (mirror SECTION_COLORS) for the lesson's heading bars, threaded
// into prose-gmat via the --lesson-accent custom property.
const SECTION_ACCENT: Record<Section, string> = {
  quant: '#3b82f6',
  verbal: '#10b981',
  data_insights: '#8b5cf6',
};

export async function generateMetadata({ params }: Props) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);
  return { title: lesson ? `${lesson.title} — GMAT Prep` : 'Lesson — GMAT Prep' };
}

export default async function LessonPage({ params }: Props) {
  const { chapterId, lessonId } = await params;

  const [lesson, chapters] = await Promise.all([getLesson(lessonId), getLearnChapters()]);
  if (!lesson) notFound();

  const chapter = chapters.find((c) => c.id === chapterId);
  if (!chapter) notFound();

  const [lessons, exercises] = await Promise.all([
    getLessonsByChapter(chapterId),
    getLessonExercises(lesson.exerciseIds),
  ]);

  const currentIdx = lessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? lessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < lessons.length - 1 ? lessons[currentIdx + 1] : null;
  const colors = SECTION_COLORS[chapter.section];
  const wordCount = lesson.body.split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));
  const progressPct = Math.round(((currentIdx + 1) / lessons.length) * 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/learn" className="transition-colors hover:text-foreground">
          Learn
        </Link>
        <span>/</span>
        <Link
          href={`/learn/${chapterId}`}
          className="transition-colors hover:text-foreground"
        >
          {chapter.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">{lesson.title}</span>
      </nav>

      {/* Lesson header */}
      <header className="mb-8 border-b border-border pb-6">
        <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold ${colors.badge}`}
          >
            {SECTION_LABELS[chapter.section]}
          </span>
          <span className="text-muted-foreground">
            Lesson {currentIdx + 1} of {lessons.length}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3.5" /> {readingMinutes} min read
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>

        {/* Progress through the chapter */}
        <div className="mt-5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${colors.progressBar}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {currentIdx + 1}/{lessons.length}
          </span>
        </div>
      </header>

      {/* Lesson content */}
      <div
        className="max-w-none"
        style={{ '--lesson-accent': SECTION_ACCENT[chapter.section] } as CSSProperties}
      >
        <Markdown>{lesson.body}</Markdown>
      </div>

      {/* Exercises */}
      <LessonExercises lessonId={lessonId} exercises={exercises} />

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
        {prevLesson ? (
          <Link
            href={`/learn/${chapterId}/${prevLesson.id}`}
            className="group flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="line-clamp-1 max-w-[200px]">{prevLesson.title}</span>
          </Link>
        ) : (
          <Link
            href={`/learn/${chapterId}`}
            className="group flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Chapter overview
          </Link>
        )}
        {nextLesson ? (
          <Link
            href={`/learn/${chapterId}/${nextLesson.id}`}
            className="group flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <span className="line-clamp-1 max-w-[200px]">{nextLesson.title}</span>
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <Link
            href={`/learn/${chapterId}`}
            className="group flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Back to chapter
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
