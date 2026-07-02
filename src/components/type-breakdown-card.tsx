import type { DiagnosticEstimate } from '@/lib/domain/scoring';
import { SECTIONS, SECTION_COLORS, SECTION_LABELS, QUESTION_TYPE_LABELS } from '@/lib/domain/constants';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';

/**
 * Per-question-type results vs. the user's estimated level, grouped by section.
 * Shared by the diagnostic and mock results. Samples can be small, so "Strong" /
 * "Focus" tags only show once a type has at least 2 questions and is clearly above
 * or below expectation.
 */
export function TypeBreakdownCard({ estimate }: { estimate: DiagnosticEstimate }) {
  const sections = SECTIONS.filter((s) => estimate.perSection[s].byType.length > 0);
  if (sections.length === 0) return null;
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Performance by question type</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        How you did on each format, and whether that&apos;s above or below your estimated level. Based
        on a few questions each — treat it as a first signal.
      </p>
      <div className="mt-4 space-y-5">
        {sections.map((s) => (
          <div key={s}>
            <SectionLabel as="div" className="mb-2">
              {SECTION_LABELS[s]}
            </SectionLabel>
            <ul className="space-y-2">
              {estimate.perSection[s].byType.map((t) => {
                const pct = Math.round(t.observedAccuracy * 100);
                const tag = t.total >= 2 && Math.abs(t.delta) >= 0.1 ? (t.delta > 0 ? 'strong' : 'weak') : null;
                return (
                  <li key={t.type} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 truncate text-sm sm:w-44">
                      {QUESTION_TYPE_LABELS[t.type]}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${SECTION_COLORS[s].progressBar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                      {t.correct}/{t.total}
                    </span>
                    <span className="w-16 shrink-0 text-right">
                      {tag === 'strong' && (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                          Strong
                        </span>
                      )}
                      {tag === 'weak' && (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                          Focus
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
