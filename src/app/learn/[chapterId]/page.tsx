import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLearnChapters, getLessonsByChapter } from '@/lib/data/content';
import { SECTION_LABELS, SECTION_COLORS } from '@/lib/domain/constants';
import { ChapterProgressBar } from '@/components/learn/chapter-progress';

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
  const totalExercises = lessons.reduce((s, l) => s + l.exerciseIds.length, 0);
  const colors = SECTION_COLORS[chapter.section];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/learn" className="transition-colors hover:text-foreground">
          Learn
        </Link>
        <span>/</span>
        <span className="text-foreground">{chapter.title}</span>
      </nav>

      {/* Chapter hero */}
      <div className={`mb-8 rounded-2xl border p-6 ${colors.bg} ${colors.border}`}>
        <span
          className={`mb-4 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors.badge}`}
        >
          {SECTION_LABELS[chapter.section]}
        </span>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">{chapter.title}</h1>
        {chapter.description && (
          <p className="mb-4 text-muted-foreground">{chapter.description}</p>
        )}
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
          </span>
          <span>·</span>
          <span>{totalExercises} exercises</span>
        </div>
        <ChapterProgressBar chapter={chapter} lessons={lessons} />
      </div>

      {/* Lessons */}
      <div className="mb-8 overflow-hidden rounded-xl border border-border divide-y divide-border">
        {lessons.map((lesson, i) => (
          <Link
            key={lesson.id}
            href={`/learn/${chapterId}/${lesson.id}`}
            className="group flex items-center gap-5 bg-card px-6 py-5 transition-colors hover:bg-accent/20"
          >
            <span
              className={`w-7 shrink-0 text-2xl font-black leading-none tabular-nums transition-opacity ${colors.text} opacity-30 group-hover:opacity-60`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{lesson.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {lesson.exerciseIds.length} exercise{lesson.exerciseIds.length !== 1 ? 's' : ''}
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/learn"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> All chapters
        </Link>
        {lessons.length > 0 && (
          <Link
            href={`/learn/${chapterId}/${lessons[0].id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start lesson 1 <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
