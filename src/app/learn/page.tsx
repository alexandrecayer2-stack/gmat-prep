import Link from 'next/link';
import { getLearnArticles } from '@/lib/data/content';
import { Markdown } from '@/components/markdown';
import { SECTIONS, SECTION_LABELS } from '@/lib/domain/constants';

export default async function LearnPage() {
  const articles = await getLearnArticles();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Learn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          High-yield rules and shortcuts. Expand a card to read the rule, why it matters on the
          GMAT, and a quick worked example.
        </p>
      </header>

      {SECTIONS.map((s) => {
        const items = articles.filter((a) => a.section === s);
        if (items.length === 0) return null;
        return (
          <section key={s}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS[s]}
              </h2>
              <Link
                href={`/practice?section=${s}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                Practice {SECTION_LABELS[s]} →
              </Link>
            </div>
            <div className="space-y-2">
              {items.map((a) => (
                <details key={a.id} className="rounded-lg border border-border bg-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium">
                    <span>{a.title}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {a.topic}
                    </span>
                  </summary>
                  <div className="border-t border-border px-4 py-3 text-sm">
                    <Markdown>{a.body}</Markdown>
                    <Link
                      href={`/practice?section=${a.section}`}
                      className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
                    >
                      Practice this topic →
                    </Link>
                  </div>
                </details>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
