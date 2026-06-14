import Link from 'next/link';

export default function MockPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Mock Exam</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Configurable, timed mock exams — choose sections and difficulty mix, 45 minutes per section
        like the real test, with an estimated section score (60–90) and total (205–805) at the end —
        are coming in a later phase. For now, build skills in Practice.
      </p>
      <Link
        href="/practice"
        className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Go to Practice
      </Link>
    </div>
  );
}
