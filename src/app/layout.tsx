import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Nav } from '@/components/nav';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { OfflineSync } from '@/components/pwa/offline-sync';
import { InstallPrompt } from '@/components/pwa/install-prompt';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
// Display face for headings — gives the product its own voice (body stays Geist).
const spaceGrotesk = Space_Grotesk({ variable: '--font-space-grotesk', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GMAT Prep — Focus Edition practice',
  description:
    'Practice and learn for the GMAT Focus Edition: Quantitative Reasoning, Verbal Reasoning, and Data Insights.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'GMAT Prep' },
  icons: { apple: '/apple-touch-icon.png' },
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
          <Nav />
          <main className="flex-1">{children}</main>
          <ServiceWorkerRegister />
          <OfflineSync />
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
