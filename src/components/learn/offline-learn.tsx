'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronLeft, ChevronRight, CloudOff, Loader2, Target, WifiOff } from 'lucide-react';
import type { LearnArticle, LearnChapter, LearnLesson, Section } from '@/lib/domain/types';
import type { LearnBank } from '@/lib/data/learn-bank';
import { SECTIONS, SECTION_LABELS } from '@/lib/domain/constants';
import { loadLearn } from '@/lib/offline/learn';
import { Markdown } from '@/components/markdown';
import { Card } from '@/components/ui/card';

type Status = 'loading' | 'ready' | 'unavailable';
type Reading =
  | { kind: 'lesson'; lesson: LearnLesson }
  | { kind: 'article'; article: LearnArticle };

export function OfflineLearn() {
  const [status, setStatus] = useState<Status>('loading');
  const [bank, setBank] = useState<LearnBank | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLearn()
      .then((b) => {
        if (cancelled) return;
        setBank(b);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // chapterId -> its lessons, ordered.
  const lessonsByChapter = useMemo(() => {
    const map = new Map<string, LearnLesson[]>();
    for (const l of bank?.lessons ?? []) {
      const arr = map.get(l.chapterId) ?? [];
      arr.push(l);
      map.set(l.chapterId, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.orderIndex - b.orderIndex);
    return map;
  }, [bank]);

  if (status === 'loading') {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">Loading your offline lessons…</p>
      </Centered>
    );
  }

  if (status === 'unavailable') {
    return (
      <Centered>
        <div className="rounded-full bg-muted p-4">
          <CloudOff className="h-8 w-8 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="mt-6 text-lg font-semibold">Lessons aren&apos;t downloaded yet</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Open the app once while you have a connection and the lessons are saved to
          your device for offline reading.
        </p>
        <Link
          href="/learn"
          className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to Learn
        </Link>
      </Centered>
    );
  }

  if (reading) {
    return <Reader reading={reading} onBack={() => setReading(null)} />;
  }

  const chaptersBySection = (section: Section) =>
    (bank?.chapters ?? [])
      .filter((c) => c.section === section)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  const articlesBySection = (section: Section) =>
    (bank?.articles ?? [])
      .filter((a) => a.section === section)
      .sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <WifiOff className="h-4 w-4" aria-hidden />
        Offline mode — reading from your downloaded lessons.
      </div>

      <h1 className="text-2xl font-bold tracking-tight">Learn</h1>

      {SECTIONS.map((section) => {
        const chapters = chaptersBySection(section);
        const articles = articlesBySection(section);
        if (chapters.length === 0 && articles.length === 0) return null;
        return (
          <section key={section} className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {SECTION_LABELS[section]}
            </h2>

            {chapters.map((chapter) => (
              <ChapterBlock
                key={chapter.id}
                chapter={chapter}
                lessons={lessonsByChapter.get(chapter.id) ?? []}
                onOpen={(lesson) => setReading({ kind: 'lesson', lesson })}
              />
            ))}

            {articles.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-xs font-medium text-muted-foreground">Reference</div>
                <Card className="divide-y divide-border p-0">
                  {articles.map((article) => (
                    <Row
                      key={article.id}
                      label={article.title}
                      onClick={() => setReading({ kind: 'article', article })}
                    />
                  ))}
                </Card>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ChapterBlock({
  chapter,
  lessons,
  onOpen,
}: {
  chapter: LearnChapter;
  lessons: LearnLesson[];
  onOpen: (lesson: LearnLesson) => void;
}) {
  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium">
        <BookOpen className="h-4 w-4 text-primary" aria-hidden />
        {chapter.title}
      </div>
      {lessons.length > 0 ? (
        <Card className="divide-y divide-border p-0">
          {lessons.map((lesson) => (
            <Row key={lesson.id} label={lesson.title} onClick={() => onOpen(lesson)} />
          ))}
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground">No lessons downloaded.</p>
      )}
    </div>
  );
}

function Row({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-muted/50"
    >
      <span className="min-w-0 truncate">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

function Reader({ reading, onBack }: { reading: Reading; onBack: () => void }) {
  const title = reading.kind === 'lesson' ? reading.lesson.title : reading.article.title;
  const body = reading.kind === 'lesson' ? reading.lesson.body : reading.article.body;
  const exerciseIds = reading.kind === 'lesson' ? reading.lesson.exerciseIds : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Back
      </button>

      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

      <div className="prose-gmat mt-4">
        <Markdown>{body}</Markdown>
      </div>

      {exerciseIds.length > 0 && (
        <Link
          href={`/practice/offline?ids=${exerciseIds.join(',')}`}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Target className="h-4 w-4" aria-hidden />
          Practice {exerciseIds.length} exercise{exerciseIds.length === 1 ? '' : 's'} offline
        </Link>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      {children}
    </div>
  );
}
