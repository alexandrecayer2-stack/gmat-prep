import type { MetadataRoute } from 'next';

// Web app manifest — makes the site installable ("Add to Home Screen") and gives
// it a native-app shell. Next serves this at /manifest.webmanifest and injects
// the <link rel="manifest"> automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GMAT Prep — Focus Edition',
    short_name: 'GMAT Prep',
    description:
      'Practice and learn for the GMAT Focus Edition — works offline once loaded.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f7f9',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
