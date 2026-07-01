'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarClock, ClipboardList, Sparkles, Target } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getReviewQueue, getUserStats } from '@/lib/data/attempts';
import { getActivePlan } from '@/lib/data/plans';
import { chooseNextAction, weakestTopic, type NextAction } from '@/lib/next-action';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';

interface Recommendation {
  icon: typeof Sparkles;
  title: string;
  body: string;
  href: string;
  cta: string;
}

/** Surfaces the single highest-leverage next action from the user's data:
 *  due reviews → diagnostic → weakest-area practice → mock. */
export function NextUpCard() {
  const { user, loading, supabase } = useAuth();
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    Promise.all([
      getReviewQueue(supabase, user.id),
      getUserStats(supabase, user.id),
      getActivePlan(supabase, user.id),
    ])
      .then(([queue, stats, plan]) => {
        if (!active) return;
        const now = Date.now();
        const dueIds = queue.filter((q) => new Date(q.dueAt).getTime() <= now).map((q) => q.questionId);
        const action = chooseNextAction({
          dueCount: dueIds.length,
          hasEstimate: !!stats.estimate,
          hasPlan: !!plan,
          weakest: weakestTopic(stats.byTopic),
        });
        setRec(toRecommendation(action, dueIds));
        setReady(true);
      })
      .catch(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [user, loading, supabase]);

  if (!ready || !rec) return null;
  const Icon = rec.icon;

  return (
    <Card className="animate-fade-in-up flex flex-wrap items-center justify-between gap-4 border-primary/30 bg-accent/30 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <SectionLabel as="div">Next up</SectionLabel>
          <div className="font-medium">{rec.title}</div>
          <div className="mt-0.5 max-w-md text-sm text-muted-foreground">{rec.body}</div>
        </div>
      </div>
      <Link
        href={rec.href}
        className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        {rec.cta} <ArrowRight className="size-4" />
      </Link>
    </Card>
  );
}

/** Map the decided next action to its card presentation. */
function toRecommendation(action: NextAction, dueIds: string[]): Recommendation {
  switch (action.kind) {
    case 'review':
      return {
        icon: CalendarClock,
        title: `Review ${action.dueCount} due question${action.dueCount === 1 ? '' : 's'}`,
        body: 'Spaced repetition resurfaced these — the highest-leverage thing to do right now.',
        href: `/practice/session?ids=${dueIds.slice(0, 100).join(',')}`,
        cta: 'Start review',
      };
    case 'diagnostic':
      return {
        icon: Sparkles,
        title: 'Take the diagnostic',
        body: 'Get a predicted GMAT Focus score and a personalized study plan in ~15 questions.',
        href: '/diagnostic',
        cta: 'Start',
      };
    case 'practice':
      return {
        icon: Target,
        title: `Practice ${action.weakest.topic}`,
        body: `Your weakest area — ${action.weakest.pct}% so far. A focused set will move your score most.`,
        href: `/practice/session?section=${action.weakest.section}&topic=${encodeURIComponent(action.weakest.topic)}&count=10`,
        cta: 'Practice',
      };
    case 'mock':
      return {
        icon: ClipboardList,
        title: 'Take a full mock exam',
        body: 'Simulate the real GMAT Focus under time, then review every question.',
        href: '/mock',
        cta: 'Start mock',
      };
  }
}
