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
  // Cap the session at roughly this many questions (groups kept whole), so a
  // practice session is a finite set rather than the entire filtered bank.
  count?: number;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type QuestionQuery = ReturnType<ReturnType<ServerClient['from']>['select']>;

// PostgREST returns at most ~1000 rows for an unbounded select, so a plain
// `.select('*')` silently truncates the 1300+ question bank (Data Insights, which
// sorts last, was the casualty). Page through with explicit ranges so every
// matching row is fetched. `apply` lets callers add `.eq` filters per page.
async function fetchAllQuestions(
  supabase: ServerClient,
  apply?: (q: QuestionQuery) => QuestionQuery,
): Promise<QuestionRow[]> {
  const PAGE = 1000;
  const rows: QuestionRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from('questions').select('*').range(from, from + PAGE - 1);
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as unknown as QuestionRow[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

// Fetch the question_groups referenced by a set of questions, keyed by id.
async function fetchGroupsFor(
  supabase: ServerClient,
  questions: Question[],
): Promise<Record<string, QuestionGroup>> {
  const groupIds = [...new Set(questions.map((q) => q.groupId).filter(Boolean))] as string[];
  const groupsById: Record<string, QuestionGroup> = {};
  if (groupIds.length) {
    const { data, error } = await supabase.from('question_groups').select('*').in('id', groupIds);
    if (error) throw new Error(error.message);
    for (const g of ((data ?? []) as unknown as GroupRow[]).map(mapGroup)) groupsById[g.id] = g;
  }
  return groupsById;
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

// Take the first ~`count` questions while keeping RC/Multi-Source groups whole:
// once we've reached the target we stop, but never split a group mid-way.
function takeUnits(questions: QuestionWithGroup[], count: number): QuestionWithGroup[] {
  if (count <= 0 || questions.length <= count) return questions;
  const out: QuestionWithGroup[] = [];
  let i = 0;
  while (i < questions.length && out.length < count) {
    const gid = questions[i].groupId;
    if (!gid) {
      out.push(questions[i]);
      i += 1;
    } else {
      // Push the whole contiguous group, even if it slightly overshoots `count`.
      while (i < questions.length && questions[i].groupId === gid) {
        out.push(questions[i]);
        i += 1;
      }
    }
  }
  return out;
}

export async function getPracticeQuestions(filter: QuestionFilter): Promise<QuestionWithGroup[]> {
  const supabase = await createClient();

  const rows = await fetchAllQuestions(supabase, (q) => {
    let query = q;
    if (filter.section) query = query.eq('section', filter.section);
    if (filter.types && filter.types.length) query = query.in('type', filter.types);
    if (filter.difficulty) query = query.eq('difficulty', filter.difficulty);
    return query;
  });
  const questions = rows.map(mapQuestion);
  const groupsById = await fetchGroupsFor(supabase, questions);

  const arranged = arrangeUnits(questions, groupsById);
  return filter.count ? takeUnits(arranged, filter.count) : arranged;
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
  const all = (await fetchAllQuestions(supabase)).map(mapQuestion);
  const groupsById = await fetchGroupsFor(supabase, all);

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
  const all = (await fetchAllQuestions(supabase)).map(mapQuestion);
  const groupsById = await fetchGroupsFor(supabase, all);

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

/** Fetch specific questions by id (e.g. "redo missed" from Review), arranged like
 *  a practice session with groups kept contiguous. Missing ids are dropped. */
export async function getQuestionsByIds(ids: string[]): Promise<QuestionWithGroup[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const rows = await fetchAllQuestions(supabase, (q) => q.in('id', ids));
  const questions = rows.map(mapQuestion);
  const groupsById = await fetchGroupsFor(supabase, questions);
  return arrangeUnits(questions, groupsById);
}

export async function getSectionCounts(): Promise<Record<Section, number>> {
  const supabase = await createClient();
  // Server-side `count` per section — avoids pulling rows (and the 1000-row cap).
  const sections: Section[] = ['quant', 'verbal', 'data_insights'];
  const counts = { quant: 0, verbal: 0, data_insights: 0 } as Record<Section, number>;
  await Promise.all(
    sections.map(async (section) => {
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('section', section);
      if (error) throw new Error(error.message);
      counts[section] = count ?? 0;
    }),
  );
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
