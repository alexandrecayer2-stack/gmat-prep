import type {
  Assets,
  Choice,
  CorrectAnswer,
  Difficulty,
  LearnArticle,
  LearnChapter,
  LearnLesson,
  LessonProgress,
  Question,
  QuestionGroup,
  QuestionType,
  Section,
} from '@/lib/domain/types';

// Database row shapes (snake_case) -> domain entities (camelCase).

export interface QuestionRow {
  id: string;
  group_id: string | null;
  section: Section;
  type: QuestionType;
  difficulty: Difficulty;
  topic: string;
  stem: string;
  passage_or_stimulus: string | null;
  assets: Assets | null;
  choices: Choice[] | null;
  correct_answer: CorrectAnswer;
  explanation: string;
  source_note: string | null;
  estimated_time_seconds: number;
  order_index: number;
}

export interface GroupRow {
  id: string;
  section: Section;
  title: string | null;
  passage: string | null;
  sources: { title: string; content: string }[] | null;
  assets: Assets | null;
}

export interface LearnRow {
  id: string;
  section: Section;
  topic: string;
  title: string;
  body: string;
  order_index: number;
}

export function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    groupId: row.group_id,
    section: row.section,
    type: row.type,
    difficulty: row.difficulty,
    topic: row.topic,
    stem: row.stem,
    passageOrStimulus: row.passage_or_stimulus,
    assets: row.assets,
    choices: row.choices,
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    sourceNote: row.source_note,
    estimatedTimeSeconds: row.estimated_time_seconds,
    orderIndex: row.order_index,
  };
}

export function mapGroup(row: GroupRow): QuestionGroup {
  return {
    id: row.id,
    section: row.section,
    title: row.title,
    passage: row.passage,
    sources: row.sources,
    assets: row.assets,
  };
}

export function mapLearnArticle(row: LearnRow): LearnArticle {
  return {
    id: row.id,
    section: row.section,
    topic: row.topic,
    title: row.title,
    body: row.body,
    orderIndex: row.order_index,
  };
}

export interface ChapterRow {
  id: string;
  section: Section;
  title: string;
  description: string | null;
  order_index: number;
}

export interface LessonRow {
  id: string;
  chapter_id: string;
  title: string;
  body: string;
  order_index: number;
  exercise_ids: string[];
}

export interface LessonProgressRow {
  user_id: string;
  lesson_id: string;
  passed_exercise_ids: string[];
  updated_at: string;
}

export function mapChapter(row: ChapterRow): LearnChapter {
  return {
    id: row.id,
    section: row.section,
    title: row.title,
    description: row.description,
    orderIndex: row.order_index,
  };
}

export function mapLesson(row: LessonRow): LearnLesson {
  return {
    id: row.id,
    chapterId: row.chapter_id,
    title: row.title,
    body: row.body,
    orderIndex: row.order_index,
    exerciseIds: row.exercise_ids ?? [],
  };
}

export function mapLessonProgress(row: LessonProgressRow): LessonProgress {
  return {
    lessonId: row.lesson_id,
    passedExerciseIds: row.passed_exercise_ids ?? [],
  };
}
