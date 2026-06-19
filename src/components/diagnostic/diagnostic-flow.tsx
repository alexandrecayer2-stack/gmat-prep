'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import type { QuestionWithGroup, Section } from '@/lib/domain/types';
import { SECTIONS, SECTION_COLORS, SECTION_LABELS } from '@/lib/domain/constants';
import { estimateDiagnostic, type DiagnosticEstimate, type GradedItem } from '@/lib/domain/scoring';
import { buildStudyPlan, type StudyPlan } from '@/lib/domain/study-plan';
import { useAuth } from '@/lib/auth/auth-provider';
import { saveDiagnostic } from '@/lib/data/diagnostic';
import { saveStudyPlan } from '@/lib/data/plans';
import { cn } from '@/lib/utils';
import { DiagnosticRunner, type DiagnosticResult } from './diagnostic-runner';
import { PlanView } from '@/components/plan/plan-view';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';

type Step = 'intro' | 'test' | 'goal' | 'plan';

function computeWeakTopics(results: DiagnosticResult[]): Record<Section, string[]> {
  const acc: Record<Section, Record<string, { wrong: number }>> = {
    quant: {},
    verbal: {},
    data_insights: {},
  };
  for (const r of results) {
    const e = (acc[r.question.section][r.question.topic] ??= { wrong: 0 });
    if (!r.isCorrect) e.wrong += 1;
  }
  const out = { quant: [], verbal: [], data_insights: [] } as Record<Section, string[]>;
  for (const s of SECTIONS) {
    out[s] = Object.entries(acc[s])
      .filter(([, v]) => v.wrong > 0)
      .sort((a, b) => b[1].wrong - a[1].wrong)
      .slice(0, 3)
      .map(([t]) => t);
  }
  return out;
}

function weeksUntil(dateStr: string): number | null {
  const ms = new Date(dateStr).getTime() - Date.now();
  return ms > 0 ? Math.max(1, Math.ceil(ms / (7 * 86_400_000))) : null;
}

const defaultTarget = (total: number) => Math.min(805, total + 50);

export function DiagnosticFlow({ questions }: { questions: QuestionWithGroup[] }) {
  const { user, supabase } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>('intro');
  const [results, setResults] = useState<DiagnosticResult[] | null>(null);
  const [estimate, setEstimate] = useState<DiagnosticEstimate | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [target, setTarget] = useState(605);
  const [targetDate, setTargetDate] = useState('');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const weakTopics = useMemo(() => (results ? computeWeakTopics(results) : null), [results]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const countsBySection = useMemo(() => {
    const c = { quant: 0, verbal: 0, data_insights: 0 } as Record<Section, number>;
    for (const q of questions) c[q.section] += 1;
    return c;
  }, [questions]);

  async function handleComplete(res: DiagnosticResult[]) {
    const items: GradedItem[] = res.map((r) => ({
      section: r.question.section,
      difficulty: r.question.difficulty,
      isCorrect: r.isCorrect,
      topic: r.question.topic,
    }));
    const est = estimateDiagnostic(items);
    setResults(res);
    setEstimate(est);
    setTarget(defaultTarget(est.total));
    setStep('goal');
    window.scrollTo(0, 0);

    if (user) {
      try {
        const id = await saveDiagnostic(
          supabase,
          user.id,
          res.map((r) => ({
            questionId: r.question.id,
            selectedAnswer: r.selected,
            isCorrect: r.isCorrect,
            timeSpentSeconds: r.timeSpent,
          })),
          est,
        );
        setSessionId(id);
      } catch (e) {
        console.error('Failed to save diagnostic:', e);
      }
    }
  }

  function generatePlan() {
    if (!estimate) return;
    setPlan(
      buildStudyPlan({
        predictedTotal: estimate.total,
        perSection: estimate.perSection,
        weakTopicsBySection: weakTopics ?? undefined,
        targetTotal: target,
        weeksAvailable: targetDate ? weeksUntil(targetDate) : null,
      }),
    );
    setStep('plan');
    window.scrollTo(0, 0);
  }

  async function savePlanAndContinue() {
    if (!estimate || !plan) return;
    if (!user) {
      router.push('/plan');
      return;
    }
    setSaving(true);
    try {
      await saveStudyPlan(supabase, user.id, {
        estimate,
        plan,
        targetDate: targetDate || null,
        diagnosticSessionId: sessionId,
      });
      router.push('/plan');
    } catch (e) {
      console.error('Failed to save plan:', e);
      setSaving(false);
    }
  }

  if (step === 'test') {
    return <DiagnosticRunner questions={questions} onComplete={handleComplete} />;
  }

  if (step === 'intro') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Sparkles className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Diagnostic assessment</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Answer {questions.length} questions across all three sections. There&apos;s no feedback
            during the test — at the end you&apos;ll get a predicted GMAT Focus score and a
            personalized study plan toward your goal.
          </p>
          <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2 text-sm">
            {SECTIONS.map((s) => (
              <div key={s} className="rounded-lg bg-muted/50 p-3">
                <div className="text-lg font-bold tabular-nums">{countsBySection[s]}</div>
                <div className="text-xs text-muted-foreground">{SECTION_LABELS[s].split(' ')[0]}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setStep('test');
              window.scrollTo(0, 0);
            }}
            className="mt-6 inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90"
          >
            Start diagnostic <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'goal' && estimate) {
    const belowTarget = target <= estimate.total;
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Card className="p-6 text-center">
          <SectionLabel as="div">Predicted GMAT Focus score</SectionLabel>
          <div className="mt-1 text-5xl font-bold tabular-nums">{estimate.total}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            likely range {estimate.low}–{estimate.high} · based on {estimate.questionCount} questions
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3">
          {SECTIONS.map((s) => {
            const r = estimate.perSection[s];
            const colors = SECTION_COLORS[s];
            const pct = Math.max(0, Math.min(100, ((r.scaled - 60) / 30) * 100));
            return (
              <Card key={s} className="p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-medium">{SECTION_LABELS[s]}</h3>
                  <span className="text-sm font-bold tabular-nums">{r.scaled}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${colors.progressBar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.correct}/{r.total} correct · scaled 60–90
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Set your target</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the score you&apos;re aiming for and (optionally) a date. We&apos;ll build a plan
            to get you there.
          </p>

          <div className="mt-5 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Target total</span>
            <span className="text-3xl font-bold tabular-nums text-primary">{target}</span>
          </div>
          <input
            type="range"
            min={205}
            max={805}
            step={10}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            aria-label="Target score"
            className="mt-2 w-full accent-[var(--primary)]"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>205</span>
            <span>805</span>
          </div>

          <label className="mt-5 block text-sm">
            <span className="text-muted-foreground">Target date (optional)</span>
            <input
              type="date"
              min={today}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1 block rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </label>

          {belowTarget && (
            <p className="mt-3 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
              Your target is at or below your predicted score — we&apos;ll build a maintenance plan to
              keep you sharp and push a little higher.
            </p>
          )}

          <button
            type="button"
            onClick={generatePlan}
            className="mt-5 inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90"
          >
            Generate my plan <ArrowRight className="size-4" />
          </button>
        </Card>
      </div>
    );
  }

  if (step === 'plan' && estimate && plan) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Your study plan</h1>
        <PlanView
          plan={plan}
          predicted={{ total: estimate.total, low: estimate.low, high: estimate.high }}
          targetDate={targetDate || null}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={savePlanAndContinue}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save plan &amp; continue
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('goal');
              window.scrollTo(0, 0);
            }}
            className={cn('rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted')}
          >
            Adjust goal
          </button>
        </div>
      </div>
    );
  }

  return null;
}
