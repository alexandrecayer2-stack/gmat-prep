import Link from 'next/link';
import type { StudyPlan } from '@/lib/domain/study-plan';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';

const FEASIBILITY: Record<string, { label: string; cls: string }> = {
  maintenance: { label: 'Maintenance', cls: 'bg-success/15 text-success' },
  comfortable: { label: 'Comfortable', cls: 'bg-success/15 text-success' },
  'on-track': { label: 'On track', cls: 'bg-primary/15 text-primary' },
  tight: { label: 'Tight', cls: 'bg-warning/15 text-warning' },
  'very-tight': { label: 'Very tight', cls: 'bg-danger/15 text-danger' },
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function PlanView({
  plan,
  predicted,
  targetDate,
}: {
  plan: StudyPlan;
  predicted: { total: number; low: number; high: number };
  targetDate?: string | null;
}) {
  const feas = FEASIBILITY[plan.feasibility] ?? FEASIBILITY['on-track'];

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionLabel as="div">Predicted → Target</SectionLabel>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">{predicted.total}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-2xl font-bold tabular-nums text-primary">{plan.targetTotal}</span>
              <span className="text-sm text-muted-foreground">
                ({plan.gap > 0 ? `+${plan.gap}` : plan.gap} pts)
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Predicted range {predicted.low}–{predicted.high}
            </div>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-sm font-medium', feas.cls)}>{feas.label}</span>
        </div>

        <p className="mt-3 text-sm">{plan.summary}</p>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Hours / week" value={`${plan.weeklyHours}`} />
          <Stat
            label={targetDate ? 'Weeks available' : 'Weeks to goal'}
            value={plan.weeksToGoal ? `${plan.weeksToGoal}` : '—'}
          />
          <Stat label="Total hours" value={plan.totalHours ? `~${plan.totalHours}` : '—'} />
        </div>
        {targetDate && (
          <div className="mt-2 text-center text-xs text-muted-foreground">Target date: {targetDate}</div>
        )}
      </Card>

      <div>
        <SectionLabel className="mb-2">Where to focus · {plan.weeklyHours} h/week</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-3">
          {plan.sectionFocus.map((f) => (
            <Card key={f.section} className="flex flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">{f.label}</h3>
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-xs font-medium',
                    f.status === 'focus'
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {f.status === 'focus' ? 'Focus' : 'Maintain'}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Now ~{f.currentScaled}/90 · <span className="font-medium text-foreground">{f.weeklyHours} h/wk</span>
              </div>
              {f.weakTopics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.weakTopics.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 flex-1 text-xs text-muted-foreground">{f.reason}</p>
              <div className="mt-3 flex gap-3 text-xs font-medium">
                <Link href={`/practice?section=${f.section}`} className="text-primary hover:underline">
                  Practice →
                </Link>
                <Link href="/learn" className="text-primary hover:underline">
                  Learn →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {plan.phases.length > 0 && (
        <div>
          <SectionLabel className="mb-2">Milestones</SectionLabel>
          <ol className="space-y-2">
            {plan.phases.map((p, i) => (
              <Card as="li" key={i} className="flex gap-3 p-4">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {p.name}{' '}
                    <span className="text-muted-foreground">
                      · {p.weekStart === p.weekEnd ? `week ${p.weekStart}` : `weeks ${p.weekStart}–${p.weekEnd}`}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">{p.focus}</div>
                </div>
              </Card>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
