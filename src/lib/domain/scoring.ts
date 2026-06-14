import type { Difficulty, Section } from './types';

// ---------------------------------------------------------------------------
// GMAT Focus score estimation from a short diagnostic.
//
// This is an honest ESTIMATE, not the proprietary GMAC algorithm. We weight
// answers by difficulty (getting hard questions right counts more), map that to
// a 60-90 section score, average the sections to a 205-805 total, and report a
// confidence range that narrows as the diagnostic gets longer.
// ---------------------------------------------------------------------------

export const DIFFICULTY_WEIGHT: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export const SECTION_SCORE_MIN = 60;
export const SECTION_SCORE_MAX = 90;
export const TOTAL_SCORE_MIN = 205;
export const TOTAL_SCORE_MAX = 805;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const clamp01 = (x: number) => clamp(x, 0, 1);
const roundTo10 = (x: number) => Math.round(x / 10) * 10;
const clampSection = (x: number) => clamp(Math.round(x), SECTION_SCORE_MIN, SECTION_SCORE_MAX);
// GMAT Focus totals run 205, 215, …, 805 (10-point steps starting at 205, so
// they end in 5). Snap to that grid rather than to plain multiples of 10.
const clampTotal = (x: number) =>
  clamp(TOTAL_SCORE_MIN + Math.round((x - TOTAL_SCORE_MIN) / 10) * 10, TOTAL_SCORE_MIN, TOTAL_SCORE_MAX);

export interface GradedItem {
  section: Section;
  difficulty: Difficulty;
  isCorrect: boolean;
  topic?: string;
}

export interface SectionResult {
  section: Section;
  correct: number;
  total: number;
  weightedAccuracy: number; // 0..1
  scaled: number; // 60..90
}

export interface DiagnosticEstimate {
  perSection: Record<Section, SectionResult>;
  total: number; // 205..805 (rounded to 10)
  low: number;
  high: number;
  questionCount: number;
}

/** Difficulty-weighted accuracy (0..1) -> section scaled score (60..90). */
export function sectionScaledFromWeightedAccuracy(weightedAccuracy: number): number {
  return clampSection(SECTION_SCORE_MIN + 30 * clamp01(weightedAccuracy));
}

/** Average of section scaled scores -> total (205..805, rounded to 10). */
export function totalFromSectionScaled(scaledScores: number[]): number {
  if (scaledScores.length === 0) return TOTAL_SCORE_MIN;
  const avg = scaledScores.reduce((a, b) => a + b, 0) / scaledScores.length;
  return clampTotal(TOTAL_SCORE_MIN + ((avg - SECTION_SCORE_MIN) / 30) * (TOTAL_SCORE_MAX - TOTAL_SCORE_MIN));
}

/** Inverse of the total mapping: the average section score a total implies. */
export function requiredSectionAvgForTotal(total: number): number {
  const clamped = clampTotal(total);
  return clampSection(
    SECTION_SCORE_MIN + ((clamped - TOTAL_SCORE_MIN) / (TOTAL_SCORE_MAX - TOTAL_SCORE_MIN)) * 30,
  );
}

const SECTIONS: Section[] = ['quant', 'verbal', 'data_insights'];

export function estimateDiagnostic(items: GradedItem[]): DiagnosticEstimate {
  const perSection = {} as Record<Section, SectionResult>;

  for (const section of SECTIONS) {
    const its = items.filter((i) => i.section === section);
    let earned = 0;
    let possible = 0;
    let correct = 0;
    for (const i of its) {
      const w = DIFFICULTY_WEIGHT[i.difficulty];
      possible += w;
      if (i.isCorrect) {
        earned += w;
        correct += 1;
      }
    }
    // A section with no items falls back to the midpoint rather than 0.
    const weightedAccuracy = possible > 0 ? earned / possible : 0.5;
    perSection[section] = {
      section,
      correct,
      total: its.length,
      weightedAccuracy,
      scaled: sectionScaledFromWeightedAccuracy(weightedAccuracy),
    };
  }

  const total = totalFromSectionScaled(SECTIONS.map((s) => perSection[s].scaled));
  const n = items.length;
  // Wider band for shorter diagnostics; ~±40 at 15 questions, ~±50 at 10.
  const margin = clamp(roundTo10(160 / Math.sqrt(Math.max(1, n))), 20, 90);

  return {
    perSection,
    total,
    low: clampTotal(total - margin),
    high: clampTotal(total + margin),
    questionCount: n,
  };
}
