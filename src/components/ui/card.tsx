import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type CardTag = 'div' | 'li' | 'section' | 'article';

/**
 * Standard content surface: rounded card with border and a single, consistent
 * elevation (`shadow-sm`). One source of truth so every content card matches.
 * Padding is left to the caller (it varies: p-4 / p-5 / p-6). Use `as` for
 * non-div surfaces (e.g. a card that must stay an `<li>` inside a list).
 */
export function Card({
  as: Component = 'div',
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: CardTag }) {
  return (
    <Component
      className={cn('rounded-xl border border-border bg-card shadow-sm', className)}
      {...props}
    />
  );
}
