'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudOff, Loader2, WifiOff } from 'lucide-react';
import type { Section } from '@/lib/domain/types';
import { parseMockConfig, type MockConfig } from '@/lib/domain/mock';
import { loadBank } from '@/lib/offline/bank';
import { selectMockQuestions, type MockSectionSet, type QuestionBank } from '@/lib/domain/selection';
import { MockSetup } from './mock-setup';
import { MockRunner } from './mock-runner';

type Status = 'loading' | 'ready' | 'running' | 'unavailable';

const MOCK_PARAMS = ['sections', 'length', 'difficulty', 'timed'];

function sectionCounts(bank: QuestionBank): Record<Section, number> {
  const counts = { quant: 0, verbal: 0, data_insights: 0 } as Record<Section, number>;
  for (const q of bank.questions) counts[q.section] += 1;
  return counts;
}

// Self-contained, client-rendered mock exam sourced from the cached bank. The
// exam, scoring, and results all run in MockRunner client-side already; the only
// online-only step (persisting the session) is queued and synced on reconnect.
export function OfflineMock() {
  const [status, setStatus] = useState<Status>('loading');
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [sections, setSections] = useState<MockSectionSet[]>([]);
  const [config, setConfig] = useState<MockConfig | null>(null);

  function run(bankData: QuestionBank, cfg: MockConfig) {
    const selected = selectMockQuestions(bankData, cfg);
    if (selected.length === 0) return;
    setSections(selected);
    setConfig(cfg);
    setStatus('running');
  }

  useEffect(() => {
    let cancelled = false;
    loadBank()
      .then((b) => {
        if (cancelled) return;
        setBank(b);
        const params = new URLSearchParams(window.location.search);
        // Seamless hand-off: if the URL carries a mock config, start immediately.
        if (MOCK_PARAMS.some((k) => params.has(k))) {
          run(b, parseMockConfig(Object.fromEntries(params.entries())));
        } else {
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading') {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">Loading your offline question bank…</p>
      </Centered>
    );
  }

  if (status === 'unavailable') {
    return (
      <Centered>
        <div className="rounded-full bg-muted p-4">
          <CloudOff className="h-8 w-8 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="mt-6 text-lg font-semibold">Questions aren&apos;t downloaded yet</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Open the app once while you have a connection to save the question bank to
          your device. After that, mock exams run fully offline — your score is shown
          at the end and the session syncs when you&apos;re back online.
        </p>
        <Link
          href="/mock"
          className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to mock setup
        </Link>
      </Centered>
    );
  }

  if (status === 'running' && config) {
    return <MockRunner sections={sections} config={config} />;
  }

  // ready — show the setup, sourced from the cached bank
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <WifiOff className="h-4 w-4" aria-hidden />
        Offline mode — your result will sync when you&apos;re back online.
      </div>
      <MockSetup counts={sectionCounts(bank!)} onStart={(cfg) => run(bank!, cfg)} />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      {children}
    </div>
  );
}
