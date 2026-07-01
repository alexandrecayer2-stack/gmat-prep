import Link from 'next/link';
import { BookOpen, Dumbbell, Timer, WifiOff } from 'lucide-react';

// Generic fallback the service worker serves when a never-cached route is opened
// with no connection. Practice, Mock, and Learn each have their own
// offline-capable route (hard-navigated, so the worker can serve them), so this
// hub points users straight at them.
const OFFLINE_LINKS = [
  { href: '/practice/offline', label: 'Practice', hint: 'Questions with full explanations', Icon: Dumbbell },
  { href: '/mock/offline', label: 'Mock exam', hint: 'Timed, scored, reviewed', Icon: Timer },
  { href: '/learn/offline', label: 'Lessons', hint: 'Read the material', Icon: BookOpen },
];

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <WifiOff className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="mt-6 text-lg font-semibold">You&apos;re offline</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This page needs a connection — but everything you&apos;ve downloaded still
        works, including answers and explanations. Pick up where you left off:
      </p>
      <div className="mt-6 w-full space-y-3 text-left">
        {OFFLINE_LINKS.map(({ href, label, hint, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/50 hover:bg-muted/50"
          >
            <span className="rounded-lg bg-accent p-2">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
