import type { Metadata } from 'next';
import { OfflineMock } from '@/components/mock/offline-mock';

export const metadata: Metadata = { title: 'Offline mock exam — GMAT Prep' };

// Self-contained, client-rendered mock exam that reads questions from the cached
// bank — no server-data dependency, so the service worker can serve it offline.
// Reached by a hard navigation (see MockSetup) so it never relies on an RSC
// fetch that would fail offline.
export default function OfflineMockPage() {
  return <OfflineMock />;
}
