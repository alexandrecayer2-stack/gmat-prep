import type { CorrectAnswer, SelectedAnswer } from './types';

// True when the selection matches the correct answer across every required part.
export function gradeAnswer(
  correct: CorrectAnswer,
  selected: SelectedAnswer | null | undefined,
): boolean {
  if (!selected || selected.format !== correct.format) return false;

  if (correct.format === 'single') {
    return (selected as { value: string | null }).value === correct.value;
  }

  const expected = correct.value as Record<string, string>;
  const got = ((selected as { value: Record<string, string> }).value ?? {}) as Record<
    string,
    string
  >;
  const keys = Object.keys(expected);
  if (keys.length === 0) return false;
  return keys.every((k) => got[k] === expected[k]);
}

// True when every required part is answered (gates the Submit button).
export function isAnswerComplete(
  correct: CorrectAnswer,
  selected: SelectedAnswer | null | undefined,
): boolean {
  if (!selected || selected.format !== correct.format) return false;

  if (correct.format === 'single') {
    return Boolean((selected as { value: string | null }).value);
  }

  const requiredKeys = Object.keys(correct.value as Record<string, string>);
  const got = ((selected as { value: Record<string, string> }).value ?? {}) as Record<
    string,
    string
  >;
  return requiredKeys.length > 0 && requiredKeys.every((k) => Boolean(got[k]));
}

// A blank selection of the right shape to seed the runner's local state.
export function emptySelection(correct: CorrectAnswer): SelectedAnswer {
  if (correct.format === 'single') return { format: 'single', value: null };
  return { format: correct.format, value: {} };
}
