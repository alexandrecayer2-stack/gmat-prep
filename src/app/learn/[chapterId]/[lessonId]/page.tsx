import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getLearnChapters,
  getLessonsByChapter,
  getLesson,
  getLessonExercises,
} from '@/lib/data/content';
import { SECTION_LABELS, SECTION_COLORS } from '@/lib/domain/constants';
import { Markdown } from '@/components/markdown';
import { LessonExercises } from '@/components/learn/lesson-exercises';

interface Props {
  params: Promise<{ chapterId: string; lessonId: string }>;
}

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
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors.badge}`}
          >
            {SECTION_LABELS[chapter.section]}
          </span>
          <span className="text-xs text-muted-foreground">
            Lesson {currentIdx + 1} of {lessons.length}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
      </header>

      {/* Lesson content */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
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
