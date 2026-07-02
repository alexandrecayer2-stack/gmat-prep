'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search, X } from 'lucide-react';
import { SECTIONS, SECTION_LABELS, SECTION_SHORT, SECTION_COLORS } from '@/lib/domain/constants';
import type { LearnChapter, LearnLesson, Section } from '@/lib/domain/types';
import { ChapterProgressBar } from './chapter-progress';
import { SECTION_ICONS } from '@/components/ui/section-icons';
import { cn } from '@/lib/utils';

type SectionFilter = 'all' | Section;

export function LearnBrowser({
  chapters,
  lessonsByChapter,
}: {
  chapters: LearnChapter[];
  lessonsByChapter: Record<string, LearnLesson[]>;
}) {
  const [query, setQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');

  // Stable per-section chapter numbers, computed from the full ordered list so
  // searching or filtering never renumbers a chapter.
  const chapterNumber = useMemo(() => {
    const m = new Map<string, number>();
    const perSection: Partial<Record<Section, number>> = {};
    for (const ch of chapters) {
      const n = (perSection[ch.section] ?? 0) + 1;
      perSection[ch.section] = n;
      m.set(ch.id, n);
    }
    return m;
  }, [chapters]);

  const q = query.trim().toLowerCase();

  const bySection = useMemo(() => {
    const out: Record<Section, LearnChapter[]> = { quant: [], verbal: [], data_insights: [] };
    const matches = (ch: LearnChapter) => {
      if (!q) return true;
      if (ch.title.toLowerCase().includes(q)) return true;
      if (ch.description?.toLowerCase().includes(q)) return true;
      return (lessonsByChapter[ch.id] ?? []).some((l) => l.title.toLowerCase().includes(q));
    };
    for (const ch of chapters) {
      if (sectionFilter !== 'all' && ch.section !== sectionFilter) continue;
      if (!matches(ch)) continue;
      out[ch.section].push(ch);
    }
    return out;
  }, [chapters, lessonsByChapter, sectionFilter, q]);

  const totalShown = SECTIONS.reduce((s, sec) => s + bySection[sec].length, 0);

  return (
    <div>
      {/* Search + section filter */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chapters and lessons"
            aria-label="Search Learn"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-9 text-sm outline-none transition-colors focus:border-primary/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={sectionFilter === 'all'} onClick={() => setSectionFilter('all')}>
            All
          </Chip>
          {SECTIONS.map((s) => (
            <Chip key={s} active={sectionFilter === s} onClick={() => setSectionFilter(s)}>
              {SECTION_SHORT[s]}
            </Chip>
          ))}
        </div>
      </div>

      {totalShown === 0 ? (
        <div className="animate-fade-in-up flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Search className="size-6 text-muted-foreground/40" />
          <p>
            No chapters or lessons match{' '}
            <span className="font-medium text-foreground">“{query}”</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {SECTIONS.map((section) => {
            const sectionChapters = bySection[section];
            if (sectionChapters.length === 0) return null;
            const colors = SECTION_COLORS[section];
            const Icon = SECTION_ICONS[section];

            return (
              <section key={section}>
                <div className="mb-5 flex items-center gap-2.5">
                  <div className={`flex size-6 items-center justify-center rounded-md ${colors.bg}`}>
                    <Icon className={`size-3.5 ${colors.text}`} />
                  </div>
                  <h2 className={`text-sm font-semibold uppercase tracking-wider ${colors.text}`}>
                    {SECTION_LABELS[section]}
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {sectionChapters.length} chapter{sectionChapters.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {sectionChapters.map((ch, ci) => {
                    const lessons = lessonsByChapter[ch.id] ?? [];
                    const exerciseCount = lessons.reduce((s, l) => s + l.exerciseIds.length, 0);
                    return (
                      <Link
                        key={ch.id}
                        href={`/learn/${ch.id}`}
                        className={`animate-fade-in-up stagger-${Math.min(ci + 1, 5)} group card-hover elev relative overflow-hidden rounded-2xl border border-border bg-card`}
                      >
                        <div className={`h-1 w-full ${colors.accent}`} />
                        <div className="p-5">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`flex size-7 items-center justify-center rounded-lg ${colors.bg}`}>
                                <Icon className={`size-4 ${colors.text}`} />
                              </span>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.badge}`}>
                                Chapter {chapterNumber.get(ch.id)}
                              </span>
                            </div>
                            <ChevronRight className="size-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                          </div>

                          <h3 className="mb-1.5 text-base font-semibold leading-snug">{ch.title}</h3>

                          {ch.description && (
                            <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                              {ch.description}
                            </p>
                          )}

                          <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>
                              {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                            <span>{exerciseCount} exercises</span>
                          </div>

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
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border-primary bg-accent text-accent-foreground'
          : 'border-border text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}
