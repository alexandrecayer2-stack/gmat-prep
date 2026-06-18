'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/** Thin scroll-linked reading-progress bar pinned to the top of the viewport. */
export function ReadingProgress({ className }: { className?: string }) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(100, (doc.scrollTop / max) * 100) : 0;
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px]" aria-hidden="true">
      <div ref={fillRef} className={cn('h-full w-0', className)} />
    </div>
  );
}
