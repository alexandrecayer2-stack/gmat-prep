'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { funnel } from '@/lib/analytics';

const SITE_URL = 'https://gmat-prep-nine.vercel.app';

/**
 * "Share my score" on the diagnostic results — turns a proud predicted score into
 * word-of-mouth. Native share sheet on mobile; clipboard copy as the desktop
 * fallback. Every share carries a link back to the free diagnostic.
 */
export function ShareScoreButton({ score }: { score: number }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    funnel.scoreShared();
    const text = `My predicted GMAT Focus score is ${score}. Get yours free in 15 minutes:`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'My predicted GMAT score', text, url: SITE_URL });
      } catch {
        // Share sheet dismissed or unsupported payload — nothing to do.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(`${text} ${SITE_URL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently ignore.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted"
    >
      {copied ? (
        <>
          <Check className="size-4 text-success" /> Copied link
        </>
      ) : (
        <>
          <Share2 className="size-4" /> Share my score
        </>
      )}
    </button>
  );
}
