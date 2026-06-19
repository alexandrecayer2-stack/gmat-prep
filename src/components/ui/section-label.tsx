import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tag = 'h1' | 'h2' | 'h3' | 'div' | 'span';

/**
 * Small uppercase muted intertitle used above content sections across the app.
 * One source of truth for the repeated
 * `text-xs font-semibold uppercase tracking-wide text-muted-foreground` recipe.
 */
export function SectionLabel({
  children,
  className,
  as: Component = 'h2',
}: {
  children: ReactNode;
  className?: string;
  as?: Tag;
}) {
  return (
    <Component
      className={cn(
        'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
    >
      {children}
    </Component>
  );
}
