import Link from 'next/link';
import { getMockQuestions } from '@/lib/data/content';
import { MockRunner } from '@/components/mock/mock-runner';
import { parseMockConfig } from '@/lib/domain/mock';

export const metadata = {
  title: 'Mock Exam in progress — GMAT Prep',
};

export default async function MockSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ sections?: string; length?: string; difficulty?: string; timed?: string }>;
}) {
  const sp = await searchParams;
  const config = parseMockConfig(sp);
  const sections = await getMockQuestions(config);

  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-lg font-semibold">No questions available for that configuration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try different sections or a different difficulty.
        </p>
        <Link
          href="/mock"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back to setup
        </Link>
      </div>
    );
  }

  return <MockRunner sections={sections} config={config} />;
}
