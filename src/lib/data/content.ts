import { createClient } from '@/lib/supabase/server';
import type {
  Difficulty,
  LearnArticle,
  LearnChapter,
  LearnLesson,
  Question,
  QuestionGroup,
  QuestionType,
  QuestionWithGroup,
  Section,
} from '@/lib/domain/types';
import {
  mapChapter,
  mapGroup,
  mapLearnArticle,
  mapLesson,
  mapQuestion,
  type ChapterRow,
  type GroupRow,
  type LearnRow,
  type LessonRow,
  type QuestionRow,
} from './mappers';
import { targetCount, type MockConfig } from '@/lib/domain/mock';

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

// Pick up to `n` items from a section, spread across difficulties.
function pickSpread(items: Question[], n: number): Question[] {
  const buckets: Record<Difficulty, Question[]> = { easy: [], medium: [], hard: [] };
  for (const q of items) buckets[q.difficulty].push(q);
  (['easy', 'medium', 'hard'] as Difficulty[]).forEach((d) => shuffle(buckets[d]));
  const order: Difficulty[] = ['medium', 'easy', 'hard'];
  const picked: Question[] = [];
  let progressed = true;
  while (picked.length < n && progressed) {
    progressed = false;
    for (const d of order) {
      if (picked.length >= n) break;
      const next = buckets[d].shift();
      if (next) {
        picked.push(next);
        progressed = true;
      }
    }
  }
  return picked;
}

/**
 * A balanced diagnostic set: up to `perSection` questions per section spread
 * across difficulties, ordered section-by-section (Quant → Verbal → Data
 * Insights) with grouped questions (RC / Multi-Source) kept adjacent.
 */
export async function getDiagnosticQuestions(perSection = 5): Promise<QuestionWithGroup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('questions').select('*');
  if (error) throw new Error(error.message);
  const all = ((data ?? []) as unknown as QuestionRow[]).map(mapQuestion);

  const groupIds = [...new Set(all.map((q) => q.groupId).filter(Boolean))] as string[];
  const groupsById: Record<string, QuestionGroup> = {};
  if (groupIds.length) {
    const { data: gdata, error: gerr } = await supabase
      .from('question_groups')
      .select('*')
      .in('id', groupIds);
    if (gerr) throw new Error(gerr.message);
    for (const g of ((gdata ?? []) as unknown as GroupRow[]).map(mapGroup)) groupsById[g.id] = g;
  }

  const sections: Section[] = ['quant', 'verbal', 'data_insights'];
  const out: QuestionWithGroup[] = [];
  for (const section of sections) {
    const picked = pickSpread(
      all.filter((q) => q.section === section),
      perSection,
    );
    picked.sort((a, b) => {
      const ga = a.groupId ?? a.id;
      const gb = b.groupId ?? b.id;
      if (ga === gb) return a.orderIndex - b.orderIndex;
      return ga < gb ? -1 : 1;
    });
    for (const q of picked) {
      out.push({ ...q, group: q.groupId ? (groupsById[q.groupId] ?? null) : null });
    }
  }
  return out;
}

export interface MockSectionSet {
  section: Section;
  questions: QuestionWithGroup[];
}

/**
 * Build a mock exam: for each configured section, draw `targetCount` questions
 * matching the difficulty preference (spread across difficulties when
 * "balanced"), keeping grouped questions (RC / Multi-Source) contiguous. Returns
 * one entry per section in canonical order; sections with no questions are
 * dropped.
 */
export async function getMockQuestions(config: MockConfig): Promise<MockSectionSet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('questions').select('*');
  if (error) throw new Error(error.message);
  const all = ((data ?? []) as unknown as QuestionRow[]).map(mapQuestion);

  const groupIds = [...new Set(all.map((q) => q.groupId).filter(Boolean))] as string[];
  const groupsById: Record<string, QuestionGroup> = {};
  if (groupIds.length) {
    const { data: gdata, error: gerr } = await supabase
      .from('question_groups')
      .select('*')
      .in('id', groupIds);
    if (gerr) throw new Error(gerr.message);
    for (const g of ((gdata ?? []) as unknown as GroupRow[]).map(mapGroup)) groupsById[g.id] = g;
  }

  const out: MockSectionSet[] = [];
  for (const section of config.sections) {
    const pool = all.filter((q) => q.section === section);
    // For a specific difficulty, narrow the pool but fall back to the whole
    // section if that would leave too little to fill the exam.
    const narrowed =
      config.difficulty === 'balanced' ? pool : pool.filter((q) => q.difficulty === config.difficulty);
    const source = narrowed.length >= 1 ? narrowed : pool;
    const picked = pickSpread(source, targetCount(section, config.length));
    if (picked.length === 0) continue;
    out.push({ section, questions: arrangeUnits(picked, groupsById) });
  }
  return out;
}

export async function getSectionCounts(): Promise<Record<Section, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('questions').select('section');
  if (error) throw new Error(error.message);
  const counts = { quant: 0, verbal: 0, data_insights: 0 } as Record<Section, number>;
  for (const row of (data ?? []) as { section: Section }[]) counts[row.section] += 1;
  return counts;
}

export async function getLearnChapters(section?: Section): Promise<LearnChapter[]> {
  const supabase = await createClient();
  let query = supabase
    .from('learn_chapters')
    .select('*')
    .order('order_index', { ascending: true });
  if (section) query = query.eq('section', section);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ChapterRow[]).map(mapChapter);
}

export async function getLessonsByChapter(chapterId: string): Promise<LearnLesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('learn_lessons')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('order_index', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as LessonRow[]).map(mapLesson);
}

export async function getLesson(lessonId: string): Promise<LearnLesson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('learn_lessons')
    .select('*')
    .eq('id', lessonId)
    .single();
  if (error) return null;
  return mapLesson(data as unknown as LessonRow);
}

export async function getLessonExercises(exerciseIds: string[]): Promise<QuestionWithGroup[]> {
  if (exerciseIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from('questions').select('*').in('id', exerciseIds);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as QuestionRow[]).map((r) => ({ ...mapQuestion(r) }));
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
