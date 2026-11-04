import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const plugins = [remarkGfm, remarkBreaks];

/**
 * Read-only rendering of a note body. Bodies are Markdown (GFM tables, fenced
 * code, task lists); raw HTML inside a body is dropped, never rendered.
 * Single newlines stay visible so notes written before Markdown keep their shape.
 */
export function NoteBody({ markdown, className }: { markdown: string; className?: string }) {
  return (
    <div className={cn('note-prose text-sm leading-relaxed text-text-primary', className)}>
      <ReactMarkdown
        remarkPlugins={plugins}
        skipHtml
        components={{
          table: ({ children }) => <div className="table-scroll"><table>{children}</table></div>,
          a: ({ href, children }) => {
            const external = /^https?:\/\//.test(href ?? '');
            return (
              <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
