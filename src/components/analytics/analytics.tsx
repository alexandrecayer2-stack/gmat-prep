'use client';

import { useEffect } from 'react';

/**
 * Loads PostHog from its CDN and initialises it — but only when a key is
 * configured. With no `NEXT_PUBLIC_POSTHOG_KEY` this renders nothing and loads
 * nothing, so dev and un-configured deploys are completely unaffected.
 *
 * The library is loaded by hand (rather than the `posthog-js` npm package) so the
 * integration adds zero build-time dependencies.
 *
 * To turn it on: create a free project at posthog.com, then set
 *   NEXT_PUBLIC_POSTHOG_KEY   (Project API key, starts `phc_…`)
 *   NEXT_PUBLIC_POSTHOG_HOST  (optional — EU users: https://eu.i.posthog.com)
 * in `.env.local` and in Vercel (Production + Preview scopes).
 */
export function Analytics() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    const w = window as unknown as {
      posthog?: { __loaded?: boolean; init: (k: string, o: Record<string, unknown>) => void };
    };
    if (w.posthog?.__loaded) return; // already initialised (e.g. after fast refresh)

    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
    const assetHost = process.env.NEXT_PUBLIC_POSTHOG_ASSETS || 'https://us-assets.i.posthog.com';

    const script = document.createElement('script');
    script.src = `${assetHost}/static/array.js`;
    script.async = true;
    script.onload = () => {
      w.posthog?.init(key, {
        api_host: apiHost,
        person_profiles: 'identified_only',
        capture_pageview: 'history_change',
        capture_pageleave: true,
      });
    };
    document.head.appendChild(script);
  }, []);

  return null;
}
