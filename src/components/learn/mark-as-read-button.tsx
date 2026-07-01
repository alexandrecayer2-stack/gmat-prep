'use client';

import { useEffect, useState } from 'react';
import { BookOpenCheck, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { getLessonProgressForUser, setLessonRead } from '@/lib/data/learn-progress';
import { cn } from '@/lib/utils';

/** Toggle for marking a lesson's body as read. Persists per-user via the
 *  read sentinel in user_lesson_progress (no schema change). */
export function MarkAsReadButton({ lessonId }: { lessonId: string }) {
  const { user, loading } = useAuth();
  const [read, setRead] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    getLessonProgressForUser(user.id)
      .then((list) => {
        if (active) {
          setRead(list.find((p) => p.lessonId === lessonId)?.read ?? false);
          setReady(true);
        }
      })
      .catch(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [user, loading, lessonId]);

  if (!loading && !user) return null;

  async function toggle() {
    if (!user || saving) return;
    const next = !read;
    setSaving(true);
    setRead(next); // optimistic
    try {
      await setLessonRead(lessonId, next);
    } catch (e) {
      console.error('Failed to update read state:', e);
      setRead(!next); // revert
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving || !ready}
      aria-pressed={read}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60',
        read
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {read ? <Check className="size-4" /> : <BookOpenCheck className="size-4" />}
      {read ? 'Read' : 'Mark as read'}
    </button>
  );
}
