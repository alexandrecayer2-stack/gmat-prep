import Link from 'next/link';
import { getPracticeQuestions, getQuestionsByIds } from '@/lib/data/content';
import { PracticeRunner } from '@/components/practice/practice-runner';
import { SECTIONS, SECTION_TYPES } from '@/lib/domain/constants';
import type { Difficulty, QuestionType, Section } from '@/lib/domain/types';

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; types?: string; difficulty?: string; count?: string; ids?: string; topic?: string }>;
}) {
  const sp = await searchParams;

  // "Redo" mode: an explicit list of question ids (e.g. from Review). Takes
  // precedence over the section/type/difficulty filters.
  if (sp.ids) {
    const ids = sp.ids.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 100);
    const redo = await getQuestionsByIds(ids);
    if (redo.length === 0) return <EmptyState />;
    return <PracticeRunner questions={redo} />;
  }

  const section = SECTIONS.includes(sp.section as Section) ? (sp.section as Section) : undefined;
  const types = sp.types
    ? (sp.types
        .split(',')
        .filter((t) => section && SECTION_TYPES[section].includes(t as QuestionType)) as QuestionType[])
    : undefined;
  const difficulty =
    sp.difficulty && ['easy', 'medium', 'hard'].includes(sp.difficulty)
      ? (sp.difficulty as Difficulty)
      : undefined;
  const topic = sp.topic?.trim() || undefined;
  const parsedCount = Number(sp.count);
  const count = Number.isFinite(parsedCount) && parsedCount > 0 ? Math.min(parsedCount, 100) : 10;

  const questions = await getPracticeQuestions({ section, types, difficulty, topic, count });

  if (questions.length === 0) return <EmptyState />;

  return <PracticeRunner questions={questions} />;
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-lg font-semibold">No questions match those filters</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Try a different section, question type, or difficulty.
      </p>
      <Link
        href="/practice"
        className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Back to setup
      </Link>
    </div>
  );
}
