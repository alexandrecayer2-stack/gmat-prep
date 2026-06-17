import { getSectionCounts } from '@/lib/data/content';
import { MockSetup } from '@/components/mock/mock-setup';
import type { Section } from '@/lib/domain/types';

export const metadata = {
  title: 'Mock Exam — GMAT Prep',
};

const ZERO_COUNTS: Record<Section, number> = { quant: 0, verbal: 0, data_insights: 0 };

export default async function MockPage() {
  const counts = await getSectionCounts().catch(() => ZERO_COUNTS);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <MockSetup counts={counts} />
    </div>
  );
}
