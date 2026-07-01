'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { primeBank } from '@/lib/offline/bank';

// Registers the service worker and surfaces a "new version" prompt when an
// updated worker is waiting. Registration is production-only so it never fights
// the dev server's hot reload. Kept out of the render tree's critical path — it
// renders nothing until an update is actually available.
export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    let cancelled = false;

    // When the freshly-activated worker takes control, reload once so the page
    // is served by the new version.
    const onControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        if (cancelled) return;

        // Download the question bank into the cache (once) so practice works the
        // next time there's no connection.
        void primeBank();

        // A worker already waiting from a previous load.
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaiting(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const next = registration.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            // "installed" + an existing controller => this is an update, not the
            // first install. Offer the refresh.
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(next);
            }
          });
        });
      })
      .catch(() => {
        /* registration failures shouldn't break the app */
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
        <RefreshCw className="h-4 w-4 text-primary" aria-hidden />
        <span className="text-sm text-foreground">A new version is available.</span>
        <button
          type="button"
          onClick={() => waiting.postMessage('SKIP_WAITING')}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
