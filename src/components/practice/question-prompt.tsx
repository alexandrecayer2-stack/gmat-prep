'use client';

import { useState } from 'react';
import type { QuestionWithGroup } from '@/lib/domain/types';
import { Markdown } from '@/components/markdown';
import { ChartView } from '@/components/chart-view';
import { TableView } from '@/components/table-view';
import { cn } from '@/lib/utils';

/** Renders everything ABOVE the answer inputs: shared passage/sources, a
 *  per-question stimulus, the stem, and any chart/table assets. */
export function QuestionPrompt({ question }: { question: QuestionWithGroup }) {
  const group = question.group;

  return (
    <div className="space-y-4">
      {group?.passage && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          {group.title && (
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h3>
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

      <div className="text-[15px]">
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

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
      {title && (
        <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
      )}
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border p-2">
        {sources.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
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
      <div className="p-4">
        <Markdown>{sources[active].content}</Markdown>
      </div>
    </div>
  );
}
