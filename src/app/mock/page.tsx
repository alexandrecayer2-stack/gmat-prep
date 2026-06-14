import { getSectionCounts } from '@/lib/data/content';
import { MockSetup } from '@/components/mock/mock-setup';

export const metadata = {
  title: 'Mock Exam — GMAT Prep',
};

export default async function MockPage() {
  const counts = await getSectionCounts();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <MockSetup counts={counts} />
    </div>
  );
}
