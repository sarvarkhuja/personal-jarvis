import { Skeleton } from '@/components/ui/skeleton';

export default function PlansLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-72" />
      </header>
      <Skeleton className="h-9 w-full" />
      <Skeleton className="aspect-[7/6] w-full" />
      <Skeleton className="h-32 w-full" />
    </main>
  );
}
