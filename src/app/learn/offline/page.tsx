import type { Metadata } from 'next';
import { OfflineLearn } from '@/components/learn/offline-learn';

export const metadata: Metadata = { title: 'Offline lessons — GMAT Prep' };

// Self-contained, client-rendered Learn browser that reads chapters, lessons,
// and articles from the cached corpus — no server-data dependency, so the
// service worker can serve it offline. Reached by a hard navigation / precache.
export default function OfflineLearnPage() {
  return <OfflineLearn />;
}
