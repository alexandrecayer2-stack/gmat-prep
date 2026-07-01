// Remembers the last lesson the user opened (client-only) so Learn and the
// dashboard can offer a one-click "continue". A tiny external store so readers
// can use useSyncExternalStore (SSR-safe, stable snapshots — no re-parse loop).

export interface LastLesson {
  chapterId: string;
  lessonId: string;
  title: string;
}

const KEY = 'gmat-last-lesson';

let listeners: (() => void)[] = [];
let cachedRaw: string | null = null;
let cachedVal: LastLesson | null = null;

export function subscribeLastLesson(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

/** Stable snapshot: only re-parses when the stored string actually changes. */
export function getLastLesson(): LastLesson | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedVal = raw ? (JSON.parse(raw) as LastLesson) : null;
    } catch {
      cachedVal = null;
    }
  }
  return cachedVal;
}

export function recordLastLesson(lesson: LastLesson): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lesson));
  } catch {
    return;
  }
  for (const fn of listeners) fn();
}
