'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartAsset } from '@/lib/domain/types';

// Derived from the design-system tokens so charts match the rest of the UI and
// adapt to light/dark. recharts accepts CSS var() strings for fills/strokes.
const DEFAULT_COLORS = [
  'var(--primary)',
  'var(--success)',
  'var(--warning)',
  'var(--danger)',
  'var(--info)',
];

export function ChartView({ chart }: { chart: ChartAsset }) {
  const colorAt = (i: number) => chart.series[i]?.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
  const hasData = (chart.data?.length ?? 0) > 0 && chart.series.length > 0;
  const seriesLabels = chart.series.map((s) => s.label).join(', ');
  const chartLabel =
    `${chart.title ? `${chart.title}. ` : ''}${chart.type} chart` +
    (seriesLabels ? `. Series: ${seriesLabels}` : '') +
    (chart.xLabel ? `. Horizontal axis: ${chart.xLabel}` : '') +
    '.';

  const axisProps = {
    stroke: 'var(--muted-foreground)',
    fontSize: 12,
    tick: { fill: 'var(--muted-foreground)' },
  } as const;

  const tooltip = (
    <Tooltip
      contentStyle={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        color: 'var(--foreground)',
        fontSize: 12,
      }}
    />
  );

  return (
    <figure className="my-3 rounded-lg border border-border bg-card p-3">
      {chart.title && (
        <figcaption className="mb-2 text-center text-sm font-medium text-foreground">
          {chart.title}
        </figcaption>
      )}
      {!hasData ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No data to display.</p>
      ) : (
        <>
          <div role="img" aria-label={chartLabel}>
            <ResponsiveContainer width="100%" height={280}>
          {chart.type === 'bar' ? (
          <BarChart data={chart.data} margin={{ top: 8, right: 12, bottom: 16, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey={chart.xKey}
              label={chart.xLabel ? { value: chart.xLabel, position: 'insideBottom', offset: -8, fill: 'var(--muted-foreground)', fontSize: 12 } : undefined}
              {...axisProps}
            />
            <YAxis {...axisProps} />
            {tooltip}
            {chart.series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={colorAt(i)} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        ) : chart.type === 'line' ? (
          <LineChart data={chart.data} margin={{ top: 8, right: 12, bottom: 16, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={chart.xKey} {...axisProps} />
            <YAxis {...axisProps} />
            {tooltip}
            {chart.series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={colorAt(i)} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        ) : (
          <ScatterChart margin={{ top: 8, right: 12, bottom: 16, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number"
              dataKey={chart.xKey}
              name={chart.xLabel ?? chart.xKey}
              label={chart.xLabel ? { value: chart.xLabel, position: 'insideBottom', offset: -8, fill: 'var(--muted-foreground)', fontSize: 12 } : undefined}
              {...axisProps}
            />
            <YAxis
              type="number"
              dataKey={chart.series[0]?.key}
              name={chart.yLabel ?? chart.series[0]?.label}
              {...axisProps}
            />
            {tooltip}
            <Scatter data={chart.data} fill={colorAt(0)} />
          </ScatterChart>
        )}
            </ResponsiveContainer>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted-foreground">View data table</summary>
            <table className="mt-2 w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="py-1 pr-3 font-medium">
                    {chart.xLabel ?? chart.xKey}
                  </th>
                  {chart.series.map((s) => (
                    <th key={s.key} scope="col" className="py-1 pr-3 font-medium">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.data.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <th scope="row" className="py-1 pr-3 font-normal text-muted-foreground">
                      {String(row[chart.xKey] ?? '')}
                    </th>
                    {chart.series.map((s) => (
                      <td key={s.key} className="py-1 pr-3 tabular-nums">
                        {String(row[s.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </figure>
  );
}
