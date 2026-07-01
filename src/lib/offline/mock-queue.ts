import type { DiagnosticEstimate } from '@/lib/domain/scoring';
import type { MockConfig } from '@/lib/domain/mock';
import type { MockAttempt } from '@/lib/data/mock';

// Durable queue for completed mock exams taken offline. Everything needed to
// recreate the session server-side (config, scored estimate, per-question
// attempts) is stored, then replayed to Supabase on reconnect. Storage only —
// the replay/insert lives in mock.ts to avoid an import cycle.

const KEY = 'gmat.offline.mocks.v1';

export interface QueuedMockSession {
  userId: string;
  config: MockConfig;
  estimate: DiagnosticEstimate;
  attempts: MockAttempt[];
}

export function readMockQueue(): QueuedMockSession[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedMockSession[]) : [];
  } catch {
    return [];
  }
}

export function writeMockQueue(items: QueuedMockSession[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full / disabled — drop silently rather than throw at exam end */
  }
}

export function enqueueMockSession(item: QueuedMockSession): void {
  const items = readMockQueue();
  items.push(item);
  writeMockQueue(items);
}

export function queuedMockCount(): number {
  return readMockQueue().length;
}
