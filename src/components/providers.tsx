'use client';

import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { ToastProvider } from '@/components/ui/toast';
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <ToastProvider>
          {children}
          <KeyboardShortcuts />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
