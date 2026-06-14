import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  QUESTION_TYPE_LABELS,
  SECTIONS,
  SECTION_LABELS,
  SECTION_TYPES,
} from '@/lib/domain/constants';
import { DashboardStats } from '@/components/dashboard-stats';

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <section className="rounded-2xl border border-border bg-gradient-to-br from-accent/60 to-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          GMAT Focus practice that mirrors the real exam
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Three sections — Quantitative Reasoning, Verbal Reasoning, and Data Insights — with
          realistic question types, honest difficulty levels, instant explanations, and progress
          tracking.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/practice"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Start practicing <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/learn"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Browse Learn cards
          </Link>
        </div>
      </section>

      <DashboardStats />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Practice by section
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {SECTIONS.map((s) => (
            <div key={s} className="flex flex-col rounded-xl border border-border bg-card p-4">
              <h3 className="font-medium">{SECTION_LABELS[s]}</h3>
              <ul className="mt-2 flex-1 space-y-1 text-xs text-muted-foreground">
                {SECTION_TYPES[s].map((t) => (
                  <li key={t}>{QUESTION_TYPE_LABELS[t]}</li>
                ))}
              </ul>
              <Link
                href={`/practice?section=${s}`}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Practice <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
