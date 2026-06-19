'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { AccountMenu } from '@/components/auth/account-menu';
import { cn } from '@/lib/utils';

const LINKS: { href: string; label: string; soon?: boolean }[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/plan', label: 'Plan' },
  { href: '/practice', label: 'Practice' },
  { href: '/learn', label: 'Learn' },
  { href: '/mock', label: 'Mock Exam' },
  { href: '/review', label: 'Review', soon: true },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
        <Link href="/" className="mr-3 shrink-0 font-semibold tracking-tight">
          GMAT<span className="text-primary"> Prep</span>
        </Link>
        <nav className="flex items-center gap-0.5 overflow-x-auto text-sm">
          {LINKS.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-md px-3 py-1.5 whitespace-nowrap transition-colors hover:bg-muted',
                  active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {l.label}
                {l.soon && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 pl-2">
          <AccountMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
