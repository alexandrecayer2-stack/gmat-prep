'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Fire a transient toast. No-ops safely if used outside the provider. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? { toast: () => {} };
}

const ICONS: Record<ToastKind, typeof Check> = {
  success: Check,
  error: AlertTriangle,
  info: Info,
};
const STYLES: Record<ToastKind, string> = {
  success: 'border-success/40 text-success',
  error: 'border-danger/40 text-danger',
  info: 'border-primary/40 text-primary',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = (nextId.current += 1);
      setToasts((t) => [...t, { id, message, kind }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              className={cn(
                'animate-fade-in-up pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-card p-3 text-sm shadow-lg shadow-black/10',
                STYLES[t.kind],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1 text-foreground">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
