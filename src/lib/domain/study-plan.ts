import type { Section } from './types';
import { SECTION_LABELS } from './constants';
import { requiredSectionAvgForTotal } from './scoring';

// ---------------------------------------------------------------------------
// Deterministic study-plan generator. Given a predicted score, per-section
// scaled scores, a target, and (optionally) a deadline, it produces a weekly
// hour budget, a per-section focus split, and phased milestones. All heuristics
// are transparent and unit-tested — no external API.
// ---------------------------------------------------------------------------

const SECTIONS: Section[] = ['quant', 'verbal', 'data_insights'];
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round5 = (x: number) => Math.round(x / 5) * 5;

export type Feasibility = 'maintenance' | 'comfortable' | 'on-track' | 'tight' | 'very-tight';

export interface SectionFocus {
  section: Section;
  label: string;
  currentScaled: number;
  liftNeeded: number;
  weeklyHours: number;
  status: 'focus' | 'maintain';
  weakTopics: string[];
  reason: string;
}

export interface PlanPhase {
  name: string;
  weekStart: number;
  weekEnd: number;
  focus: string;
}

export interface StudyPlan {
  predictedTotal: number;
  targetTotal: number;
  gap: number;
  requiredSectionAvg: number;
  totalHours: number;
  weeklyHours: number;
  weeksToGoal: number;
  weeksAvailable: number | null;
  feasibility: Feasibility;
  sectionFocus: SectionFocus[];
  phases: PlanPhase[];
  summary: string;
}

export interface BuildPlanInput {
  predictedTotal: number;
  perSection: Record<Section, { scaled: number }>;
  weakTopicsBySection?: Partial<Record<Section, string[]>>;
  targetTotal: number;
  weeksAvailable?: number | null;
}

/** Study hours per total-point of improvement; gains get pricier at the top. */
export function pointCost(level: number): number {
  return 1.0 + (Math.max(0, level - 555) / 100) * 0.7;
}

/** Recommended weekly intensity when no deadline is given. */
export function recommendedIntensity(gap: number): number {
  if (gap <= 0) return 3;
  if (gap <= 50) return 5;
  if (gap <= 120) return 8;
  if (gap <= 200) return 12;
  return 15;
}

/** Largest-remainder rounding so integer hours sum exactly to the weekly budget. */
export function allocateHours(weeklyHours: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weeklyHours <= 0 || sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (weeklyHours * w) / sum);
  const floored = raw.map((r) => Math.floor(r));
  let remaining = weeklyHours - floored.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floored];
  for (let k = 0; k < order.length && remaining > 0; k++, remaining--) result[order[k].i] += 1;
  return result;
}

function feasibilityFor(gap: number, requiredWeekly: number | null): Feasibility {
  if (gap <= 0) return 'maintenance';
  if (requiredWeekly === null) return 'on-track';
  if (requiredWeekly <= 6) return 'comfortable';
  if (requiredWeekly <= 12) return 'on-track';
  if (requiredWeekly <= 20) return 'tight';
  return 'very-tight';
}

function buildPhases(weeks: number, topFocusLabel: string): PlanPhase[] {
  if (weeks <= 0) return [];
  if (weeks <= 2) {
    return [{ name: 'Focused sprint', weekStart: 1, weekEnd: weeks, focus: `Timed drills with emphasis on ${topFocusLabel}` }];
  }
  const p1 = Math.max(1, Math.round(weeks * 0.4));
  const p2 = Math.max(p1 + 1, Math.round(weeks * 0.8));
  return [
    { name: 'Foundations', weekStart: 1, weekEnd: p1, focus: `Learn cards + easy/medium drills, emphasis on ${topFocusLabel}` },
    { name: 'Build & drill', weekStart: p1 + 1, weekEnd: p2, focus: 'Medium/hard practice across focus sections; mixed sets' },
    { name: 'Mock & polish', weekStart: p2 + 1, weekEnd: weeks, focus: 'Full timed mock exams + hardest questions; review every error' },
  ];
}

export function buildStudyPlan(input: BuildPlanInput): StudyPlan {
  const predictedTotal = input.predictedTotal;
  const targetTotal = input.targetTotal;
  const gap = targetTotal - predictedTotal;
  const requiredSectionAvg = requiredSectionAvgForTotal(targetTotal);
  const weeksAvailable = input.weeksAvailable ?? null;

  const totalHours = gap > 0 ? round5(gap * pointCost((predictedTotal + targetTotal) / 2)) : 0;

  let weeklyHours: number;
  let weeksToGoal: number;
  let requiredWeekly: number | null = null;

  if (weeksAvailable && weeksAvailable > 0) {
    requiredWeekly = totalHours > 0 ? Math.ceil(totalHours / weeksAvailable) : 3;
    weeklyHours = clamp(requiredWeekly, 3, 25);
    weeksToGoal = weeksAvailable;
  } else {
    weeklyHours = recommendedIntensity(gap);
    weeksToGoal = gap > 0 ? Math.max(1, Math.ceil(totalHours / weeklyHours)) : 0;
  }

  const feasibility = feasibilityFor(gap, requiredWeekly);

  // Per-section lift needed to reach the target's implied section average.
  const lifts = SECTIONS.map((s) => Math.max(0, requiredSectionAvg - input.perSection[s].scaled));
  const anyLift = lifts.some((l) => l > 0);
  // If already at/above target, bias remaining time toward the weakest sections.
  const weights = anyLift
    ? lifts
    : SECTIONS.map((s) => Math.max(1, 90 - input.perSection[s].scaled));
  const hours = allocateHours(weeklyHours, weights);

  const sectionFocus: SectionFocus[] = SECTIONS.map((s, i) => {
    const liftNeeded = Math.round(lifts[i]);
    const status: SectionFocus['status'] = liftNeeded > 0 ? 'focus' : 'maintain';
    const weakTopics = input.weakTopicsBySection?.[s] ?? [];
    return {
      section: s,
      label: SECTION_LABELS[s],
      currentScaled: input.perSection[s].scaled,
      liftNeeded,
      weeklyHours: hours[i],
      status,
      weakTopics,
      reason:
        status === 'focus'
          ? `Needs about +${liftNeeded} to reach a ${Math.round(requiredSectionAvg)} section score — your biggest lever.`
          : 'Already at or above target level — light maintenance to stay sharp.',
    };
  });

  const ordered = [...sectionFocus].sort((a, b) => b.weeklyHours - a.weeklyHours);
  const topFocusLabel = ordered[0]?.label ?? SECTION_LABELS.quant;
  const phases = buildPhases(weeksToGoal, topFocusLabel);

  const summary =
    gap <= 0
      ? `You're already projected at or above ${targetTotal}. This plan keeps you sharp at about ${weeklyHours} h/week, focusing on your weakest area (${topFocusLabel}).`
      : `Closing a ${gap}-point gap to ${targetTotal} takes roughly ${totalHours} hours. At ${weeklyHours} h/week that's about ${weeksToGoal} week${weeksToGoal === 1 ? '' : 's'}, led by ${topFocusLabel}.`;

  return {
    predictedTotal,
    targetTotal,
    gap,
    requiredSectionAvg: Math.round(requiredSectionAvg),
    totalHours,
    weeklyHours,
    weeksToGoal,
    weeksAvailable,
    feasibility,
    sectionFocus,
    phases,
    summary,
  };
}
