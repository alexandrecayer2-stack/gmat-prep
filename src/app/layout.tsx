import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Analytics } from '@/components/analytics/analytics';
import { Nav } from '@/components/nav';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { OfflineSync } from '@/components/pwa/offline-sync';
import { InstallPrompt } from '@/components/pwa/install-prompt';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
// Display face for headings — gives the product its own voice (body stays Geist).
const spaceGrotesk = Space_Grotesk({ variable: '--font-space-grotesk', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://gmat-prep-nine.vercel.app'),
  title: 'GMAT Prep — Focus Edition practice',
  description:
    'Practice and learn for the GMAT Focus Edition: Quantitative Reasoning, Verbal Reasoning, and Data Insights.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'GMAT Prep' },
  icons: { apple: '/apple-touch-icon.png' },
  // Social share preview (the `opengraph-image`/`twitter-image` routes supply the image).
  openGraph: {
    title: 'Predict your GMAT score — free',
    description:
      'A free 15-minute adaptive diagnostic predicts your GMAT Focus score and builds a study plan. 1,400+ practice questions with instant explanations.',
    url: 'https://gmat-prep-nine.vercel.app',
    siteName: 'GMAT Prep',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Predict your GMAT score — free',
    description:
      'Free 15-minute adaptive diagnostic + 1,400+ practice questions with instant explanations.',
  },
};

// Address-bar / status-bar tint, matched to the app in light and dark.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4f46e5' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0e1a' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[120] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
          >
            Skip to content
          </a>
          <Nav />
          <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <ServiceWorkerRegister />
          <OfflineSync />
          <InstallPrompt />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
