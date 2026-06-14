import { describe, it, expect } from 'vitest';
import { allocateHours, buildStudyPlan, pointCost, recommendedIntensity } from './study-plan';
import type { Section } from './types';

const sections = (q: number, v: number, d: number): Record<Section, { scaled: number }> => ({
  quant: { scaled: q },
  verbal: { scaled: v },
  data_insights: { scaled: d },
});

describe('pointCost', () => {
  it('rises for higher target levels (diminishing returns)', () => {
    expect(pointCost(505)).toBeCloseTo(1.0, 5);
    expect(pointCost(655)).toBeGreaterThan(pointCost(555));
  });
});

describe('recommendedIntensity', () => {
  it('scales weekly hours with the gap', () => {
    expect(recommendedIntensity(0)).toBe(3);
    expect(recommendedIntensity(40)).toBe(5);
    expect(recommendedIntensity(250)).toBe(15);
  });
});

describe('allocateHours', () => {
  it('sums exactly to the weekly budget', () => {
    const a = allocateHours(8, [3, 1, 2]);
    expect(a.reduce((x, y) => x + y, 0)).toBe(8);
  });
  it('gives the most hours to the largest weight', () => {
    const a = allocateHours(10, [5, 1, 1]);
    expect(a[0]).toBeGreaterThan(a[1]);
    expect(a[0]).toBeGreaterThan(a[2]);
  });
  it('handles zero budget', () => {
    expect(allocateHours(0, [1, 2, 3])).toEqual([0, 0, 0]);
  });
});

describe('buildStudyPlan', () => {
  it('produces a maintenance plan when target <= predicted', () => {
    const plan = buildStudyPlan({
      predictedTotal: 645,
      perSection: sections(80, 78, 79),
      targetTotal: 600,
    });
    expect(plan.feasibility).toBe('maintenance');
    expect(plan.gap).toBeLessThanOrEqual(0);
    expect(plan.totalHours).toBe(0);
  });

  it('estimates hours and weeks for a real gap (no deadline)', () => {
    const plan = buildStudyPlan({
      predictedTotal: 505,
      perSection: sections(75, 75, 75),
      targetTotal: 605,
    });
    expect(plan.gap).toBe(100);
    expect(plan.totalHours).toBeGreaterThan(0);
    expect(plan.weeklyHours).toBeGreaterThan(0);
    expect(plan.weeksToGoal).toBeGreaterThan(0);
    const allocated = plan.sectionFocus.reduce((s, f) => s + f.weeklyHours, 0);
    expect(allocated).toBe(plan.weeklyHours);
  });

  it('directs the most weekly hours to the weakest section', () => {
    const plan = buildStudyPlan({
      predictedTotal: 505,
      perSection: sections(70, 82, 80), // quant weakest
      targetTotal: 655,
    });
    const quant = plan.sectionFocus.find((f) => f.section === 'quant')!;
    const others = plan.sectionFocus.filter((f) => f.section !== 'quant');
    for (const o of others) expect(quant.weeklyHours).toBeGreaterThanOrEqual(o.weeklyHours);
    expect(quant.status).toBe('focus');
  });

  it('flags a tight timeline and caps weekly hours', () => {
    const plan = buildStudyPlan({
      predictedTotal: 455,
      perSection: sections(70, 70, 70),
      targetTotal: 705,
      weeksAvailable: 3, // very short for a 250-pt gap
    });
    expect(['tight', 'very-tight']).toContain(plan.feasibility);
    expect(plan.weeklyHours).toBeLessThanOrEqual(25);
    expect(plan.weeksToGoal).toBe(3);
  });

  it('builds phased milestones for longer plans', () => {
    const plan = buildStudyPlan({
      predictedTotal: 505,
      perSection: sections(75, 75, 75),
      targetTotal: 655,
      weeksAvailable: 12,
    });
    expect(plan.phases.length).toBe(3);
    expect(plan.phases[0].weekStart).toBe(1);
    expect(plan.phases[plan.phases.length - 1].weekEnd).toBe(12);
  });
});
