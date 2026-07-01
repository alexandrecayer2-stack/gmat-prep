export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10" aria-hidden="true">
      <div className="mb-8 h-9 w-28 animate-pulse rounded bg-muted" />
      <div className="mb-8 h-10 w-full animate-pulse rounded-lg bg-muted/60" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 h-5 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted/60" />
            <div className="mt-4 h-1.5 w-full animate-pulse rounded-full bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
