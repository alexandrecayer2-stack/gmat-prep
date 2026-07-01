import type {
  Difficulty,
  Question,
  QuestionGroup,
  QuestionType,
  QuestionWithGroup,
  Section,
} from './types';
import { targetCount, type MockConfig } from './mock';

// Pure question-selection logic, shared by the server data layer (content.ts)
// and the offline client so an offline session is assembled exactly like an
// online one. No Supabase / server imports here — this must be safe to bundle
// into the browser.

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Keep grouped questions (RC / Multi-Source) contiguous and ordered, treat each
// standalone question as its own unit, then shuffle the units for variety.
export function arrangeUnits(
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
export function takeUnits(questions: QuestionWithGroup[], count: number): QuestionWithGroup[] {
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

// Pick up to `n` items from a section, spread across difficulties.
export function pickSpread(items: Question[], n: number): Question[] {
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

// ---------- Offline-side composition ----------

// The whole question bank as shipped to the client by /api/bank.
export interface QuestionBank {
  questions: Question[];
  groups: QuestionGroup[];
}

export interface PracticeSelection {
  section?: Section;
  types?: QuestionType[];
  difficulty?: Difficulty;
  count?: number;
}

function groupsMap(bank: QuestionBank): Record<string, QuestionGroup> {
  const byId: Record<string, QuestionGroup> = {};
  for (const g of bank.groups) byId[g.id] = g;
  return byId;
}

// Client-side equivalent of getPracticeQuestions: filter the cached bank, then
// arrange and cap exactly like the server does.
export function selectPracticeQuestions(
  bank: QuestionBank,
  filter: PracticeSelection,
): QuestionWithGroup[] {
  let qs = bank.questions;
  if (filter.section) qs = qs.filter((q) => q.section === filter.section);
  if (filter.types && filter.types.length) {
    const set = new Set(filter.types);
    qs = qs.filter((q) => set.has(q.type));
  }
  if (filter.difficulty) qs = qs.filter((q) => q.difficulty === filter.difficulty);

  const arranged = arrangeUnits(qs, groupsMap(bank));
  return filter.count ? takeUnits(arranged, filter.count) : arranged;
}

// How many questions match a filter (for showing availability in the offline UI).
export function countMatching(bank: QuestionBank, filter: PracticeSelection): number {
  let qs = bank.questions;
  if (filter.section) qs = qs.filter((q) => q.section === filter.section);
  if (filter.types && filter.types.length) {
    const set = new Set(filter.types);
    qs = qs.filter((q) => set.has(q.type));
  }
  if (filter.difficulty) qs = qs.filter((q) => q.difficulty === filter.difficulty);
  return qs.length;
}

export interface MockSectionSet {
  section: Section;
  questions: QuestionWithGroup[];
}

// Client-side equivalent of getMockQuestions: for each configured section draw
// `targetCount` questions matching the difficulty preference (whole section when
// "balanced", or falling back to it if a difficulty filter leaves too few),
// keeping grouped questions contiguous. Mirrors the server exactly.
export function selectMockQuestions(bank: QuestionBank, config: MockConfig): MockSectionSet[] {
  const byId = groupsMap(bank);
  const out: MockSectionSet[] = [];
  for (const section of config.sections) {
    const pool = bank.questions.filter((q) => q.section === section);
    const narrowed =
      config.difficulty === 'balanced'
        ? pool
        : pool.filter((q) => q.difficulty === config.difficulty);
    const source = narrowed.length >= 1 ? narrowed : pool;
    const picked = pickSpread(source, targetCount(section, config.length));
    if (picked.length === 0) continue;
    out.push({ section, questions: arrangeUnits(picked, byId) });
  }
  return out;
}
