import type { Difficulty, QuestionType, Section } from './types';

// ---------------------------------------------------------------------------
// GMAT Focus score estimation via a lightweight Item Response Theory (IRT) model.
//
// This is an honest ESTIMATE, not GMAC's proprietary algorithm — but it belongs
// to the same family of model the real adaptive GMAT uses. Each question has a
// latent DIFFICULTY: the ability level at which a test-taker has a 50% chance of
// answering it correctly. We then find the ABILITY that best explains a given
// pattern of right/wrong answers, weighting each answer by how informative it is:
// getting a hard question right is strong evidence of high ability; getting an
// easy one wrong is strong evidence against it. The estimate is reported with a
// confidence range derived from the statistical information in the answers — the
// range narrows as more (and more on-level) questions are answered.
//
// Everything works in "section-score units" — the 60-90 GMAT Focus section scale
// — so abilities and difficulties live on the same axis as the reported score.
// One difficulty tier (easy→medium→hard) is ~LOGIT_POINTS points apart, which is
// ~1 logit: a test-taker at their own level gets ~73% on the tier below them and
// ~27% on the tier above — the classic adaptive-test profile.
// ---------------------------------------------------------------------------

export const SECTION_SCORE_MIN = 60;
export const SECTION_SCORE_MAX = 90;
export const TOTAL_SCORE_MIN = 205;
export const TOTAL_SCORE_MAX = 805;

// Total-score points per one section-score point (205-805 spans 600 over a 30-pt
// section range): used to convert a section-score standard error into a total one.
const TOTAL_PER_SECTION_POINT = (TOTAL_SCORE_MAX - TOTAL_SCORE_MIN) / (SECTION_SCORE_MAX - SECTION_SCORE_MIN);

// Section-score points that correspond to one logit on the ability scale.
const LOGIT_POINTS = 5;
// Slope of the logistic in 1/section-point units (1PL/Rasch: discrimination = 1).
const SLOPE = 1 / LOGIT_POINTS;

// Item difficulty by tier, in section-score units. Anchored to the project's own
// calibration (easy ≈ 500-level, medium ≈ 600, hard ≈ 700+ on the total scale,
// which map to ~75 / 80 / 85 on the 60-90 section scale). "Difficulty" here is the
// ability at which P(correct) = 50%, so to score above ~85 you must get HARD items
// right — acing only easy/medium questions correctly tops out in the low 80s.
export const DIFFICULTY_B: Record<Difficulty, number> = {
  easy: 75,
  medium: 80,
  hard: 85,
};

// A small, honest residual added to the difficulty tier, capturing FORMAT overhead
// that easy/medium/hard doesn't fully express (e.g. Data Sufficiency's abstract
// sufficiency logic, or Multi-Source Reasoning's multi-tab synthesis). Positive =
// harder than the tier alone implies. Kept small (≤1.5 pts ≈ 0.3 logit) so the
// difficulty tier stays the dominant signal — these are tunable nudges, not the
// main driver. This is what makes question TYPE, not just difficulty, move the
// estimate.
export const TYPE_DIFFICULTY_OFFSET: Record<QuestionType, number> = {
  problem_solving: 0,
  reading_comprehension: 0,
  critical_reasoning: 0.5,
  data_sufficiency: 1.5,
  graphics_interpretation: 0.5,
  table_analysis: 0.5,
  two_part_analysis: 1,
  multi_source_reasoning: 1.5,
};

// Prior over ability: a neutral "average test-taker" centred in the middle of the
// band, with enough spread that a handful of answers quickly outweigh it but a
// single answer can't swing the estimate wildly. This replaces the old "no data →
// 75" hack with a proper Bayesian prior that also feeds the confidence range.
const PRIOR_MEAN = 75; // ≈ 505 total
const PRIOR_SD = 4; // section-score points
const PRIOR_PRECISION = 1 / (PRIOR_SD * PRIOR_SD);

// Width of the reported "likely range": ±1.3 SE ≈ an 80% interval. Wide enough to
// usually contain the true score, tight enough to stay useful.
const LIKELY_RANGE_Z = 1.3;

// How fast older answers fade when estimating from a whole history, measured in
// QUESTIONS rather than calendar time: after this many more-recent answers, a
// response counts half as much. This keeps a "current level" estimate tracking
// your recent form (the best predictor of a future score) without discarding the
// past outright. Single-sitting estimates (diagnostic, mock) leave weights at 1.
export const RECENCY_HALF_LIFE_QUESTIONS = 60;

/** Weight for one response given how many more-recent responses exist (0..1]. */
export function recencyWeight(newerResponses: number, halfLife = RECENCY_HALF_LIFE_QUESTIONS): number {
  return 0.5 ** (Math.max(0, newerResponses) / halfLife);
}

