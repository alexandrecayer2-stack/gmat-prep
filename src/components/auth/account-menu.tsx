'use client';

import { useState } from 'react';
import { Check, LogOut, Mail, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';

export function AccountMenu() {
  const { user, isAnonymous, supabase, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const signedIn = Boolean(user) && !isAnonymous;

  async function send(kind: 'save' | 'signin') {
    if (!email.trim()) return;
    setState('sending');
    setError('');
    const emailRedirectTo = `${window.location.origin}/auth/callback`;
    const { error } =
      kind === 'save' && isAnonymous
        ? await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo })
        : await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo } });
    if (error) {
      setState('error');
      setError(error.message);
    } else {
      setState('sent');
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (loading) return <div className="size-9" aria-hidden />;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <UserRound className="size-4" />
        <span className="hidden max-w-[140px] truncate sm:inline">
          {signedIn ? user!.email : 'Guest'}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg">
            {signedIn ? (
              <>
                <div className="text-xs text-muted-foreground">Signed in as</div>
                <div className="truncate text-sm font-medium">{user!.email}</div>
                <button
                  type="button"
                  onClick={signOut}
                  className="mt-3 inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </>
            ) : state === 'sent' ? (
              <div className="text-sm">
                <div className="flex items-center gap-2 font-medium text-success">
                  <Check className="size-4" /> Check your email
                </div>
                <p className="mt-1 text-muted-foreground">
                  We sent a sign-in link to <span className="font-medium">{email}</span>. Click it to{' '}
                  {isAnonymous ? 'save your progress to this account' : 'sign in'}.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Local dev: the email appears in Mailpit at 127.0.0.1:54324.
                </p>
              </div>
            ) : (
              <>
                <div className="text-sm font-medium">
                  {isAnonymous ? 'Save your progress' : 'Sign in'}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isAnonymous
                    ? 'Add your email to keep your plan & history and sync across devices.'
                    : 'Get a magic link by email.'}
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                />
                {error && <p className="mt-1 text-xs text-danger">{error}</p>}
                <button
                  type="button"
                  disabled={state === 'sending'}
                  onClick={() => send('save')}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Mail className="size-4" /> {isAnonymous ? 'Email me a link' : 'Send magic link'}
                </button>
                {isAnonymous && (
                  <button
                    type="button"
                    onClick={() => send('signin')}
                    className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
                  >
                    Already have an account? Sign in instead
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
