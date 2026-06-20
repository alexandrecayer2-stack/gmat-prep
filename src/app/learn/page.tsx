import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getLearnChapters, getLessonsByChapter } from '@/lib/data/content';
import { SECTIONS, SECTION_LABELS, SECTION_COLORS } from '@/lib/domain/constants';
import type { LearnChapter, LearnLesson } from '@/lib/domain/types';
import { ChapterProgressBar } from '@/components/learn/chapter-progress';
import { SECTION_ICONS } from '@/components/ui/section-icons';

export const metadata = { title: 'Learn — GMAT Prep' };

export default async function LearnPage() {
  const chapters = await getLearnChapters();

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

  const totalLessons = Object.values(lessonsByChapter).reduce((s, ls) => s + ls.length, 0);
  const totalExercises = Object.values(lessonsByChapter)
    .flat()
    .reduce((s, l) => s + l.exerciseIds.length, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <header className="mb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Learn</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Structured lessons with worked examples and targeted practice. Complete exercises to
              track your progress.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            {(
              [
                ['chapters', chapters.length],
                ['lessons', totalLessons],
                ['exercises', totalExercises],
              ] as [string, number][]
            ).map(([label, n]) => (
              <div key={label} className="rounded-xl bg-muted/50 px-4 py-2.5 text-center">
                <p className="text-2xl font-bold tabular-nums text-foreground">{n}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-12">
        {SECTIONS.map((section) => {
          const sectionChapters = chaptersBySection[section] ?? [];
          if (sectionChapters.length === 0) return null;
          const colors = SECTION_COLORS[section];
          const Icon = SECTION_ICONS[section];

          return (
            <section key={section}>
              {/* Section heading */}
              <div className="mb-5 flex items-center gap-2.5">
                <div
                  className={`flex size-6 items-center justify-center rounded-md ${colors.bg}`}
                >
                  <Icon className={`size-3.5 ${colors.text}`} />
                </div>
                <h2
                  className={`text-sm font-semibold uppercase tracking-wider ${colors.text}`}
                >
                  {SECTION_LABELS[section]}
                </h2>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">
                  {sectionChapters.length} chapter{sectionChapters.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Chapter cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {sectionChapters.map((ch, ci) => {
                  const lessons = lessonsByChapter[ch.id] ?? [];
                  const exerciseCount = lessons.reduce((s, l) => s + l.exerciseIds.length, 0);
                  return (
                    <Link
                      key={ch.id}
                      href={`/learn/${ch.id}`}
                      className={`animate-fade-in-up stagger-${Math.min(ci + 1, 5)} group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-black/20`}
                    >
                      {/* Top colour stripe */}
                      <div className={`h-1 w-full ${colors.accent}`} />
                      <div className="p-5">
                        {/* Chapter badge + arrow */}
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex size-7 items-center justify-center rounded-lg ${colors.bg}`}
                            >
                              <Icon className={`size-4 ${colors.text}`} />
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.badge}`}
                            >
                              Chapter {ch.orderIndex}
                            </span>
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                        </div>

                        {/* Title */}
                        <h3 className="mb-1.5 text-base font-semibold leading-snug">
                          {ch.title}
                        </h3>

                        {/* Description */}
                        {ch.description && (
                          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {ch.description}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span>{exerciseCount} exercises</span>
                        </div>

                        {/* Progress */}
                        <ChapterProgressBar chapter={ch} lessons={lessons} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
