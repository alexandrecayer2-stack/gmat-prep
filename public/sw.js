/* GMAT Prep service worker — offline shell + question-bank caching.
 *
 * Bump CACHE_VERSION on every meaningful change to sw.js so old caches are
 * purged on activate. A new worker does NOT auto-activate: it waits until the
 * page tells it to (SKIP_WAITING), which is how the "new version available"
 * refresh prompt stays in the user's control. */
const CACHE_VERSION = 'v4';
const STATIC_CACHE = `gmat-static-${CACHE_VERSION}`; // hashed /_next assets, icons
const PAGES_CACHE = `gmat-pages-${CACHE_VERSION}`; // visited HTML documents
const BANK_CACHE = `gmat-bank-${CACHE_VERSION}`; // /api/bank + /api/learn payloads
const OFFLINE_URL = '/offline';

// Content endpoints cached offline-first (refreshed in the background).
const DATA_PATHS = ['/api/bank', '/api/learn'];

// Self-contained offline routes to precache so a cold offline launch works even
// for never-visited routes.
const PRECACHE_PAGES = [OFFLINE_URL, '/practice/offline', '/mock/offline', '/learn/offline'];
// Root-served static files the shell needs (not under /_next/static/).
const PRECACHE_STATIC = ['/manifest.webmanifest', '/icon-192.png', '/apple-touch-icon.png'];

// Precache a page's HTML *and every build asset it references* (CSS, JS chunks,
// fonts under /_next/static/). Without this the offline HTML loads but its
// stylesheet/scripts don't — the page renders unstyled. Assets are content-
// hashed and immutable, so caching them by URL is safe.
async function precachePage(url, pagesCache, staticCache) {
  try {
    const res = await fetch(url, { cache: 'reload' });
    if (!res || !res.ok) return;
    await pagesCache.put(url, res.clone());
    const html = await res.text();
    // Grab every /_next/static/*.{js,css,woff2,…} path from anywhere in the HTML
    // (tag attributes and the inline bootstrap/flight data alike).
    const assets = new Set();
    const re = /\/_next\/static\/[^"'`\s)]+?\.(?:js|css|woff2?|ttf|otf)/g;
    let m;
    while ((m = re.exec(html))) assets.add(m[0]);
    await Promise.allSettled(
      [...assets].map(async (a) => {
        if (await staticCache.match(a)) return;
        const r = await fetch(a);
        if (r && r.ok) await staticCache.put(a, r.clone());
      }),
    );
  } catch {
    /* offline at install time / asset fetch failed — best effort */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const [pagesCache, staticCache] = await Promise.all([
        caches.open(PAGES_CACHE),
        caches.open(STATIC_CACHE),
      ]);
      await Promise.allSettled([
        ...PRECACHE_PAGES.map((u) => precachePage(u, pagesCache, staticCache)),
        staticCache.addAll(PRECACHE_STATIC).catch(() => {}),
      ]);
    })(),
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

  // Content banks (questions, lessons): offline-first, refreshed in the background.
  if (DATA_PATHS.includes(url.pathname)) {
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
