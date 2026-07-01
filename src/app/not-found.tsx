import Link from 'next/link';
import { Compass, Home } from 'lucide-react';

export const metadata = { title: 'Not found — GMAT Prep' };

const LINKS = [
  { href: '/practice', label: 'Practice' },
  { href: '/learn', label: 'Learn' },
  { href: '/mock', label: 'Mock Exam' },
  { href: '/review', label: 'Review' },
];

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <Compass className="size-7" />
      </div>
      <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        That page doesn&apos;t exist or has moved. Let&apos;s get you back on track.
      </p>
      <Link
        href="/"
        className="btn-brand mt-6 inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium"
      >
        <Home className="size-4" /> Back to dashboard
      </Link>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
