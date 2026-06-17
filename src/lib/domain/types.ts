// Core domain types for GMAT Prep. These mirror the GMAT Focus Edition taxonomy
// and the `questions` / `question_groups` jsonb shapes. App code uses camelCase;
// the data layer maps to/from the snake_case database columns.

export type Section = 'quant' | 'verbal' | 'data_insights';

export type QuestionType =
  | 'problem_solving'
  | 'critical_reasoning'
  | 'reading_comprehension'
  | 'data_sufficiency'
  | 'graphics_interpretation'
  | 'table_analysis'
  | 'two_part_analysis'
  | 'multi_source_reasoning';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type AttemptContext = 'practice' | 'mock';

// How a question is answered + rendered. The runner keys off this, not the type,
// so Multi-Source Reasoning can mix single-answer and dichotomous questions.
export type AnswerFormat = 'single' | 'two_part' | 'dropdowns' | 'dichotomous';

export interface Choice {
  key: string;
  text: string;
}

// ---------- Assets (DI charts / tables / dropdown blanks) ----------

export interface TableColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

export interface TableAsset {
  columns: TableColumn[];
  rows: Record<string, string | number>[];
  sortable?: boolean;
  caption?: string;
}

export type ChartType = 'bar' | 'line' | 'scatter';

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

export interface ChartAsset {
  type: ChartType;
  data: Record<string, string | number>[];
  xKey: string;
  series: ChartSeries[];
  xLabel?: string;
  yLabel?: string;
  title?: string;
}

export interface DropdownOption {
  value: string;
  label?: string;
}

// One fill-in-the-blank dropdown (Graphics Interpretation sentences).
export interface DropdownBlank {
  key: string;
  before?: string;
  after?: string;
  label?: string;
  options: DropdownOption[];
}

// Two-Part Analysis: two columns (the "parts"); the row options live in `choices`.
export interface TwoPartConfig {
  columns: { key: string; label: string }[];
}

// Table Analysis statements: each statement gets a two-option toggle.
export interface DichotomousConfig {
  labels: [string, string];
  prompt?: string;
}

export interface Assets {
  table?: TableAsset;
  chart?: ChartAsset;
  dropdowns?: DropdownBlank[];
  twoPart?: TwoPartConfig;
  dichotomous?: DichotomousConfig;
}

// ---------- Answers ----------

export type CorrectAnswer =
  | { format: 'single'; value: string }
  | { format: 'two_part'; value: Record<string, string> }
  | { format: 'dropdowns'; value: Record<string, string> }
  | { format: 'dichotomous'; value: Record<string, string> };

export type SelectedAnswer =
  | { format: 'single'; value: string | null }
  | { format: 'two_part'; value: Record<string, string> }
  | { format: 'dropdowns'; value: Record<string, string> }
  | { format: 'dichotomous'; value: Record<string, string> };

// ---------- Content entities ----------

export interface QuestionGroup {
  id: string;
  section: Section;
  title?: string | null;
  passage?: string | null;
  sources?: { title: string; content: string }[] | null;
  assets?: Assets | null;
}

export interface Question {
  id: string;
  groupId?: string | null;
  section: Section;
  type: QuestionType;
  difficulty: Difficulty;
  topic: string;
  stem: string;
  passageOrStimulus?: string | null;
  assets?: Assets | null;
  choices?: Choice[] | null;
  correctAnswer: CorrectAnswer;
  explanation: string;
  sourceNote?: string | null;
  estimatedTimeSeconds: number;
  orderIndex: number;
}

// A question joined with its group (if any), as the runner consumes it.
export interface QuestionWithGroup extends Question {
  group?: QuestionGroup | null;
}

export interface LearnArticle {
  id: string;
  section: Section;
  topic: string;
  title: string;
  body: string;
  orderIndex: number;
}

export interface LearnChapter {
  id: string;
  section: Section;
  title: string;
  description?: string | null;
  orderIndex: number;
}

export interface LearnLesson {
  id: string;
  chapterId: string;
  title: string;
  body: string;
  orderIndex: number;
  exerciseIds: string[];
}

export interface LessonProgress {
  lessonId: string;
  passedExerciseIds: string[];
}

// ---------- User data ----------

export interface Attempt {
  id: string;
  userId: string;
  questionId: string;
  mockSessionId?: string | null;
  selectedAnswer: SelectedAnswer;
  isCorrect: boolean;
  timeSpentSeconds: number;
  context: AttemptContext;
  createdAt: string;
}
