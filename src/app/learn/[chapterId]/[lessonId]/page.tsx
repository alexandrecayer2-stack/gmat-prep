import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLearnChapters, getLessonsByChapter, getLesson, getLessonExercises } from '@/lib/data/content';
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/learn" className="hover:text-foreground">
          Learn
        </Link>
        <span>/</span>
        <Link href={`/learn/${chapterId}`} className="hover:text-foreground">
          {chapter.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">{lesson.title}</span>
      </nav>

      {/* Lesson header */}
      <header className="mb-6">
        <p className="text-xs text-muted-foreground">
          Lesson {currentIdx + 1} of {lessons.length}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{lesson.title}</h1>
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
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            <span className="line-clamp-1">{prevLesson.title}</span>
          </Link>
        ) : (
          <Link
            href={`/learn/${chapterId}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Chapter overview
          </Link>
        )}
        {nextLesson ? (
          <Link
            href={`/learn/${chapterId}/${nextLesson.id}`}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <span className="line-clamp-1">{nextLesson.title}</span>
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <Link
            href={`/learn/${chapterId}`}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Back to chapter <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
