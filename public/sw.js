/* GMAT Prep service worker — offline shell + question-bank caching.
 *
 * Bump CACHE_VERSION on every meaningful change to sw.js so old caches are
 * purged on activate. A new worker does NOT auto-activate: it waits until the
 * page tells it to (SKIP_WAITING), which is how the "new version available"
 * refresh prompt stays in the user's control. */
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `gmat-static-${CACHE_VERSION}`; // hashed /_next assets, icons
const PAGES_CACHE = `gmat-pages-${CACHE_VERSION}`; // visited HTML documents
const BANK_CACHE = `gmat-bank-${CACHE_VERSION}`; // /api/bank question payload
const OFFLINE_URL = '/offline';

// Best-effort precache of the offline fallback and the self-contained offline
// practice route, so a cold offline launch works even for never-visited routes.
const PRECACHE_PAGES = [OFFLINE_URL, '/practice/offline', '/mock/offline'];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE_PAGES.map((url) => cache.add(url))))
      .catch(() => {}),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('gmat-') && !k.endsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// The page posts this once the user accepts the update prompt.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

// Network-first for page navigations: always prefer fresh, fall back to the
// last-good copy of that page, then the generic offline page.
async function navigationHandler(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never touch non-GET (attempt inserts, auth token refresh) — must hit network.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Let cross-origin requests (Supabase REST/auth, fonts CDN) pass straight
  // through — we never cache another origin's API responses.
  if (url.origin !== self.location.origin) return;

  // The full question bank: offline-first, refreshed in the background.
  if (url.pathname === '/api/bank') {
    event.respondWith(staleWhileRevalidate(request, BANK_CACHE));
    return;
  }

  // Immutable, content-hashed build assets and static icons/fonts.
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML document loads.
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Everything else (incl. RSC data fetches) goes to network untouched — caching
  // those by URL alone risks serving an RSC payload where HTML is expected.
});
