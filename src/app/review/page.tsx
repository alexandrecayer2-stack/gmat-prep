import Link from 'next/link';

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Review</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        A searchable history of your past attempts and mock sessions — filter by section, type,
        difficulty, and correctness, and redo missed questions — is coming in a later phase. Your
        attempts are already being recorded as you practice.
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
