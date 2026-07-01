'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-provider';
import { flushAttempts } from '@/lib/offline/attempt-queue';

// Drains the offline attempt queue to Supabase whenever we're (back) online and
// a user is signed in: once on mount and again on every `online` event. Renders
// nothing.
export function OfflineSync() {
  const { user, supabase } = useAuth();

  useEffect(() => {
    if (!user) return;

    const sync = () => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        void flushAttempts(supabase);
      }
    };

    sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [user, supabase]);

  return null;
}
