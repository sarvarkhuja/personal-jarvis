import { LoaderCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageLoading({ embedded = false }: { embedded?: boolean }) {
  const Container = embedded ? 'div' : 'main';

  return (
    <Container
      className={cn(
        'flex w-full flex-col gap-6',
        embedded
          ? 'min-h-40 py-6'
          : 'mx-auto min-h-72 max-w-[1600px] px-4 pb-8 pt-16 md:px-8 md:pt-8',
      )}
    >
      <p
        role="status"
        className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-secondary"
      >
        <LoaderCircleIcon aria-hidden="true" className="size-4 motion-safe:animate-spin" />
        Loading page…
      </p>
    </Container>
  );
}
