import type { Metadata } from 'next';
import { OfflinePractice } from '@/components/practice/offline-practice';

export const metadata: Metadata = { title: 'Offline practice — GMAT Prep' };

// Self-contained, client-rendered practice that reads questions from the cached
// bank. It has no server-data dependency, so the service worker can serve it
// with no connection. Reached by a hard navigation (see PracticeSetup) so it
// never relies on an RSC fetch that would fail offline.
export default function OfflinePracticePage() {
  return <OfflinePractice />;
}
