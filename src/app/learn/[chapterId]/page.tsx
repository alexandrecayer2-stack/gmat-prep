import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLearnChapters, getLessonsByChapter } from '@/lib/data/content';
import { SECTION_LABELS } from '@/lib/domain/constants';
import { LessonCompletionDots } from '@/components/learn/chapter-progress';

interface Props {
  params: Promise<{ chapterId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { chapterId } = await params;
  const chapters = await getLearnChapters();
  const chapter = chapters.find((c) => c.id === chapterId);
  return { title: chapter ? `${chapter.title} — GMAT Prep` : 'Chapter — GMAT Prep' };
}

export default async function ChapterPage({ params }: Props) {
  const { chapterId } = await params;
  const chapters = await getLearnChapters();
  const chapter = chapters.find((c) => c.id === chapterId);
  if (!chapter) notFound();

  const lessons = await getLessonsByChapter(chapterId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/learn" className="hover:text-foreground">
          Learn
        </Link>
        <span>/</span>
        <span className="text-foreground">{chapter.title}</span>
      </nav>

      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {SECTION_LABELS[chapter.section]}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{chapter.title}</h1>
        {chapter.description && (
          <p className="mt-2 text-sm text-muted-foreground">{chapter.description}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} ·{' '}
          {lessons.reduce((s, l) => s + l.exerciseIds.length, 0)} exercises
        </p>
      </header>

      <div className="space-y-3">
        {lessons.map((lesson, i) => (
          <Link
            key={lesson.id}
            href={`/learn/${chapterId}/${lesson.id}`}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug">{lesson.title}</p>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {lesson.exerciseIds.length} exercise{lesson.exerciseIds.length !== 1 ? 's' : ''}
                </span>
                <LessonCompletionDots lessons={[lesson]} />
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link href="/learn" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> All chapters
        </Link>
        {lessons.length > 0 && (
          <Link
            href={`/learn/${chapterId}/${lessons[0].id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Start lesson 1 <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
