import { getLearnChapters, getLessonsByChapter } from '@/lib/data/content';
import type { LearnLesson } from '@/lib/domain/types';
import { LearnBrowser } from '@/components/learn/learn-browser';

export const metadata = { title: 'Learn — GMAT Prep' };

export default async function LearnPage() {
  const chapters = await getLearnChapters();

  const lessonsByChapter: Record<string, LearnLesson[]> = {};
  await Promise.all(
    chapters.map(async (ch) => {
      lessonsByChapter[ch.id] = await getLessonsByChapter(ch.id);
    }),
  );

  const totalLessons = Object.values(lessonsByChapter).reduce((s, ls) => s + ls.length, 0);
  const totalExercises = Object.values(lessonsByChapter)
    .flat()
    .reduce((s, l) => s + l.exerciseIds.length, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {/* Header */}
      <header className="mb-8">
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

      <LearnBrowser chapters={chapters} lessonsByChapter={lessonsByChapter} />
    </div>
  );
}
