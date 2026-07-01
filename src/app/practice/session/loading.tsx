// Shown while the session's questions are fetched on the server — mirrors the
// runner's layout so navigation feels instant instead of blank.
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6" aria-hidden="true">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="mb-5 h-1.5 w-full animate-pulse rounded-full bg-muted" />
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-11 w-full animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
