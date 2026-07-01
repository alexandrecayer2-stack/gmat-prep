import type { LearnBank } from '@/lib/data/learn-bank';

// Thin client wrapper over /api/learn. The service worker persists the response,
// so once primed online it resolves offline too.

const LEARN_URL = '/api/learn';

export async function primeLearn(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const hit = await caches.match(LEARN_URL);
      if (hit) return;
    }
    await fetch(LEARN_URL, { cache: 'no-store' });
  } catch {
    /* offline / not yet cacheable */
  }
}

export async function loadLearn(): Promise<LearnBank> {
  const res = await fetch(LEARN_URL);
  if (!res.ok) throw new Error(`learn content unavailable (${res.status})`);
  return (await res.json()) as LearnBank;
}
