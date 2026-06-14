'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { TableAsset } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

export function TableView({ table }: { table: TableAsset }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!sortKey) return table.rows;
    const col = table.columns.find((c) => c.key === sortKey);
    const numeric = col?.numeric ?? false;
    return [...table.rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = numeric
        ? Number(av) - Number(bv)
        : String(av).localeCompare(String(bv));
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [table.rows, table.columns, sortKey, dir]);

  function toggleSort(key: string) {
    if (!table.sortable) return;
    if (sortKey === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDir('asc');
    }
  }

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        {table.caption && (
          <caption className="bg-muted/50 px-3 py-2 text-left text-xs text-muted-foreground">
            {table.caption}
            {table.sortable && ' — click a column header to sort'}
          </caption>
        )}
        <thead className="bg-muted/60">
          <tr>
            {table.columns.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={cn(
                  'px-3 py-2 text-left font-medium text-foreground',
                  col.numeric && 'text-right',
                  table.sortable && 'cursor-pointer select-none hover:bg-muted',
                )}
              >
                <span className={cn('inline-flex items-center gap-1', col.numeric && 'flex-row-reverse')}>
                  {col.label}
                  {table.sortable &&
                    (sortKey === col.key ? (
                      dir === 'asc' ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3.5 opacity-40" />
                    ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {table.columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-3 py-2 text-foreground', col.numeric && 'text-right tabular-nums')}
                >
                  {typeof row[col.key] === 'number'
                    ? (row[col.key] as number).toLocaleString('en-US')
                    : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
