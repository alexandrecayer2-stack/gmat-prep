import type { Section, QuestionType, Difficulty, Choice } from './types';

export const SECTIONS: Section[] = ['quant', 'verbal', 'data_insights'];

export const SECTION_LABELS: Record<Section, string> = {
  quant: 'Quantitative Reasoning',
  verbal: 'Verbal Reasoning',
  data_insights: 'Data Insights',
};

export const SECTION_SHORT: Record<Section, string> = {
  quant: 'Quant',
  verbal: 'Verbal',
  data_insights: 'Data Insights',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  problem_solving: 'Problem Solving',
  critical_reasoning: 'Critical Reasoning',
  reading_comprehension: 'Reading Comprehension',
  data_sufficiency: 'Data Sufficiency',
  graphics_interpretation: 'Graphics Interpretation',
  table_analysis: 'Table Analysis',
  two_part_analysis: 'Two-Part Analysis',
  multi_source_reasoning: 'Multi-Source Reasoning',
};

// Which question types belong to each section (drives the Practice selectors).
export const SECTION_TYPES: Record<Section, QuestionType[]> = {
  quant: ['problem_solving'],
  verbal: ['critical_reasoning', 'reading_comprehension'],
  data_insights: [
    'data_sufficiency',
    'graphics_interpretation',
    'table_analysis',
    'two_part_analysis',
    'multi_source_reasoning',
  ],
};

export const SECTION_FROM_TYPE: Record<QuestionType, Section> = {
  problem_solving: 'quant',
  critical_reasoning: 'verbal',
  reading_comprehension: 'verbal',
  data_sufficiency: 'data_insights',
  graphics_interpretation: 'data_insights',
  table_analysis: 'data_insights',
  two_part_analysis: 'data_insights',
  multi_source_reasoning: 'data_insights',
};

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

// Honest difficulty calibration (mirrors the spec).
export const DIFFICULTY_LEVEL: Record<Difficulty, string> = {
  easy: '~500 level',
  medium: '~600 level',
  hard: '~700+ level',
};

// Real GMAT Focus section parameters (used by Mock Exam + as reference).
export const SECTION_MINUTES: Record<Section, number> = {
  quant: 45,
  verbal: 45,
  data_insights: 45,
};

export const SECTION_QUESTION_COUNT: Record<Section, number> = {
  quant: 21,
  verbal: 23,
  data_insights: 20,
};

// The five canonical Data Sufficiency answer choices (identical on every DS item),
// so seed content does not have to repeat them.
export const DS_CHOICES: Choice[] = [
  {
    key: 'A',
    text: 'Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient.',
  },
  {
    key: 'B',
    text: 'Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient.',
  },
  {
    key: 'C',
    text: 'BOTH statements TOGETHER are sufficient, but NEITHER statement ALONE is sufficient.',
  },
  { key: 'D', text: 'EACH statement ALONE is sufficient.' },
  { key: 'E', text: 'Statements (1) and (2) TOGETHER are NOT sufficient.' },
];
