import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/utils';

/** Markdown with GitHub tables, math ($...$ and $$...$$) rendered via KaTeX. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose-gmat', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
