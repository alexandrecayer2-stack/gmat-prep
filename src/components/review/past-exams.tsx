'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, ClipboardList, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import {
  getExamAttempts,
  getExamSessions,
  type ExamAttemptItem,
  type ExamSession,
} from '@/lib/data/mock';
import { SECTIONS, SECTION_SHORT, SECTION_LABELS, DIFFICULTY_LABELS, QUESTION_TYPE_LABELS } from '@/lib/domain/constants';
import type { Section } from '@/lib/domain/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { ReviewQuestionDetail } from './review-question-detail';

function examDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
const plainStem = (s: string) => s.replace(/\$([^$]*)\$/g, '$1').replace(/[*_`#>{}\\]/g, '').replace(/\s+/g, ' ').trim();

/** Past mock exams and diagnostics: score, section breakdown, and a per-question
 *  review of each. Collapsible; hidden when the user has no completed exams. */
export function PastExams() {
  const { user, loading, supabase } = useAuth();
  const [sessions, setSessions] = useState<ExamSession[] | null>(null);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    getExamSessions(supabase, user.id)
      .then((s) => active && setSessions(s))
      .catch(() => active && setSessions([]));
    return () => {
      active = false;
    };
  }, [user, loading, supabase]);

  if (!sessions || sessions.length === 0) return null;

  return (
    <Card className="mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <ClipboardList className="size-5 text-primary" />
          <div>
            <SectionLabel as="div">Past exams</SectionLabel>
            <div className="text-sm text-muted-foreground">
              {sessions.length} completed · latest score {sessions[0].total}
            </div>
          </div>
        </div>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                aria-expanded={expandedId === s.id}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {s.type === 'diagnostic' ? <Sparkles className="size-4" /> : <ClipboardList className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium capitalize">
                    {s.type} · {examDate(s.completedAt)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.questionCount} questions · likely {s.low}–{s.high}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-heading text-lg font-bold tabular-nums">{s.total}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">score</div>
                </div>
                <ChevronDown
                  className={cn('size-4 shrink-0 text-muted-foreground transition-transform', expandedId === s.id && 'rotate-180')}
                />
              </button>
              {expandedId === s.id && <ExamDetail session={s} />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ExamDetail({ session }: { session: ExamSession }) {
  const { user, loading, supabase } = useAuth();
  const [attempts, setAttempts] = useState<ExamAttemptItem[] | null>(null);
  const [openQ, setOpenQ] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    getExamAttempts(supabase, session.id)
      .then((a) => active && setAttempts(a))
      .catch(() => active && setAttempts([]));
    return () => {
      active = false;
    };
  }, [user, loading, supabase, session.id]);

  const perSection = session.perSection as Record<Section, { scaled: number; correct: number; total: number } | undefined>;

  return (
    <div className="border-t border-border bg-muted/20 p-4">
      {/* Section breakdown */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {SECTIONS.map((s) => {
          const r = perSection?.[s];
          return (
            <div key={s} className="rounded-lg bg-card p-2.5 text-center">
              <div className="text-xs text-muted-foreground">{SECTION_SHORT[s]}</div>
              <div className="font-heading text-base font-bold tabular-nums">{r?.scaled ?? '—'}</div>
              {r && (
                <div className="text-[10px] text-muted-foreground">
                  {r.correct}/{r.total} correct
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Per-question review */}
      {attempts === null ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted/40" />
      ) : (
        <ul className="space-y-1.5">
          {attempts.map((a, i) => {
            const open = openQ === a.questionId;
            return (
              <li key={a.questionId + i} className="rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setOpenQ(open ? null : a.questionId)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2.5 p-2.5 text-left"
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full',
                      a.isCorrect ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                    )}
                  >
                    {a.isCorrect ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', !open && 'truncate')}>{plainStem(a.stem)}</p>
                    <div className="text-xs text-muted-foreground">
                      {SECTION_LABELS[a.section]} · {QUESTION_TYPE_LABELS[a.type]} · {DIFFICULTY_LABELS[a.difficulty]}
                    </div>
                  </div>
                  <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                </button>
                {open && (
                  <div className="border-t border-border p-3">
                    <ReviewQuestionDetail questionId={a.questionId} selectedAnswer={a.selectedAnswer} isCorrect={a.isCorrect} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
