'use client';

import { Check, X } from 'lucide-react';
import type { QuestionWithGroup, SelectedAnswer } from '@/lib/domain/types';
import { DS_CHOICES } from '@/lib/domain/constants';
import { cn } from '@/lib/utils';
import { InlineMarkdown } from '@/components/markdown';

export interface AnswerInputsProps {
  question: QuestionWithGroup;
  selected: SelectedAnswer;
  onChange: (next: SelectedAnswer) => void;
  revealed: boolean;
}

/** Renders the answer UI for whichever answer format the question uses. */
export function AnswerInputs(props: AnswerInputsProps) {
  switch (props.question.correctAnswer.format) {
    case 'single':
      return <SingleChoice {...props} />;
    case 'dropdowns':
      return <Dropdowns {...props} />;
    case 'two_part':
      return <TwoPart {...props} />;
    case 'dichotomous':
      return <Dichotomous {...props} />;
  }
}

function SingleChoice({ question, selected, onChange, revealed }: AnswerInputsProps) {
  const choices = question.type === 'data_sufficiency' ? DS_CHOICES : (question.choices ?? []);
  const sel = selected.format === 'single' ? selected.value : null;
  const correct = question.correctAnswer.format === 'single' ? question.correctAnswer.value : null;

  return (
    <ul role="radiogroup" aria-label="Answer choices" className="space-y-2">
      {choices.map((c) => {
        const isSel = sel === c.key;
        const isCorrect = correct === c.key;
        return (
          <li key={c.key}>
            <button
              type="button"
              role="radio"
              aria-checked={isSel}
              disabled={revealed}
              onClick={() => onChange({ format: 'single', value: c.key })}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                !revealed && isSel && 'border-primary bg-accent',
                !revealed && !isSel && 'border-border hover:border-primary/50 hover:bg-muted/50',
                revealed && isCorrect && 'border-success bg-success/10',
                revealed && !isCorrect && isSel && 'border-danger bg-danger/10',
                revealed && !isCorrect && !isSel && 'border-border opacity-60',
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  !revealed && isSel && 'border-primary bg-primary text-primary-foreground',
                  !revealed && !isSel && 'border-border text-muted-foreground',
                  revealed && isCorrect && 'border-success bg-success text-white',
                  revealed && !isCorrect && isSel && 'border-danger bg-danger text-white',
                  revealed && !isCorrect && !isSel && 'border-border text-muted-foreground',
                )}
              >
                {c.key}
              </span>
              <span className="flex-1 text-sm leading-relaxed">
                <InlineMarkdown>{c.text}</InlineMarkdown>
                {/* "Why this is wrong" — shown under each distractor once revealed,
                    only when the content provides a rationale for the choice. */}
                {revealed && !isCorrect && c.distractorRationale && (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    <InlineMarkdown>{c.distractorRationale}</InlineMarkdown>
                  </span>
                )}
              </span>
              {revealed && isCorrect && <Check className="size-5 shrink-0 text-success" />}
              {revealed && !isCorrect && isSel && <X className="size-5 shrink-0 text-danger" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Dropdowns({ question, selected, onChange, revealed }: AnswerInputsProps) {
  const blanks = question.assets?.dropdowns ?? [];
  const vals = selected.format === 'dropdowns' ? selected.value : {};
  const correct = question.correctAnswer.format === 'dropdowns' ? question.correctAnswer.value : {};

  return (
    <div className="space-y-3">
      {blanks.map((b) => {
        const v = vals[b.key] ?? '';
        const right = revealed && v === correct[b.key];
        return (
          <div key={b.key} className="rounded-lg border border-border p-3 text-sm leading-relaxed">
            {b.before && <span>{b.before} </span>}
            <select
              aria-label={b.label ?? b.key}
              value={v}
              disabled={revealed}
              onChange={(e) =>
                onChange({ format: 'dropdowns', value: { ...vals, [b.key]: e.target.value } })
              }
              className={cn(
                'mx-1 rounded-md border bg-card px-2 py-1 text-sm',
                revealed
                  ? right
                    ? 'border-success text-success'
                    : 'border-danger text-danger'
                  : 'border-border',
              )}
            >
              <option value="" disabled>
                Select…
              </option>
              {/* TODO: HTML <option> cannot host rich JSX, so KaTeX/Markdown
                  cannot render here. Dropdown values must stay plain text /
                  Unicode (e.g. "5/8", "x²"), never raw LaTeX. */}
              {b.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label ?? o.value}
                </option>
              ))}
            </select>
            {b.after && <span> {b.after}</span>}
            {revealed && !right && (
              <span className="ml-2 font-medium text-success">✓ {correct[b.key]}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TwoPart({ question, selected, onChange, revealed }: AnswerInputsProps) {
  const cols = question.assets?.twoPart?.columns ?? [];
  const opts = question.choices ?? [];
  const vals = selected.format === 'two_part' ? selected.value : {};
  const correct = question.correctAnswer.format === 'two_part' ? question.correctAnswer.value : {};

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60">
          <tr>
            {cols.map((c) => (
              <th key={c.key} className="w-28 px-3 py-2 text-center font-medium">
                {c.label}
              </th>
            ))}
            <th className="px-3 py-2 text-left font-medium">Option</th>
          </tr>
        </thead>
        <tbody>
          {opts.map((o) => (
            <tr key={o.key} className="border-t border-border">
              {cols.map((c) => {
                const checked = vals[c.key] === o.key;
                const isCorrect = revealed && correct[c.key] === o.key;
                const isWrong = revealed && checked && !isCorrect;
                return (
                  <td
                    key={c.key}
                    className={cn(
                      'px-3 py-2 text-center',
                      isCorrect && 'bg-success/15',
                      isWrong && 'bg-danger/15',
                    )}
                  >
                    <input
                      type="radio"
                      name={`tp-${question.id}-${c.key}`}
                      aria-label={`${c.label}: ${o.text}`}
                      checked={checked}
                      disabled={revealed}
                      onChange={() =>
                        onChange({ format: 'two_part', value: { ...vals, [c.key]: o.key } })
                      }
                      className="size-4 accent-[var(--primary)]"
                    />
                  </td>
                );
              })}
              <td className="px-3 py-2">
                <InlineMarkdown>{o.text}</InlineMarkdown>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dichotomous({ question, selected, onChange, revealed }: AnswerInputsProps) {
  const labels = question.assets?.dichotomous?.labels ?? ['Yes', 'No'];
  const statements = question.choices ?? [];
  const vals = selected.format === 'dichotomous' ? selected.value : {};
  const correct =
    question.correctAnswer.format === 'dichotomous' ? question.correctAnswer.value : {};

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60">
          <tr>
            {labels.map((l) => (
              <th key={l} className="w-16 px-2 py-2 text-center font-medium">
                {l}
              </th>
            ))}
            <th className="px-3 py-2 text-left font-medium">Statement</th>
          </tr>
        </thead>
        <tbody>
          {statements.map((s) => (
            <tr key={s.key} className="border-t border-border align-top">
              {labels.map((l) => {
                const checked = vals[s.key] === l;
                const isCorrect = revealed && correct[s.key] === l;
                const isWrong = revealed && checked && !isCorrect;
                return (
                  <td
                    key={l}
                    className={cn(
                      'px-2 py-2 text-center',
                      isCorrect && 'bg-success/15',
                      isWrong && 'bg-danger/15',
                    )}
                  >
                    <input
                      type="radio"
                      name={`di-${question.id}-${s.key}`}
                      aria-label={`${s.text}: ${l}`}
                      checked={checked}
                      disabled={revealed}
                      onChange={() =>
                        onChange({ format: 'dichotomous', value: { ...vals, [s.key]: l } })
                      }
                      className="size-4 accent-[var(--primary)]"
                    />
                  </td>
                );
              })}
              <td className="px-3 py-2">
                <InlineMarkdown>{s.text}</InlineMarkdown>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
