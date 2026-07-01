export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10" aria-hidden="true">
      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="mx-auto size-12 animate-pulse rounded-full bg-muted" />
        <div className="mx-auto mt-4 h-6 w-56 animate-pulse rounded bg-muted" />
        <div className="mx-auto mt-3 h-4 w-full animate-pulse rounded bg-muted" />
        <div className="mx-auto mt-2 h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </div>
        <div className="mx-auto mt-6 h-11 w-40 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
