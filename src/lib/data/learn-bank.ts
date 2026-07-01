import { createClient } from '@/lib/supabase/server';
import {
  mapChapter,
  mapLearnArticle,
  mapLesson,
  type ChapterRow,
  type LearnRow,
  type LessonRow,
} from './mappers';
import type { LearnArticle, LearnChapter, LearnLesson } from '@/lib/domain/types';

// The whole Learn corpus (chapters + lessons + articles), for the offline cache.
// Served by /api/learn and stored client-side so lessons can be read offline.
export interface LearnBank {
  chapters: LearnChapter[];
  lessons: LearnLesson[];
  articles: LearnArticle[];
}

export async function getLearnBank(): Promise<LearnBank> {
  const supabase = await createClient();
  const [chapters, lessons, articles] = await Promise.all([
    supabase.from('learn_chapters').select('*').order('order_index', { ascending: true }),
    supabase.from('learn_lessons').select('*').order('order_index', { ascending: true }),
    supabase
      .from('learn_articles')
      .select('*')
      .order('section', { ascending: true })
      .order('order_index', { ascending: true }),
  ]);
  if (chapters.error) throw new Error(chapters.error.message);
  if (lessons.error) throw new Error(lessons.error.message);
  if (articles.error) throw new Error(articles.error.message);

  return {
    chapters: ((chapters.data ?? []) as unknown as ChapterRow[]).map(mapChapter),
    lessons: ((lessons.data ?? []) as unknown as LessonRow[]).map(mapLesson),
    articles: ((articles.data ?? []) as unknown as LearnRow[]).map(mapLearnArticle),
  };
}
