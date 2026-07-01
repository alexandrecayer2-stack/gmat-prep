import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAttempt, type RecordAttemptInput } from '@/lib/data/attempts';
import { enqueueAttempt, flushAttempts } from './attempt-queue';

/**
 * Offline-aware attempt save. Online it behaves exactly like recordAttempt
 * (and opportunistically drains any backlog first). If the insert fails —
 * offline, flaky network — the attempt is queued locally and synced later, so
 * practice never blocks on connectivity.
 */
export async function saveAttempt(
  supabase: SupabaseClient,
  input: RecordAttemptInput,
): Promise<void> {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  if (offline) {
    enqueueAttempt(input);
    return;
  }

  try {
    await recordAttempt(supabase, input);
    // We're online and just succeeded — good moment to drain earlier offline work.
    void flushAttempts(supabase);
  } catch {
    enqueueAttempt(input);
  }
}
