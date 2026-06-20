import Link from 'next/link';
import { ArrowRight, ClipboardList, Sparkles } from 'lucide-react';
import {
  QUESTION_TYPE_LABELS,
  SECTIONS,
  SECTION_COLORS,
  SECTION_LABELS,
  SECTION_TYPES,
} from '@/lib/domain/constants';
import { DashboardStats } from '@/components/dashboard-stats';
import { PlanCard } from '@/components/plan/plan-card';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { SECTION_ICONS } from '@/components/ui/section-icons';

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <section className="hero-surface animate-fade-in-up rounded-2xl border border-border p-6 sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5 text-primary" /> GMAT Focus Edition
        </span>
        <h1 className="mt-4 max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          GMAT Focus practice that mirrors the real exam
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Three sections — Quantitative Reasoning, Verbal Reasoning, and Data Insights — with
          realistic question types, honest difficulty levels, instant explanations, and progress
          tracking.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/practice"
            className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
          >
            Start practicing <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/learn"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Browse Learn cards
          </Link>
        </div>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-5">
          <div>
            <dt className="text-xs text-muted-foreground">Practice questions</dt>
            <dd className="font-heading text-lg font-semibold tabular-nums">1,000+</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Exam sections</dt>
            <dd className="font-heading text-lg font-semibold tabular-nums">3</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Feedback</dt>
            <dd className="font-heading text-lg font-semibold">Instant</dd>
          </div>
        </dl>
      </section>

      <PlanCard />

      <DashboardStats />

      {/* Mock Exam banner */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-accent/40 p-5">
        <div className="flex items-center gap-3">
          <ClipboardList className="size-6 shrink-0 text-primary" />
          <div>
            <div className="font-medium">Mock Exam</div>
            <div className="text-sm text-muted-foreground">
              3 sections · 64 questions · 2h15 — same structure as the real GMAT Focus
            </div>
          </div>
        </div>
        <Link
          href="/mock"
          className="bg-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5"
        >
          Start mock exam <ArrowRight className="size-4" />
        </Link>
      </section>

      <section>
        <SectionLabel className="mb-3">Practice by section</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          {SECTIONS.map((s, i) => {
            const colors = SECTION_COLORS[s];
            const Icon = SECTION_ICONS[s];
            return (
              <Card
                key={s}
                className={`card-hover animate-fade-in-up stagger-${i + 1} flex flex-col overflow-hidden`}
              >
                <div className={`h-1 w-full ${colors.accent}`} />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex size-7 items-center justify-center rounded-lg ${colors.bg}`}
                    >
                      <Icon className={`size-4 ${colors.text}`} />
                    </span>
                    <h3 className="font-medium">{SECTION_LABELS[s]}</h3>
                  </div>
                  <ul className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
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
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
