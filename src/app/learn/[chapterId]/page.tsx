import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLearnChapters, getLessonsByChapter } from '@/lib/data/content';
import { SECTION_LABELS, SECTION_COLORS } from '@/lib/domain/constants';
import { ChapterProgressBar } from '@/components/learn/chapter-progress';
import { ChapterLessonList } from '@/components/learn/chapter-lesson-list';
import { SECTION_ICONS } from '@/components/ui/section-icons';

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
  const Icon = SECTION_ICONS[chapter.section];

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
      <div className={`animate-fade-in-up elev mb-8 rounded-2xl border p-6 ${colors.bg} ${colors.border}`}>
        <div className="mb-4 flex items-center gap-2.5">
          <span
            className={`flex size-9 items-center justify-center rounded-xl bg-background/60 ${colors.text}`}
          >
            <Icon className="size-5" />
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors.badge}`}
          >
            {SECTION_LABELS[chapter.section]}
          </span>
        </div>
        <h1 className="mb-2 font-heading text-2xl font-bold tracking-tight">{chapter.title}</h1>
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
      <ChapterLessonList chapterId={chapterId} lessons={lessons} section={chapter.section} />

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
            className="btn-brand inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            Start lesson 1 <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