// Difficulty weights kept for the back-compat "weighted accuracy" display stat
// (no longer the scoring driver — the IRT model is).
export const DIFFICULTY_WEIGHT: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const clamp01 = (x: number) => clamp(x, 0, 1);
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const clampSection = (x: number) => clamp(x, SECTION_SCORE_MIN, SECTION_SCORE_MAX);
const clampSectionRound = (x: number) => Math.round(clampSection(x));
// GMAT Focus totals run 205, 215, …, 805 (10-point steps starting at 205, so they
// end in 5). Snap to that grid rather than to plain multiples of 10.
const clampTotal = (x: number) =>
  clamp(TOTAL_SCORE_MIN + Math.round((x - TOTAL_SCORE_MIN) / 10) * 10, TOTAL_SCORE_MIN, TOTAL_SCORE_MAX);

export interface GradedItem {
  section: Section;
  difficulty: Difficulty;
  isCorrect: boolean;
  type?: QuestionType;
  topic?: string;
  // Relative influence of this response on the estimate (default 1). Used to fade
  // older answers when estimating from a long history; see recencyWeight().
  weight?: number;
}

/** Effective item difficulty (section-score units): tier + question-type offset. */
export function itemDifficulty(difficulty: Difficulty, type?: QuestionType): number {
  return DIFFICULTY_B[difficulty] + (type ? TYPE_DIFFICULTY_OFFSET[type] : 0);
}

/** Probability a test-taker of the given ability answers an item correctly. */
export function probabilityCorrect(ability: number, difficulty: Difficulty, type?: QuestionType): number {
  return sigmoid(SLOPE * (ability - itemDifficulty(difficulty, type)));
}

export interface AbilityEstimate {
  ability: number; // θ̂ in section-score units (continuous)
  scaled: number; // θ̂ clamped to 60-90 and rounded — the reported section score
  standardError: number; // SE of θ̂ in section-score units
  correct: number;
  total: number;
}

/**
 * Maximum-a-posteriori ability from a set of graded items, via Newton-Raphson on
 * the penalised log-likelihood. The 1PL log-likelihood plus a Gaussian prior is
 * strictly concave, so the maximum is unique and a few iterations converge. With
 * no items the estimate is exactly the prior mean (a sensible "average" default)
 * with a wide standard error.
 */
export function estimateAbility(items: GradedItem[]): AbilityEstimate {
  let correct = 0;
  for (const it of items) if (it.isCorrect) correct += 1;

  let theta = PRIOR_MEAN;
  for (let iter = 0; iter < 30; iter++) {
    let grad = -(theta - PRIOR_MEAN) * PRIOR_PRECISION; // prior pull toward the mean
    let info = PRIOR_PRECISION; // prior precision
    for (const it of items) {
      const w = it.weight ?? 1;
      const p = sigmoid(SLOPE * (theta - itemDifficulty(it.difficulty, it.type)));
      grad += w * ((it.isCorrect ? 1 : 0) - p) * SLOPE;
      info += w * p * (1 - p) * SLOPE * SLOPE;
    }
    const step = grad / info;
    theta = clamp(theta + step, SECTION_SCORE_MIN - 5, SECTION_SCORE_MAX + 5);
    if (Math.abs(step) < 1e-5) break;
  }

  // Posterior precision = (weighted) Fisher information at θ̂ + prior precision → SE.
  let info = PRIOR_PRECISION;
  for (const it of items) {
    const w = it.weight ?? 1;
    const p = sigmoid(SLOPE * (theta - itemDifficulty(it.difficulty, it.type)));
    info += w * p * (1 - p) * SLOPE * SLOPE;
  }

  return {
    ability: theta,
    scaled: clampSectionRound(theta),
    standardError: 1 / Math.sqrt(info),
    correct,
    total: items.length,
  };
}

export interface TypeBreakdown {
  type: QuestionType;
  correct: number;
  total: number;
  observedAccuracy: number; // correct / total
  expectedAccuracy: number; // model's P(correct) at the section ability for these items
  delta: number; // observed − expected: >0 = stronger than your level, <0 = weaker
}

/**
 * Per-type accuracy compared with what the model expects at the estimated ability.
 * `delta` surfaces where someone over- or under-performs their own level — far
 * more useful than a raw percentage, which mostly reflects how hard that type's
 * items happened to be. Sorted weakest (most below expectation) first.
 */
