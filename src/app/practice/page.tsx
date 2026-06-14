import { getSectionCounts } from '@/lib/data/content';
import { PracticeSetup } from '@/components/practice/practice-setup';
import { SECTIONS } from '@/lib/domain/constants';
import type { Section } from '@/lib/domain/types';

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const counts = await getSectionCounts();
  const sp = await searchParams;
  const initialSection = SECTIONS.includes(sp.section as Section)
    ? (sp.section as Section)
    : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PracticeSetup counts={counts} initialSection={initialSection} />
    </div>
  );
}
