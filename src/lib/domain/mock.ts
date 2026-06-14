import type { Section } from './types';
import { SECTIONS, SECTION_QUESTION_COUNT, SECTION_MINUTES } from './constants';

// ---------------------------------------------------------------------------
// Mock Exam configuration. Pure, framework-free logic so it can be unit-tested
// and shared between the setup UI, the session page (URL <-> config), and the
// runner. Scoring itself is delegated to scoring.ts (estimateDiagnostic).
// ---------------------------------------------------------------------------

export type MockLength = 'full' | 'short';
export type MockDifficulty = 'balanced' | 'easy' | 'medium' | 'hard';

export interface MockConfig {
  /** Sections to include, always stored in canonical order (Quant→Verbal→DI). */
  sections: Section[];
  length: MockLength;
  difficulty: MockDifficulty;
  /** 45 minutes per section when true; untimed practice-exam when false. */
  timed: boolean;
}

// A "short" section is 10 questions; "full" mirrors the real GMAT Focus counts.
export const MOCK_SHORT_COUNT = 10;

export const DEFAULT_MOCK_CONFIG: MockConfig = {
  sections: [...SECTIONS],
  length: 'full',
  difficulty: 'balanced',
  timed: true,
};

export const MOCK_DIFFICULTY_LABELS: Record<MockDifficulty, string> = {
  balanced: 'Balanced',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/** How many questions to draw for a section under the given length. */
export function targetCount(section: Section, length: MockLength): number {
  return length === 'full' ? SECTION_QUESTION_COUNT[section] : MOCK_SHORT_COUNT;
}

/** Section time budget in seconds (0 when untimed). */
export function sectionSeconds(section: Section, timed: boolean): number {
  return timed ? SECTION_MINUTES[section] * 60 : 0;
}

/** Total questions the configured exam will draw (best case; capped by the bank). */
export function plannedQuestionCount(config: MockConfig): number {
  return config.sections.reduce((n, s) => n + targetCount(s, config.length), 0);
}

// ---- URL <-> config ----
// The setup page navigates to /mock/session with these params; the server page
// parses them back. Parsing is defensive: anything unexpected falls back to the
// default so a hand-edited URL can never crash the runner.

export function serializeMockConfig(config: MockConfig): Record<string, string> {
  return {
    sections: config.sections.join(','),
    length: config.length,
    difficulty: config.difficulty,
    timed: config.timed ? '1' : '0',
  };
}

export function parseMockConfig(sp: {
  sections?: string;
  length?: string;
  difficulty?: string;
  timed?: string;
}): MockConfig {
  const requested = (sp.sections?.split(',') ?? []).filter((s): s is Section =>
    SECTIONS.includes(s as Section),
  );
  // Canonical order regardless of how they arrived; fall back to all sections.
  const ordered = SECTIONS.filter((s) => requested.includes(s));

  const difficulty: MockDifficulty =
    sp.difficulty === 'easy' || sp.difficulty === 'medium' || sp.difficulty === 'hard'
      ? sp.difficulty
      : 'balanced';

  return {
    sections: ordered.length ? ordered : [...SECTIONS],
    length: sp.length === 'short' ? 'short' : 'full',
    difficulty,
    timed: sp.timed !== '0',
  };
}
