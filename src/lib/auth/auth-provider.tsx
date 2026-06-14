'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  loading: boolean;
  supabase: SupabaseClient;
  isAnonymous: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/** Ensures every visitor has an auth identity. If there's no session, it
 *  silently creates an anonymous one so RLS (auth.uid()) works for guests; a
 *  magic-link sign-in later upgrades the same user and keeps their progress. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        if (active) {
          setUser(session.user);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      if (!active) return;
      if (error) console.error('Anonymous sign-in failed:', error.message);
      setUser(data?.user ?? null);
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthState>(
    () => ({ user, loading, supabase, isAnonymous: Boolean(user?.is_anonymous) }),
    [user, loading, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
