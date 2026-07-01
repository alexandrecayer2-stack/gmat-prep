import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAttempt, type RecordAttemptInput } from '@/lib/data/attempts';

// Durable queue for attempts made while offline. Each entry is a full
// RecordAttemptInput; we flush them to Supabase (in order) once a connection is
// back, so the dashboard and review history stay accurate.

const KEY = 'gmat.offline.attempts.v1';

function read(): RecordAttemptInput[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecordAttemptInput[]) : [];
  } catch {
    return [];
  }
}

function write(items: RecordAttemptInput[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full / disabled — drop silently rather than throw mid-practice */
  }
}

export function enqueueAttempt(input: RecordAttemptInput): void {
  const items = read();
  items.push(input);
  write(items);
}

export function queuedCount(): number {
  return read().length;
}

let flushing = false;

/**
 * Flush queued attempts to Supabase, oldest first. Stops at the first failure
 * (likely still offline) and keeps the rest queued for the next attempt.
 * Returns the number successfully synced. Safe to call repeatedly.
 */
export async function flushAttempts(supabase: SupabaseClient): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  try {
    let items = read();
    let synced = 0;
    while (items.length > 0) {
      try {
        await recordAttempt(supabase, items[0]);
      } catch {
        break; // network back down — leave this and the rest for later
      }
      items = items.slice(1);
      write(items);
      synced += 1;
    }
    return synced;
  } finally {
    flushing = false;
  }
}
