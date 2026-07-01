'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

// Chrome/Android/desktop fire this before showing their own install UI; we stash
// it and trigger it from our own button. iOS Safari has no such event — it needs
// the manual "Share → Add to Home Screen" flow, so we detect iOS and show hints.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'gmat.installPrompt.dismissed.v1';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from the home screen.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

export function InstallPrompt() {
  // Hidden by default (both false) so nothing renders during SSR or before the
  // client-only capability probe runs — revealed only when an install path
  // exists. `closed` covers user-dismiss and post-install.
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed — nothing to prompt
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* storage disabled — proceed */
    }

    // iOS can't be auto-prompted; show the manual instructions instead. This is
    // a one-time, client-only platform probe with no event to key off of.
    if (isIOS()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowIOS(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop the mini-infobar; we present our own
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setShowIOS(false);
      setClosed(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    setClosed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  // Nothing to show unless we have an install path (Android/desktop event or iOS).
  if (closed || (!deferred && !showIOS)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-md items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
        <div className="mt-0.5 rounded-lg bg-accent p-1.5">
          <Download className="h-4 w-4 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Install GMAT Prep</p>
          {showIOS ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-label="Share" /> then
              “Add to Home Screen” to study offline like an app.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add it to your home screen for instant, offline-ready practice.
            </p>
          )}
          {!showIOS && (
            <button
              type="button"
              onClick={install}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Install
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
