import ReactMarkdown, { type Components } from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { isValidElement, type ReactNode } from 'react';
import { AlertTriangle, Compass, Lightbulb, Target, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type CalloutKind = 'example' | 'trap' | 'strategy' | 'shortcut' | 'rule';

const CALLOUT_STYLES: Record<CalloutKind, { Icon: LucideIcon; box: string; accent: string }> = {
  example: { Icon: Lightbulb, box: 'border-primary/20 bg-primary/5', accent: 'text-primary' },
  trap: {
    Icon: AlertTriangle,
    box: 'border-warning/30 bg-warning/10',
    accent: 'text-warning',
  },
  strategy: {
    Icon: Target,
    box: 'border-emerald-500/30 bg-emerald-500/10',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  shortcut: {
    Icon: Zap,
    box: 'border-violet-500/30 bg-violet-500/10',
    accent: 'text-violet-600 dark:text-violet-400',
  },
  rule: {
    Icon: Compass,
    box: 'border-info/30 bg-info/10',
    accent: 'text-info',
  },
};

// A bold run-in at the very start of a paragraph (e.g. "**Example.** …") is
// promoted to a visual callout when it names a known teaching block. Other bold
// lead-ins (definitions like "**Rectangle.**") are deliberately left as prose.
function classifyLead(text: string): CalloutKind | null {
  const norm = text.trim().replace(/[.:]+\s*$/, '').toLowerCase();
  if (norm === 'example') return 'example';
  if (norm.includes('trap')) return 'trap'; // Trap, Classic trap, Example trap
  if (norm === 'strategy') return 'strategy';
  if (norm === 'shortcut') return 'shortcut';
  if (norm === 'rule of thumb') return 'rule';
  return null;
}

function toText(node: ReactNode): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (isValidElement(node)) return toText((node.props as { children?: ReactNode }).children);
  return '';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const components: Components = {
  p({ children }) {
    const arr = Array.isArray(children) ? children : [children];
    const first = arr[0];
    if (isValidElement(first) && first.type === 'strong') {
      const kind = classifyLead(toText(first));
      if (kind) {
        const { Icon, box, accent } = CALLOUT_STYLES[kind];
        const label = toText(first).replace(/[.:]+\s*$/, '');
        const body = arr.slice(1);
        // Drop the separator/whitespace left where the bold label was.
        if (typeof body[0] === 'string') body[0] = body[0].replace(/^[\s.:—-]+/, '');
        return (
          <div className={cn('my-4 flex gap-3 rounded-xl border px-4 py-3', box)}>
            <Icon className={cn('mt-0.5 size-4 shrink-0', accent)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <span className={cn('mb-0.5 block text-xs font-semibold', accent)}>{label}</span>
              <div>{body}</div>
            </div>
          </div>
        );
      }
    }
    return <p>{children}</p>;
  },
  h2({ children }) {
    const id = slugify(toText(children));
    return (
      <h2 id={id}>
        <a href={`#${id}`} className="heading-anchor" aria-label="Link to this section">
          #
        </a>
        {children}
      </h2>
    );
  },
};

/** Markdown with GitHub tables, math ($...$ and $$...$$) rendered via KaTeX. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose-gmat', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

// Unwrap the block <p> so math/markdown renders inline (no paragraph break),
// suitable for short strings like answer choices.
const inlineComponents: Components = { p: ({ children }) => <>{children}</> };

/**
 * Inline markdown for short strings (answer choices, option labels): renders
 * KaTeX math and GFM without wrapping the content in a block-level paragraph.
 */
export function InlineMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={inlineComponents}
    >
      {children}
    </ReactMarkdown>
  );
}
