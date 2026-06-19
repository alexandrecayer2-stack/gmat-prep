'use client';

import { useId, useRef, useState } from 'react';
import type { QuestionWithGroup } from '@/lib/domain/types';
import { Markdown } from '@/components/markdown';
import { ChartView } from '@/components/chart-view';
import { TableView } from '@/components/table-view';
import { cn } from '@/lib/utils';
import { SectionLabel } from '@/components/ui/section-label';

/** Renders everything ABOVE the answer inputs: shared passage/sources, a
 *  per-question stimulus, the stem, and any chart/table assets. */
export function QuestionPrompt({ question }: { question: QuestionWithGroup }) {
  const group = question.group;

  return (
    <div className="space-y-4">
      {group?.passage && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          {group.title && (
            <SectionLabel as="h3" className="mb-1">
              {group.title}
            </SectionLabel>
          )}
          <Markdown>{group.passage}</Markdown>
        </div>
      )}

      {group?.sources && group.sources.length > 0 && (
        <SourcesView title={group.title} sources={group.sources} />
      )}

      {question.passageOrStimulus && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <Markdown>{question.passageOrStimulus}</Markdown>
        </div>
      )}

      <div className="text-base">
        <Markdown>{question.stem}</Markdown>
      </div>

      {question.assets?.chart && <ChartView chart={question.assets.chart} />}
      {question.assets?.table && <TableView table={question.assets.table} />}
    </div>
  );
}

function SourcesView({
  title,
  sources,
}: {
  title?: string | null;
  sources: { title: string; content: string }[];
}) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onTabKeyDown(e: React.KeyboardEvent, i: number) {
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % sources.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + sources.length) % sources.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = sources.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      {title && (
        <SectionLabel as="div" className="border-b border-border px-4 py-2">
          {title}
        </SectionLabel>
      )}
      <div
        role="tablist"
        aria-label={title ?? 'Sources'}
        className="flex flex-wrap gap-1 border-b border-border p-2"
      >
        {sources.map((s, i) => (
          <button
            key={i}
            id={tabId(i)}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls={panelId}
            tabIndex={i === active ? 0 : -1}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={cn(
              'rounded-md px-3 py-1 text-sm transition-colors',
              i === active
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={tabId(active)}
        tabIndex={0}
        className="p-4"
      >
        <Markdown>{sources[active].content}</Markdown>
      </div>
    </div>
  );
}
