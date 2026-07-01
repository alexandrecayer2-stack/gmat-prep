'use client';

import { useMemo, useState } from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';
import type { ReviewItem } from '@/lib/data/attempts';
import type { QuestionType, Section } from '@/lib/domain/types';
import {
  QUESTION_TYPE_LABELS,
  SECTIONS,
  SECTION_COLORS,
  SECTION_LABELS,
} from '@/lib/domain/constants';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';

interface Tally {
  total: number;
  correct: number;
}

/** Accuracy analytics computed from the (latest-attempt-per-question) history:
 *  overall, per section, per type, and the weakest topic. Collapsible. */
export function ReviewAnalytics({ items }: { items: ReviewItem[] }) {
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const overall: Tally = { total: 0, correct: 0 };
    const bySection = new Map<Section, Tally>();
    const byType = new Map<QuestionType, Tally>();
    const byTopic = new Map<string, Tally>();
    const bump = (m: Map<string, Tally>, k: string, ok: boolean) => {
      const t = m.get(k) ?? { total: 0, correct: 0 };
      t.total += 1;
      if (ok) t.correct += 1;
      m.set(k, t);
    };
    for (const it of items) {
      overall.total += 1;
      if (it.isCorrect) overall.correct += 1;
      bump(bySection as Map<string, Tally>, it.section, it.isCorrect);
      bump(byType as Map<string, Tally>, it.type, it.isCorrect);
      bump(byTopic, it.topic, it.isCorrect);
    }
    // Weakest topic with a meaningful sample (≥3 attempts), lowest accuracy.
    let weakest: { topic: string; pct: number; total: number } | null = null;
    for (const [topic, t] of byTopic) {
      if (t.total < 3) continue;
      const pct = Math.round((t.correct / t.total) * 100);
      if (!weakest || pct < weakest.pct) weakest = { topic, pct, total: t.total };
    }
    return { overall, bySection, byType, weakest };
  }, [items]);

  if (stats.overall.total === 0) return null;
  const overallPct = Math.round((stats.overall.correct / stats.overall.total) * 100);

  return (
    <Card className="mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <BarChart3 className="size-5 text-primary" />
          <div>
            <SectionLabel as="div">Your performance</SectionLabel>
            <div className="text-sm text-muted-foreground">
              {overallPct}% overall · {stats.overall.correct}/{stats.overall.total} correct
              {stats.weakest && (
                <>
                  {' '}
                  · weakest: <span className="capitalize text-foreground">{stats.weakest.topic}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="grid gap-6 border-t border-border p-4 sm:grid-cols-2">
          <div>
            <SectionLabel as="div" className="mb-2">By section</SectionLabel>
            <div className="space-y-2.5">
              {SECTIONS.map((s) => {
                const t = stats.bySection.get(s);
                return <AccuracyBar key={s} label={SECTION_LABELS[s]} tally={t} barClass={SECTION_COLORS[s].progressBar} />;
              })}
            </div>
          </div>
          <div>
            <SectionLabel as="div" className="mb-2">By question type</SectionLabel>
            <div className="space-y-2.5">
              {[...stats.byType.entries()]
                .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
                .map(([type, t]) => (
                  <AccuracyBar key={type} label={QUESTION_TYPE_LABELS[type]} tally={t} barClass="bg-primary" />
                ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function AccuracyBar({ label, tally, barClass }: { label: string; tally?: Tally; barClass: string }) {
  const pct = tally && tally.total ? Math.round((tally.correct / tally.total) * 100) : null;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-muted-foreground">
          {pct === null ? '—' : `${pct}% (${tally!.correct}/${tally!.total})`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', barClass)} style={{ width: `${pct ?? 0}%` }} />
      </div>
    </div>
  );
}
