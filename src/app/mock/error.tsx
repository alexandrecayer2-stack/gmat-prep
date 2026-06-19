'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

// Next.js 16.2 passes `unstable_retry` to re-fetch and re-render the segment.
export default function MockError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('Mock exam failed to load:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">Couldn&apos;t load the mock exam</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We couldn&apos;t reach the question database. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
