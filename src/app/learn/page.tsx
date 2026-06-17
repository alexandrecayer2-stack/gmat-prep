import Link from 'next/link';
import { BookOpen, ChevronRight } from 'lucide-react';
import { getLearnChapters, getLessonsByChapter } from '@/lib/data/content';
import { SECTIONS, SECTION_LABELS } from '@/lib/domain/constants';
import type { LearnChapter, LearnLesson } from '@/lib/domain/types';
import { ChapterProgressBars } from '@/components/learn/chapter-progress';

export const metadata = { title: 'Learn — GMAT Prep' };

export default async function LearnPage() {
  const chapters = await getLearnChapters();

  // Load all lessons grouped by chapter
  const lessonsByChapter: Record<string, LearnLesson[]> = {};
  await Promise.all(
    chapters.map(async (ch) => {
      lessonsByChapter[ch.id] = await getLessonsByChapter(ch.id);
    }),
  );

  const chaptersBySection: Record<string, LearnChapter[]> = {};
  for (const ch of chapters) {
    if (!chaptersBySection[ch.section]) chaptersBySection[ch.section] = [];
    chaptersBySection[ch.section].push(ch);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Structured lessons with worked examples and practice exercises. Complete exercises to
          track your progress through each chapter.
        </p>
      </header>

      {SECTIONS.map((section) => {
        const sectionChapters = chaptersBySection[section] ?? [];
        if (sectionChapters.length === 0) return null;

        return (
          <section key={section}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS[section]}
              </h2>
              <Link
                href={`/practice?section=${section}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Practice {SECTION_LABELS[section]} →
              </Link>
            </div>

            <div className="space-y-3">
              {sectionChapters.map((ch) => {
                const lessons = lessonsByChapter[ch.id] ?? [];
                return (
                  <Link
                    key={ch.id}
                    href={`/learn/${ch.id}`}
                    className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium leading-snug">{ch.title}</h3>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </div>
                        {ch.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                            {ch.description}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} ·{' '}
                          {lessons.reduce((s, l) => s + l.exerciseIds.length, 0)} exercises
                        </p>
                        {/* Progress bar injected client-side */}
                        <ChapterProgressBars
                          chapters={[ch]}
                          lessonsByChapter={lessonsByChapter}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