export function typeBreakdown(items: GradedItem[], ability: number): TypeBreakdown[] {
  const acc = new Map<QuestionType, { correct: number; total: number; expSum: number }>();
  const clamped = clampSection(ability);
  for (const it of items) {
    if (!it.type) continue;
    const e = acc.get(it.type) ?? { correct: 0, total: 0, expSum: 0 };
    e.total += 1;
    if (it.isCorrect) e.correct += 1;
    e.expSum += sigmoid(SLOPE * (clamped - itemDifficulty(it.difficulty, it.type)));
    acc.set(it.type, e);
  }
  return [...acc.entries()]
    .map(([type, e]) => {
      const observedAccuracy = e.correct / e.total;
      const expectedAccuracy = e.expSum / e.total;
      return { type, correct: e.correct, total: e.total, observedAccuracy, expectedAccuracy, delta: observedAccuracy - expectedAccuracy };
    })
    .sort((a, b) => a.delta - b.delta);
}

export interface SectionResult {
  section: Section;
  correct: number;
  total: number;
  weightedAccuracy: number; // back-compat display stat (difficulty-weighted observed accuracy)
  scaled: number; // estimated section score, 60-90
  ability: number; // θ̂ before rounding/clamping to the reported integer
  standardError: number; // SE of the section estimate, in section-score points
  byType: TypeBreakdown[];
}

export interface DiagnosticEstimate {
  perSection: Record<Section, SectionResult>;
  total: number; // 205-805 (snapped to the 10-pt grid)
  low: number;
  high: number;
  standardError: number; // SE of the total estimate, in total-score points
  questionCount: number;
}

/** Difficulty-weighted observed accuracy (0..1) — a display stat, not the model. */
function weightedObservedAccuracy(items: GradedItem[]): number {
  let earned = 0;
  let possible = 0;
  for (const it of items) {
    const w = DIFFICULTY_WEIGHT[it.difficulty];
    possible += w;
    if (it.isCorrect) earned += w;
  }
  return possible > 0 ? earned / possible : 0.5;
}

const SECTIONS: Section[] = ['quant', 'verbal', 'data_insights'];

export function estimateDiagnostic(items: GradedItem[]): DiagnosticEstimate {
  const perSection = {} as Record<Section, SectionResult>;

  for (const section of SECTIONS) {
    const its = items.filter((i) => i.section === section);
    const est = estimateAbility(its);
    perSection[section] = {
      section,
      correct: est.correct,
      total: est.total,
      weightedAccuracy: weightedObservedAccuracy(its),
      scaled: est.scaled,
      ability: est.ability,
      standardError: est.standardError,
      byType: typeBreakdown(its, est.ability),
    };
  }

  const total = totalFromSectionScaled(SECTIONS.map((s) => clampSection(perSection[s].ability)));

  // Sections are estimated independently, so the variance of their average is the
  // mean of their variances over 3; convert that SE into total-score points.
  const varOfAverage = SECTIONS.reduce((sum, s) => sum + perSection[s].standardError ** 2, 0) / (SECTIONS.length * SECTIONS.length);
  const standardError = Math.sqrt(varOfAverage) * TOTAL_PER_SECTION_POINT;
  const margin = LIKELY_RANGE_Z * standardError;

  return {
    perSection,
    total,
    low: clampTotal(total - margin),
    high: clampTotal(total + margin),
    standardError,
    questionCount: items.length,
  };
}

// ---------------------------------------------------------------------------
// Section ↔ total mapping (unchanged: still a linear map across the bands).
// ---------------------------------------------------------------------------

/** Legacy linear map: difficulty-weighted accuracy (0..1) → section score (60-90).
 *  Retained for callers/anchoring; the IRT model is the live estimator. */
export function sectionScaledFromWeightedAccuracy(weightedAccuracy: number): number {
  return clampSectionRound(SECTION_SCORE_MIN + 30 * clamp01(weightedAccuracy));
}

/** Average of section scaled scores → total (205-805, snapped to the 10-pt grid). */
export function totalFromSectionScaled(scaledScores: number[]): number {
  if (scaledScores.length === 0) return TOTAL_SCORE_MIN;
  const avg = scaledScores.reduce((a, b) => a + b, 0) / scaledScores.length;
  return clampTotal(TOTAL_SCORE_MIN + ((avg - SECTION_SCORE_MIN) / 30) * (TOTAL_SCORE_MAX - TOTAL_SCORE_MIN));
}

/** Inverse of the total mapping: the average section score a total implies. */
export function requiredSectionAvgForTotal(total: number): number {
  const clamped = clampTotal(total);
  return clampSectionRound(
    SECTION_SCORE_MIN + ((clamped - TOTAL_SCORE_MIN) / (TOTAL_SCORE_MAX - TOTAL_SCORE_MIN)) * 30,
  );
}
