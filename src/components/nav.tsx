'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
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

function SoonBadge() {
  return (
    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
      Soon
    </span>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4">
        <Link href="/" className="mr-3 shrink-0 font-semibold tracking-tight">
          GMAT<span className="text-primary"> Prep</span>
        </Link>

        {/* Desktop: horizontal links (≥ sm) */}
        <nav className="hidden items-center gap-0.5 text-sm sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 whitespace-nowrap transition-colors hover:bg-muted',
                isActive(l.href) ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {l.label}
              {l.soon && <SoonBadge />}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 pl-2">
          {/* Mobile: menu toggle (< sm) */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <AccountMenu />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile: drawer panel (< sm) */}
      {open && (
        <nav id="mobile-nav" className="border-t border-border bg-background sm:hidden">
          <ul className="mx-auto max-w-5xl px-2 py-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(l.href) ? 'page' : undefined}
                  className={cn(
                    'flex items-center rounded-md px-3 py-3 text-sm transition-colors hover:bg-muted',
                    isActive(l.href)
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {l.label}
                  {l.soon && <SoonBadge />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
