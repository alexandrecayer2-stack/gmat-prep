'use client';

import { useState } from 'react';
import { Check, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { funnel } from '@/lib/analytics';
import { Card } from '@/components/ui/card';

/**
 * Email capture shown on the diagnostic result screen — the peak-intent moment,
 * right after a visitor sees their predicted score. Reuses the same magic-link
 * flow as the account menu: `updateUser({ email })` attaches an email to the
 * anonymous user and sends a confirmation link, converting them to a permanent
 * account (and a reachable lead) without a password.
 *
 * Only anonymous visitors see it — signed-in users are already captured.
 */
export function SaveResultsCard() {
  const { isAnonymous, supabase, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  if (loading || !isAnonymous) return null;

  async function submit() {
    const value = email.trim();
    if (!value) return;
    setState('sending');
    setError('');
    const emailRedirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.updateUser({ email: value }, { emailRedirectTo });
    if (error) {
      setState('error');
      setError(error.message);
    } else {
      setState('sent');
      funnel.leadCaptured();
    }
  }

  if (state === 'sent') {
    return (
      <Card className="border-success/30 bg-success/5 p-5">
        <div className="flex items-center gap-2 font-medium text-success">
          <Check className="size-4" /> Check your email
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a link to <span className="font-medium">{email}</span>. Click it to save your
          results and study plan and keep your progress across devices.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="font-heading text-base font-semibold">Save your results</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Get your predicted score and study plan by email, and keep your progress across devices — no
        password needed.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="you@example.com"
          aria-label="Email address"
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={state === 'sending' || !email.trim()}
          onClick={submit}
          className="btn-brand inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="size-4" /> Email me my results
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </Card>
  );
}
