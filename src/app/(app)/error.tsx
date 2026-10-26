'use client';

import { Button } from '@/components/ui/button';

export default function PageError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-72 w-full max-w-[1600px] flex-col items-start gap-4 px-4 pb-8 pt-16 md:px-8 md:pt-8">
      <div role="alert" className="flex flex-col gap-2">
        <h1 className="font-heading text-xl font-medium text-text-primary">
          This page couldn’t load
        </h1>
        <p className="text-sm text-text-secondary">
          Try again to reload your data.
        </p>
      </div>
      <Button variant="outline" onClick={() => unstable_retry()}>
        Try again
      </Button>
    </main>
  );
}
