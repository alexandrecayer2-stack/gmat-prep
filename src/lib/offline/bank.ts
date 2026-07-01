import type { QuestionBank } from '@/lib/domain/selection';

// Thin client wrapper over /api/bank. The service worker persists the response
// (stale-while-revalidate), so once primed while online it resolves offline too.

const BANK_URL = '/api/bank';

// Warm the cache once, in the background, if the worker hasn't stored it yet.
// Avoids re-downloading the ~2.3 MB bank on every load (mobile data friendly);
// the offline page's own fetch triggers a background refresh when it's used.
export async function primeBank(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const hit = await caches.match(BANK_URL);
      if (hit) return;
    }
    await fetch(BANK_URL, { cache: 'no-store' });
  } catch {
    /* offline / not yet cacheable — nothing to do */
  }
}

// Load the bank for building an offline session. Resolves from the SW cache when
// offline; rejects if the bank has never been fetched online.
export async function loadBank(): Promise<QuestionBank> {
  const res = await fetch(BANK_URL);
  if (!res.ok) throw new Error(`bank unavailable (${res.status})`);
  return (await res.json()) as QuestionBank;
}
