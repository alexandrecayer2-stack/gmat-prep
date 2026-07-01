'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Sparkles, Target, X, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';

const DISMISS_KEY = 'gmat-onboarding-dismissed';

// A tiny external store so dismissal reads from localStorage SSR-safely (no
// hydration flash, no setState-in-effect) and re-renders when dismissed.
let listeners: (() => void)[] = [];
const subscribe = (cb: () => void) => {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
};
const isDismissed = () =>
  typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_KEY) === '1';
function dismissStore() {
  try {
    window.localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // ignore storage failures
  }
  for (const l of listeners) l();
}

const STEPS = [
  { icon: Sparkles, title: 'Take the diagnostic', body: '~15 questions → your predicted GMAT Focus score.', href: '/diagnostic', cta: 'Start' },
  { icon: Target, title: 'Get your study plan', body: 'A week-by-week plan toward your target score.', href: '/plan', cta: 'View' },
  { icon: Zap, title: 'Practice weak areas', body: 'Targeted sets with instant explanations.', href: '/practice', cta: 'Practice' },
  { icon: ClipboardList, title: 'Simulate the real exam', body: 'A full timed mock, then a detailed review.', href: '/mock', cta: 'Mock' },
];

/** One-time, dismissible "getting started" guide. Hidden once dismissed. */
export function OnboardingCard() {
  // Server + first client paint return `true` (hidden) so there's no flash; the
  // real localStorage value is read after hydration.
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);

  if (dismissed) return null;

  return (
    <Card className="animate-fade-in-up relative border-primary/30 bg-accent/30 p-5">
      <button
        type="button"
        onClick={dismissStore}
        aria-label="Dismiss getting-started guide"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <h2 className="font-heading text-lg font-semibold">New here? Here&apos;s the fastest path</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Four steps from &ldquo;where am I?&rdquo; to exam-ready. Start with the diagnostic.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                className="group flex h-full items-start gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="text-muted-foreground">{i + 1}.</span> {s.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{s.body}</span>
                </span>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
