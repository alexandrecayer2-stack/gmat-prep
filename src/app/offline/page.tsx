import Link from 'next/link';
import { WifiOff } from 'lucide-react';

// Generic fallback the service worker serves when a never-cached route is opened
// with no connection. Practice/Mock have their own offline-capable path, so we
// point users there.
export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <div className="rounded-full bg-muted p-4">
        <WifiOff className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="mt-6 text-lg font-semibold">You&apos;re offline</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This page needs a connection. Your cached questions still work — jump back
        into practice and everything you&apos;ve loaded, including answers and
        explanations, is available offline.
      </p>
      <Link
        href="/practice"
        className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Go to practice
      </Link>
    </div>
  );
}
