/**
 * Thin, dependency-free wrapper over PostHog (loaded from the CDN in
 * `components/analytics/analytics.tsx`). Every call no-ops safely when analytics
 * isn't configured (no `NEXT_PUBLIC_POSTHOG_KEY`) or on the server, so events can
 * be sprinkled anywhere without guards at the call site.
 */

type Props = Record<string, unknown>;

interface PostHogLike {
  capture: (event: string, properties?: Props) => void;
  identify: (id: string, properties?: Props) => void;
}

// PostHog attaches itself to `window.posthog` once the CDN script loads.
function ph(): PostHogLike | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { posthog?: PostHogLike }).posthog ?? null;
}

/** Capture an arbitrary product event. Safe no-op when analytics is off. */
export function track(event: string, props?: Props): void {
  ph()?.capture(event, props);
}

/** Tie the current (anonymous) session to a stable id, e.g. on account sign-up. */
export function identify(userId: string, props?: Props): void {
  ph()?.identify(userId, props);
}

/**
 * The monetization funnel, top → bottom. Keep these event names stable —
 * PostHog funnels and insights key off the exact strings.
 */
export const funnel = {
  diagnosticStarted: () => track('diagnostic_started'),
  diagnosticCompleted: (p: { predicted: number; low: number; high: number; questions: number }) =>
    track('diagnostic_completed', p),
  planGenerated: (p: { target: number }) => track('plan_generated', p),
  leadCaptured: () => track('lead_captured'),
  scoreShared: () => track('score_shared'),
  practiceStarted: (section?: string) => track('practice_started', { section }),
  mockStarted: () => track('mock_started'),
};
