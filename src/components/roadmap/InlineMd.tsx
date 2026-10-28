import { parseInlineMd } from '@/lib/domain/inline-md';

/** Renders the tiny inline-markdown subset used by roadmap item text. */
export function InlineMd({ text }: { text: string }) {
  return (
    <>
      {parseInlineMd(text).map((seg, i) => {
        switch (seg.kind) {
          case 'code':
            return <code key={i} className="rounded bg-surface-raised px-1 font-mono text-[0.9em]">{seg.text}</code>;
          case 'bold':
            return <strong key={i} className="font-semibold text-text-primary">{seg.text}</strong>;
          case 'italic':
            return <em key={i}>{seg.text}</em>;
          case 'link': {
            const external = /^https?:\/\//.test(seg.href ?? '');
            return (
              <a
                key={i}
                href={seg.href}
                className="underline underline-offset-2 hover:text-text-primary"
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {seg.text}
              </a>
            );
          }
          default:
            return <span key={i}>{seg.text}</span>;
        }
      })}
    </>
  );
}
