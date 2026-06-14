import type { SupabaseClient } from '@supabase/supabase-js';
import type { DiagnosticEstimate } from '@/lib/domain/scoring';
import type { StudyPlan } from '@/lib/domain/study-plan';

export interface SavedPlan {
  id: string;
  predictedTotal: number;
  predictedLow: number;
  predictedHigh: number;
  predictedSections: DiagnosticEstimate['perSection'];
  targetTotal: number;
  targetDate: string | null;
  weeklyHours: number;
  weeksToGoal: number | null;
  plan: StudyPlan;
  createdAt: string;
}

interface StudyPlanRow {
  id: string;
  predicted_total: number;
  predicted_low: number;
  predicted_high: number;
  predicted_sections: DiagnosticEstimate['perSection'];
  target_total: number;
  target_date: string | null;
  weekly_hours: number;
  weeks_to_goal: number | null;
  plan: StudyPlan;
  created_at: string;
}

export async function saveStudyPlan(
  supabase: SupabaseClient,
  userId: string,
  args: {
    estimate: DiagnosticEstimate;
    plan: StudyPlan;
    targetDate?: string | null;
    diagnosticSessionId?: string | null;
  },
): Promise<string> {
  // Only one active plan at a time.
  await supabase
    .from('study_plans')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  const { data, error } = await supabase
    .from('study_plans')
    .insert({
      user_id: userId,
      diagnostic_session_id: args.diagnosticSessionId ?? null,
      predicted_total: args.estimate.total,
      predicted_low: args.estimate.low,
      predicted_high: args.estimate.high,
      predicted_sections: args.estimate.perSection,
      target_total: args.plan.targetTotal,
      target_date: args.targetDate ?? null,
      weekly_hours: args.plan.weeklyHours,
      weeks_to_goal: args.plan.weeksToGoal,
      plan: args.plan,
      is_active: true,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function getActivePlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<SavedPlan | null> {
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as StudyPlanRow;
  return {
    id: row.id,
    predictedTotal: row.predicted_total,
    predictedLow: row.predicted_low,
    predictedHigh: row.predicted_high,
    predictedSections: row.predicted_sections,
    targetTotal: row.target_total,
    targetDate: row.target_date,
    weeklyHours: row.weekly_hours,
    weeksToGoal: row.weeks_to_goal,
    plan: row.plan,
    createdAt: row.created_at,
  };
}
