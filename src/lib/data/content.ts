import { createClient } from '@/lib/supabase/server';
import type {
  Difficulty,
  LearnArticle,
  Question,
  QuestionGroup,
  QuestionType,
  QuestionWithGroup,
  Section,
} from '@/lib/domain/types';
import {
  mapGroup,
  mapLearnArticle,
  mapQuestion,
  type GroupRow,
  type LearnRow,
  type QuestionRow,
} from './mappers';

export interface QuestionFilter {
  section?: Section;
  types?: QuestionType[];
  difficulty?: Difficulty;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Keep grouped questions (RC / Multi-Source) contiguous and ordered, treat each
// standalone question as its own unit, then shuffle the units for variety.
function arrangeUnits(
  questions: Question[],
  groupsById: Record<string, QuestionGroup>,
): QuestionWithGroup[] {
  const grouped = new Map<string, Question[]>();
  const units: Question[][] = [];

  for (const q of questions) {
    if (q.groupId) {
      if (!grouped.has(q.groupId)) {
        const arr: Question[] = [];
        grouped.set(q.groupId, arr);
        units.push(arr); // preserve a stable slot for this group
      }
      grouped.get(q.groupId)!.push(q);
    } else {
      units.push([q]);
    }
  }

  for (const arr of grouped.values()) arr.sort((a, b) => a.orderIndex - b.orderIndex);

  return shuffle(units).flatMap((unit) =>
    unit.map((q) => ({
      ...q,
      group: q.groupId ? (groupsById[q.groupId] ?? null) : null,
    })),
  );
}

export async function getPracticeQuestions(filter: QuestionFilter): Promise<QuestionWithGroup[]> {
  const supabase = await createClient();

  let query = supabase.from('questions').select('*');
  if (filter.section) query = query.eq('section', filter.section);
  if (filter.types && filter.types.length) query = query.in('type', filter.types);
  if (filter.difficulty) query = query.eq('difficulty', filter.difficulty);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const questions = ((data ?? []) as unknown as QuestionRow[]).map(mapQuestion);

  const groupIds = [...new Set(questions.map((q) => q.groupId).filter(Boolean))] as string[];
  const groupsById: Record<string, QuestionGroup> = {};
  if (groupIds.length) {
    const { data: gdata, error: gerr } = await supabase
      .from('question_groups')
      .select('*')
      .in('id', groupIds);
    if (gerr) throw new Error(gerr.message);
    for (const g of ((gdata ?? []) as unknown as GroupRow[]).map(mapGroup)) groupsById[g.id] = g;
  }

  return arrangeUnits(questions, groupsById);
}

export async function getSectionCounts(): Promise<Record<Section, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('questions').select('section');
  if (error) throw new Error(error.message);
  const counts = { quant: 0, verbal: 0, data_insights: 0 } as Record<Section, number>;
  for (const row of (data ?? []) as { section: Section }[]) counts[row.section] += 1;
  return counts;
}

export async function getLearnArticles(section?: Section): Promise<LearnArticle[]> {
  const supabase = await createClient();
  let query = supabase
    .from('learn_articles')
    .select('*')
    .order('section', { ascending: true })
    .order('order_index', { ascending: true });
  if (section) query = query.eq('section', section);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as LearnRow[]).map(mapLearnArticle);
}
