import Link from 'next/link';
import { ArrowRight, ClipboardList, Sparkles, Target, Zap } from 'lucide-react';
import {
  QUESTION_TYPE_LABELS,
  SECTIONS,
  SECTION_COLORS,
  SECTION_LABELS,
  SECTION_TYPES,
} from '@/lib/domain/constants';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { SECTION_ICONS } from '@/components/ui/section-icons';

// Lead with the free score-predictor hook — the highest-intent entry point for a
// cold visitor. The differentiators (per-distractor explanations, adaptive score,
// full three-section coverage) sit directly under it.
const VALUE_PROPS = [
  {
    icon: Sparkles,
    title: 'Your score in ~15 minutes',
    body: 'An adaptive diagnostic homes in on your level and predicts your GMAT Focus score — then turns it into a study plan toward your target.',
  },
  {
    icon: Zap,
    title: 'Understand every wrong answer',
    body: 'Not just the right choice — every distractor comes with a “why this is wrong,” so you stop repeating the same mistakes.',
  },
  {
    icon: Target,
    title: 'Built to mirror the real exam',
    body: 'All three sections, realistic question types, honest difficulty, and full-length timed mocks with a detailed review.',
  },
];

const STEPS = [
  { title: 'Diagnose', body: 'Take the free adaptive diagnostic.' },
  { title: 'Plan', body: 'Get a week-by-week plan to your target.' },
  { title: 'Practice', body: 'Targeted sets with instant explanations.' },
  { title: 'Simulate', body: 'A full timed mock, then review.' },
];

/** The logged-out / not-yet-engaged landing page. Shown at `/` to cold visitors;
 *  returning users who've taken the diagnostic or practiced get the dashboard. */
export function MarketingLanding({ totalLabel }: { totalLabel: string }) {
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:py-12">
      {/* Hero */}
      <section className="hero-surface animate-fade-in-up rounded-2xl border border-border p-6 text-center sm:p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5 text-primary" /> GMAT Focus Edition
        </span>
        <h1 className="mx-auto mt-4 max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-5xl">
          Know your GMAT score before you sit the exam
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          Take a free, ~15-minute adaptive diagnostic. Get your predicted GMAT Focus score, see
          exactly where you stand across all three sections, and get a study plan to close the gap.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/diagnostic"
            className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium"
          >
            Predict my score — free <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/practice"
            className="elev inline-flex items-center gap-1 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted"
          >
            Browse practice
          </Link>
        </div>
        <dl className="mx-auto mt-8 flex max-w-lg flex-wrap justify-center gap-x-8 gap-y-3 border-t border-border pt-6">
          <div>
            <dt className="text-xs text-muted-foreground">Practice questions</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">{totalLabel}</dd>
          </div>
          <div className="sm:border-l sm:border-border sm:pl-8">
            <dt className="text-xs text-muted-foreground">Exam sections</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">3</dd>
          </div>
          <div className="sm:border-l sm:border-border sm:pl-8">
            <dt className="text-xs text-muted-foreground">Explanations</dt>
            <dd className="font-heading text-xl font-semibold">Every answer</dd>
          </div>
        </dl>
      </section>

      {/* Value props */}
      <section className="grid gap-4 sm:grid-cols-3">
        {VALUE_PROPS.map((v, i) => {
          const Icon = v.icon;
          return (
            <Card key={v.title} className={`animate-fade-in-up stagger-${i + 1} p-5`}>
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-3 font-heading text-base font-semibold">{v.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>
            </Card>
          );
        })}
      </section>

      {/* How it works */}
      <section>
        <SectionLabel className="mb-3">How it works</SectionLabel>
        <ol className="grid gap-3 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-border bg-card p-4">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary tabular-nums">
                {i + 1}
              </div>
              <h3 className="mt-2 text-sm font-medium">{s.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Section breakdown */}
      <section>
        <SectionLabel className="mb-3">What you&apos;ll practice</SectionLabel>
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
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-accent/40 p-8 text-center">
        <ClipboardList className="size-7 text-primary" />
        <div>
          <h2 className="font-heading text-xl font-semibold">See where you stand today</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            The diagnostic is free and takes about 15 minutes — no sign-up needed to start.
          </p>
        </div>
        <Link
          href="/diagnostic"
          className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          Start the free diagnostic <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
